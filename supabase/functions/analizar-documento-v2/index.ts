
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v2.2/mod.ts'

import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "analizar-documento-v2" up and running!`)

// --- Tipos y Interfaces ---
interface RequestBody {
  filePath: string
  documentType: string
  solicitud_id: string
}

// --- Lógica Principal ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { filePath, documentType, solicitud_id }: RequestBody = await req.json()
    if (!filePath || !documentType || !solicitud_id) {
      throw new Error('filePath, documentType y solicitud_id son requeridos.')
    }

    // 1. Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Crear una URL firmada y segura para el archivo
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('documentos-prestatarios')
      .createSignedUrl(filePath, 3600) // Válida por 1 hora

    if (urlError) throw urlError
    const signedUrl = urlData.signedUrl

    // 3. Obtener el contenido del archivo desde la URL firmada
    const fileResponse = await fetch(signedUrl)
    if (!fileResponse.ok) throw new Error(`Fallo al obtener el archivo: ${fileResponse.statusText}`)
    const fileBuffer = await fileResponse.arrayBuffer()
    
    // Safer Base64 conversion
    let binary = '';
    const bytes = new Uint8Array(fileBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64File = btoa(binary);
    const fileMimeType = fileResponse.headers.get('Content-Type') || 'application/octet-stream';

    // 4. Authenticate with Google using Service Account and get Access Token
    const credsJson = Deno.env.get('GOOGLE_CREDENTIALS');
    if (!credsJson) throw new Error('El secreto GOOGLE_CREDENTIALS no está configurado.');
    const creds = JSON.parse(credsJson);

    const iat = Math.floor(Date.now() / 1000); // Issued at time (now)
    const exp = iat + 3600; // Expiration time (1 hour from now)

    const jwt = await create({ alg: "RS256", typ: "JWT" }, {
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: creds.token_uri,
      iat: iat,
      exp: exp,
    }, creds.private_key);

    const tokenResponse = await fetch(creds.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Error obteniendo el token de autenticación de Google: ${tokenResponse.status} - ${errorBody}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 5. Call the Vertex AI API with the access token
    const modelName = 'gemini-1.5-flash-001'; // Use the current, active model
    // Note: Using the Vertex AI endpoint which is standard for service account auth.
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/us-central1/publishers/google/models/${modelName}:generateContent`;

    const prompt = getPromptForDocument(documentType);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: fileMimeType,
                data: base64File
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    };

    console.log('Paso 1: Llamando a la API de Gemini...');
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    });
    console.log('Paso 2: Respuesta de Gemini recibida.');

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Error en la API de Gemini: ${geminiResponse.status} ${geminiResponse.statusText} - ${errorBody}`);
    }

    const result = await geminiResponse.json();
    console.log('Paso 3: Respuesta JSON de Gemini parseada.');
    
    // 5. Extraer y procesar la respuesta de la IA
    // La respuesta de la API REST viene en una estructura diferente a la del SDK
    if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
      throw new Error('La respuesta de la IA no tiene la estructura esperada.');
    }
    const responseText = result.candidates[0].content.parts[0].text;
    console.log('Paso 4: Texto extraído de la respuesta de la IA.');

    // Extraer el bloque JSON de la respuesta de la IA
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('La respuesta de la IA no contiene un objeto JSON válido.')
    }
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
    const extractedData = JSON.parse(jsonString)
    console.log('Paso 5: JSON extraído y parseado desde el texto.');

    // 6. Guardar los datos extraídos en la tabla 'analisis_documentos'
    console.log('Paso 6: Intentando insertar en la base de datos...');
    const { error: dbError } = await supabaseAdmin
      .from('analisis_documentos')
      .insert({
        solicitud_id: solicitud_id,
        document_type: documentType,
        raw_data: extractedData,
        analysed_at: new Date(),
      })

    if (dbError) throw dbError
    console.log('Paso 7: Inserción en la base de datos exitosa.');

    // 7. Verificar si todos los documentos están completos y disparar la síntesis
    await checkAndTriggerSynthesis(supabaseAdmin, solicitud_id)

    // 8. Retornar éxito
    console.log('Paso 8: Retornando respuesta exitosa.');

  } catch (error) {
    console.error(`Error fatal en 'analizar-documento-v2': ${error.message}`)
    return new Response(JSON.stringify({ error: error.message, details: error.stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// --- Funciones de Soporte ---

// Diccionario de Prompts
function getPromptForDocument(documentType: string): string {
    const prompts = {
    ci_anverso: "Analiza la imagen del anverso de la cédula de identidad boliviana. Extrae la siguiente información: número de cédula, fecha de emisión y fecha de expiración. Devuelve los datos estrictamente en formato JSON con las claves 'numero_cedula', 'fecha_emision', y 'fecha_expiracion'. Si un campo no es visible, su valor debe ser null.",
    ci_reverso: "Analiza la imagen del reverso de la cédula de identidad boliviana. Extrae el nombre completo, fecha de nacimiento, domicilio y profesión u ocupación. Devuelve los datos estrictamente en formato JSON con las claves 'nombre_completo', 'fecha_nacimiento', 'domicilio', y 'profesion'.",
    factura_servicio: "Analiza la factura de servicio. Extrae el nombre del titular del servicio y la dirección. Devuelve los datos estrictamente en formato JSON con las claves 'nombre_titular' y 'direccion'.",
    extracto_tarjeta: "Analiza el extracto de tarjeta de crédito. Extrae los siguientes datos y devuélvelos en un único objeto JSON: nombre del banco emisor ('banco'), como 'BNB', 'BCP', 'Mercantil Santa Cruz', e ignora las marcas de la tarjeta como 'VISA' o 'Mastercard', el cual a menudo se puede inferir del logo o de la dirección web; nombre del titular ('nombre_titular'); límite de crédito ('limite_credito'); deuda total a la fecha de cierre ('deuda_total'); pago mínimo requerido ('pago_minimo'); tasa de interés anual efectiva ('tasa_interes_anual'); saldo del período anterior ('saldo_anterior'); total de pagos realizados en el período ('pagos_realizados'); el monto de intereses por mora o punitorios ('intereses_punitorios'); y el valor numérico del cargo por 'mantenimiento_cuenta'. Todos los valores numéricos deben ser números sin símbolos de moneda. Si un campo no es visible, su valor debe ser null.",
    selfie_ci: "Analiza la imagen de una selfie que contiene el anverso de una cédula de identidad. Extrae únicamente el número de cédula visible. Adicionalmente, compara la cara de la persona en la selfie con la cara de la foto en la cédula y responde true o false si parecen ser la misma persona. Devuelve los datos estrictamente en formato JSON con las claves `numero_cedula_selfie` y `verificacion_facial`. Si el número de cédula no es claramente legible, su valor debe ser null. No inventes ni infieras ningún otro dato.",
    boleta_pago: "Analiza la boleta de pago. Extrae el salario líquido pagable ('salario_neto'), el nombre completo del empleador ('nombre_empleador'), el mes al que corresponde el pago ('mes_pago'), y, si están detallados, el total ganado ('total_ganado'), el total de descuentos de ley ('total_descuentos'), y el total de ingresos variables como bonos o comisiones ('ingresos_variables'). Todos los valores deben ser números sin símbolos. Si un campo no es visible, su valor debe ser null.",
    certificado_gestora: "Analiza el certificado de la Gestora Pública (o AFP). Extrae el nombre completo del titular ('nombre_titular'), el total de aportes acumulados ('total_aportes'), y la fecha de emisión del certificado ('fecha_emision_certificado'). El total de aportes debe ser un número sin símbolos. Si un campo no es visible, su valor debe ser null.",
    extracto_bancario_m1: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    extracto_bancario_m2: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    extracto_bancario_m3: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    nit: "Analiza el certificado de NIT. Extrae el nombre o razón social y el número de NIT. Devuelve los datos en formato JSON con las claves 'razon_social' y 'numero_nit'.",
    boleta_jubilacion: "Analiza la boleta de pago de jubilación. Extrae el líquido pagable ('ingreso_neto_jubilacion'), el nombre completo del titular ('nombre_titular'), y el ente gestor que emite el pago ('ente_gestor'), por ejemplo, 'SENASIR'. Si un campo no es visible, su valor debe ser null.",
  };
  return prompts[documentType] || "Analiza el documento y extrae la información más relevante en formato JSON.";
}

// Verificación de completitud y disparo de la síntesis
async function checkAndTriggerSynthesis(supabaseAdmin: any, solicitud_id: string) {
  console.log(`Verificando completitud para solicitud_id: ${solicitud_id}`)

  const { data: solicitudData, error: solicitudError } = await supabaseAdmin
    .from('solicitudes')
    .select('situacion_laboral')
    .eq('id', solicitud_id)
    .single()

  if (solicitudError || !solicitudData) {
    console.error('No se pudo obtener la solicitud para verificar completitud:', solicitudError)
    return
  }

  const { situacion_laboral } = solicitudData
  const commonDocs = ['ci_anverso', 'ci_reverso', 'factura_servicio', 'extracto_tarjeta', 'selfie_ci']
  const requiredDocs = {
    dependiente: [...commonDocs, 'boleta_pago', 'certificado_gestora'],
    independiente: [...commonDocs, 'extracto_bancario_m1', 'extracto_bancario_m2', 'extracto_bancario_m3', 'nit'],
    jubilado: [...commonDocs, 'boleta_jubilacion'],
  }[situacion_laboral] || commonDocs

  const { data: analyzedDocs, error: analyzedDocsError } = await supabaseAdmin
    .from('analisis_documentos')
    .select('document_type')
    .eq('solicitud_id', solicitud_id)

  if (analyzedDocsError) {
    console.error('No se pudieron obtener los documentos analizados:', analyzedDocsError)
    return
  }

  const uploadedDocTypes = new Set(analyzedDocs.map(doc => doc.document_type))
  const isComplete = requiredDocs.every(docType => uploadedDocTypes.has(docType))

  console.log(`Completitud: ${isComplete}. Requeridos: ${requiredDocs.join(', ')}. Subidos: ${[...uploadedDocTypes].join(', ')}`)

  if (isComplete) {
    console.log(`¡Completo! Disparando función de síntesis para ${solicitud_id}`)
    const { error: invokeError } = await supabaseAdmin.functions.invoke('sintetizar-perfil-riesgo', {
      body: { solicitud_id },
    })
    if (invokeError) {
      console.error('Error al invocar la función de síntesis:', invokeError)
    }
  }
}
