
import { createClient } from '@supabase/supabase-js';

// --- Helper para CORS ---
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // En producción, sería mejor restringirlo a tu dominio
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// --- Lógica Principal de la API en Vercel ---
export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filePath, documentType, solicitud_id } = req.body;
    if (!filePath || !documentType || !solicitud_id) {
      return res.status(400).json({ error: 'filePath, documentType y solicitud_id son requeridos.' });
    }

    // 1. Crear cliente de Supabase con rol de servicio
    // Las variables de entorno se leen con process.env en Vercel/Node.js
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Crear una URL firmada y segura para el archivo
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('documentos-prestatarios')
      .createSignedUrl(filePath, 3600); // Válida por 1 hora

    if (urlError) throw urlError;
    const signedUrl = urlData.signedUrl;

    // 3. Obtener el contenido del archivo desde la URL firmada
    const fileResponse = await fetch(signedUrl);
    if (!fileResponse.ok) throw new Error(`Fallo al obtener el archivo: ${fileResponse.statusText}`);
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Conversión a Base64 en Node.js
    const base64File = Buffer.from(fileBuffer).toString('base64');
    const fileMimeType = fileResponse.headers.get('Content-Type') || 'application/octet-stream';

    // 4. Llamar directamente a la API REST de Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada.');

    // Usamos el modelo más moderno, ya que en Vercel no deberíamos tener el problema de la API v1beta
    const modelName = 'gemini-1.5-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    
    const prompt = getPromptForDocument(documentType);

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: fileMimeType, data: base64File } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        response_mime_type: "application/json",
      }
    };

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      throw new Error(`Error en la API de Gemini: ${geminiResponse.status} ${geminiResponse.statusText} - ${errorBody}`);
    }

    const result = await geminiResponse.json();
    
    // 5. Extraer y procesar la respuesta de la IA
    if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
      const errorDetails = JSON.stringify(result, null, 2);
      console.error("Respuesta inesperada de la IA:", errorDetails);
      throw new Error('La respuesta de la IA no tiene la estructura esperada.');
    }
    const responseText = result.candidates[0].content.parts[0].text;

    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('La respuesta de la IA no contiene un objeto JSON válido.');
    }
    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    const extractedData = JSON.parse(jsonString);

    // 6. Guardar los datos extraídos en la tabla 'analisis_documentos'
    const { error: dbError } = await supabaseAdmin
      .from('analisis_documentos')
      .insert({
        solicitud_id: solicitud_id,
        document_type: documentType,
        raw_data: extractedData,
        analysed_at: new Date(),
      });

    if (dbError) throw dbError;

    // 7. Verificar si todos los documentos están completos y disparar la síntesis
    await checkAndTriggerSynthesis(supabaseAdmin, solicitud_id);

    // 8. Retornar éxito
    return res.status(200).json({ success: true, data: extractedData });

  } catch (error) {
    console.error(`Error fatal en 'api/analizar-documento': ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}

// --- Funciones de Soporte (movidas aquí) ---

function getPromptForDocument(documentType) {
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

async function checkAndTriggerSynthesis(supabaseAdmin, solicitud_id) {
  console.log(`Verificando completitud para solicitud_id: ${solicitud_id}`);

  const { data: solicitudData, error: solicitudError } = await supabaseAdmin
    .from('solicitudes')
    .select('situacion_laboral')
    .eq('id', solicitud_id)
    .single();

  if (solicitudError || !solicitudData) {
    console.error('No se pudo obtener la solicitud para verificar completitud:', solicitudError);
    return;
  }

  const { situacion_laboral } = solicitudData;
  const commonDocs = ['ci_anverso', 'ci_reverso', 'factura_servicio', 'extracto_tarjeta', 'selfie_ci'];
  const requiredDocs = {
    dependiente: [...commonDocs, 'boleta_pago', 'certificado_gestora'],
    independiente: [...commonDocs, 'extracto_bancario_m1', 'extracto_bancario_m2', 'extracto_bancario_m3', 'nit'],
    jubilado: [...commonDocs, 'boleta_jubilacion'],
  }[situacion_laboral] || commonDocs;

  const { data: analyzedDocs, error: analyzedDocsError } = await supabaseAdmin
    .from('analisis_documentos')
    .select('document_type')
    .eq('solicitud_id', solicitud_id);

  if (analyzedDocsError) {
    console.error('No se pudieron obtener los documentos analizados:', analyzedDocsError);
    return;
  }

  const uploadedDocTypes = new Set(analyzedDocs.map(doc => doc.document_type));
  const isComplete = requiredDocs.every(docType => uploadedDocTypes.has(docType));

  console.log(`Completitud: ${isComplete}. Requeridos: ${requiredDocs.join(', ')}. Subidos: ${[...uploadedDocTypes].join(', ')}`);

  if (isComplete) {
    console.log(`¡Completo! Disparando función de síntesis para ${solicitud_id}`);
    // La invocación a otra función de Supabase debería funcionar sin problemas desde Vercel
    const { error: invokeError } = await supabaseAdmin.functions.invoke('sintetizar-perfil-riesgo', {
      body: { solicitud_id },
    });
    if (invokeError) {
      console.error('Error al invocar la función de síntesis:', invokeError);
    }
  }
}
