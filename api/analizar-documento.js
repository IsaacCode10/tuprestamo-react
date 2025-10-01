
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients with environment variables
// IMPORTANT: These variables must be set in your Vercel project settings
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Prompts Dictionary ---
// This function returns the specific prompt for each document type.
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

// --- Main Handler Function ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filePath, documentType, solicitud_id } = req.body;

    if (!filePath || !documentType || !solicitud_id) {
      return res.status(400).json({ error: 'filePath, documentType, and solicitud_id are required.' });
    }

    // 1. Create a secure, temporary URL for the file from Supabase Storage
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('documentos-prestatarios')
      .createSignedUrl(filePath, 3600); // URL valid for 1 hour

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return res.status(500).json({ error: 'Could not create secure URL for document.' });
    }
    const signedUrl = urlData.signedUrl;

    // 2. Get the correct prompt and prepare the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt = getPromptForDocument(documentType);
    
    // Infer mimeType from file extension
    const fileExt = filePath.split('.').pop().toLowerCase();
    const mimeType = fileExt === 'pdf' ? 'application/pdf' : `image/${fileExt}`;

    // 3. Fetch the file content from the signed URL
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    // 4. Call Gemini API with the prompt and the file data
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: fileBuffer.toString("base64"), mimeType } }
    ]);
    
    const responseText = result.response.text();

    // Find the first '{' and the last '}' to extract the JSON block.
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in the response from the AI.');
    }

    const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
    const extractedData = JSON.parse(jsonString);

    // 5. Save the extracted data to your database
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('analisis_documentos')
      .insert({
        solicitud_id: solicitud_id,
        document_type: documentType,
        raw_data: extractedData,
        analysed_at: new Date(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save analysis to database.' });
    }

    // 5. Return a success response
    res.status(200).json({ success: true, data: extractedData });

  } catch (error) {
    console.error('Unhandled error in analysis function:', error);
    // Return the actual error message and stack for debugging
    res.status(500).json({ 
      error: `Internal Server Error: ${error.message}`,
      details: error.stack 
    });
  }
}

