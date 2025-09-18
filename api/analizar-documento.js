
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients with environment variables
// IMPORTANT: These variables must be set in your Vercel project settings
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Prompts Dictionary ---
// This function returns the specific prompt for each document type.
function getPromptForDocument(documentType) {
  const prompts = {
    ci_anverso: "Analiza la imagen de la cédula de identidad boliviana. Extrae la siguiente información: nombre completo, número de cédula, y fecha de nacimiento. Devuelve los datos estrictamente en formato JSON con las claves 'nombre_completo', 'numero_cedula', y 'fecha_nacimiento'. Si un campo no es visible, su valor debe ser null.",
    ci_reverso: "Analiza el reverso de la cédula de identidad boliviana. Extrae la fecha de emisión y la fecha de expiración. Devuelve los datos estrictamente en formato JSON con las claves 'fecha_emision' y 'fecha_expiracion'.",
    factura_servicio: "Analiza la factura de servicio. Extrae el nombre del titular del servicio y la dirección. Devuelve los datos estrictamente en formato JSON con las claves 'nombre_titular' y 'direccion'.",
    extracto_tarjeta: "Analiza el extracto de la tarjeta de crédito. Extrae el monto total de la deuda y la tasa de interés anual si está visible. Devuelve los datos estrictamente en formato JSON con las claves 'deuda_total' y 'tasa_interes_anual'. La deuda total debe ser un número sin símbolos de moneda.",
    selfie_ci: "Analiza la imagen. Primero, de la cédula de identidad visible, extrae el 'nombre_completo' y el 'numero_cedula'. Segundo, confirma si la cara en la selfie y la cara en la foto de la cédula parecen corresponder a la misma persona (responde con true o false en una clave 'verificacion_facial_basica'). Devuelve un único objeto JSON con estas tres claves.",
    boleta_pago: "Analiza la boleta de pago. Extrae el salario líquido pagable (neto), el nombre completo del empleador, y el mes al que corresponde el pago. Devuelve los datos estrictamente en formato JSON con las claves 'salario_neto', 'nombre_empleador', y 'mes_pago'. El salario neto debe ser un número sin símbolos de moneda.",
    certificado_gestora: "Analiza el certificado de la Gestora Pública. Extrae el nombre del titular y el total de aportes acumulados si está visible. Devuelve los datos en formato JSON con las claves 'nombre_titular' y 'total_aportes'.",
    extracto_bancario_3m: "Este documento requiere un análisis más complejo. Confirma si el documento parece ser un extracto bancario. Devuelve un JSON con la clave 'es_extracto_bancario' y el valor true o false.",
    nit: "Analiza el certificado de NIT. Extrae el nombre o razón social y el número de NIT. Devuelve los datos en formato JSON con las claves 'razon_social' y 'numero_nit'.",
    boleta_jubilacion: "Analiza la boleta de pago de jubilación. Extrae el líquido pagable y el nombre del titular. Devuelve los datos en formato JSON con las claves 'liquido_pagable' y 'nombre_titular'.",
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

    // 3. Call Gemini API with the prompt and the file data
    const result = await model.generateContent([
      prompt,
      { fileData: { mimeType, fileUri: signedUrl } }
    ]);
    
    const extractedDataText = result.response.text();
    const extractedData = JSON.parse(extractedDataText);

    // 4. Save the extracted data to your database
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
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
