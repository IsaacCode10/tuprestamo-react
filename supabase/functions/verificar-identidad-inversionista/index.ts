import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function verificar-identidad-inversionista starting up...`)

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Se espera que el trigger de la DB envíe el registro del documento insertado
    const { record: document } = await req.json()
    const { user_id, url_archivo, id: document_id } = document

    if (!user_id || !url_archivo) {
      throw new Error('user_id y url_archivo son requeridos en el payload.')
    }

    console.log(`Iniciando verificación de identidad para user_id: ${user_id} y documento: ${document_id}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Construir la URL pública del documento
    const BUCKET_NAME = 'documentos-inversionistas'; // Asumimos este nombre de bucket
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(url_archivo);

    if (!urlData?.publicUrl) {
      throw new Error(`No se pudo obtener la URL pública para el archivo: ${url_archivo}`);
    }
    const publicUrl = urlData.publicUrl;
    console.log(`URL pública del documento obtenida: ${publicUrl}`);

    // 2. Obtener los datos del perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nombre_completo, numero_ci') // Asumimos que la columna se llama 'numero_ci'
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`No se pudo encontrar el perfil para el user_id: ${user_id}. Error: ${profileError?.message}`);
    }

    console.log(`Perfil de usuario obtenido:`, profile);

    // 3. Llamar a la IA (Gemini) para extraer el texto del CI.
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `\nEres un sistema experto de extracción de datos (OCR) especializado en Cédulas de Identidad de Bolivia. Tu tarea es analizar la imagen proporcionada y extraer con la máxima precisión el nombre completo y el número de la cédula de identidad.\n\n**Instrucciones estrictas:**\n1.  **Extrae únicamente los siguientes campos:**\n    *   `nombre_completo`: El nombre completo tal como aparece en el documento.\n    *   `numero_ci`: El número de la cédula, incluyendo cualquier extensión si la tuviera (ej. \'1234567-1A\').\n2.  **Formato de Salida Obligatorio:** Devuelve SIEMPRE un objeto JSON. No incluyas texto, explicaciones ni los \\\`\\\`\\\`json\\\`\\\`\\\` markers. Solo el JSON puro.\n3.  **Regla de Oro - No Inventar:** Si un campo no es claramente visible o no se puede determinar con alta confianza, el valor de esa clave en el JSON debe ser `null`. NUNCA inventes o adivines información.\n4.  **Manejo de Errores:** Si la imagen es completamente ilegible o no parece ser una Cédula de Identidad, devuelve el siguiente JSON: `{\"error\": \"Imagen ilegible o documento no válido\"}`.\n\n**Ejemplos:**\n\n*   **Ejemplo 1 (Caso Ideal):**\n    *   *Si la imagen muestra claramente \"Nombre: ANA SOFIA PEREZ LOPEZ\" y \"C.I.: 1234567 LP\"*\n    *   **Tu salida debe ser:** `{\"nombre_completo\": \"ANA SOFIA PEREZ LOPEZ\", \"numero_ci\": \"1234567\"}`\n\n*   **Ejemplo 2 (Campo Faltante):**\n    *   *Si el nombre es visible pero el número de CI está tapado o borroso*\n    *   **Tu salida debe ser:** `{\"nombre_completo\": \"ANA SOFIA PEREZ LOPEZ\", \"numero_ci\": null}`\n\nAhora, procesa la imagen que te he proporcionado.\n`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: await fetch(publicUrl).then(res => res.arrayBuffer()).then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)))) } }
        ]
      }]
    };

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Error en la llamada a Gemini API: ${geminiResponse.statusText}`);
    }

    const responseData = await geminiResponse.json();
    const aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, '').trim();

    if (!aiText) {
      throw new Error('La respuesta de la IA no contiene texto extraíble.');
    }

    const aiData = JSON.parse(aiText);
    console.log('Datos extraídos por la IA:', aiData);

    // 4. Comparar el texto extraído por la IA con los datos del perfil.
    // Normalizamos los strings para una comparación más robusta.
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, ' ').trim() ?? '';
    const ciNormalize = (str) => str?.replace(/\D/g, '') ?? ''; // Solo dígitos para el CI

    const profileName = normalize(profile.nombre_completo);
    const aiName = normalize(aiData.nombre_completo);
    const profileCi = ciNormalize(profile.numero_ci);
    const aiCi = ciNormalize(aiData.numero_ci);

    let finalStatus = 'requiere_revision_manual';
    // 5. Decidir el estado final
    if (aiData.error) {
      console.log(`Error de IA para user_id: ${user_id}. Razón: ${aiData.error}`);
      finalStatus = 'requiere_revision_manual';
    } else if (profileName === aiName && profileCi === aiCi) {
      finalStatus = 'verificado';
      console.log(`Coincidencia exitosa para user_id: ${user_id}. Estado: verificado.`);
    } else {
      console.log(`No hubo coincidencia para user_id: ${user_id}. Perfil: [${profileName}, ${profileCi}], IA: [${aiName}, ${aiCi}]. Estado: requiere_revision_manual.`);
    }

    // 6. Actualizar el perfil del usuario con el nuevo estado
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ estado_verificacion: finalStatus })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Error al actualizar el perfil: ${updateError.message}`);
    }

    console.log(`Perfil de ${user_id} actualizado a ${finalStatus}.`);

    return new Response(JSON.stringify({
      message: `Verificación completada para el usuario ${user_id}.`,
      status: finalStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error en verificar-identidad-inversionista:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
