import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

const MODEL_CONFIG = (Deno.env.get('GEMINI_MODEL_LIST') || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const MAX_ATTEMPTS = Math.max(1, Number(Deno.env.get('GEMINI_MAX_ATTEMPTS') || '2'))
const RETRY_DELAY_MS = Math.max(500, Number(Deno.env.get('GEMINI_RETRY_DELAY_MS') || '1200'))

console.log(`Function "analizar-documento-v2" up and running! (models: ${MODEL_CONFIG.join(', ')})`)

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('documentos-prestatarios')
      .createSignedUrl(filePath, 3600)

    if (urlError) throw urlError
    const signedUrl = urlData.signedUrl

    const fileResponse = await fetch(signedUrl)
    if (!fileResponse.ok) throw new Error(`Fallo al obtener el archivo: ${fileResponse.statusText}`)
    const fileBuffer = await fileResponse.arrayBuffer()

    let binary = ''
    const bytes = new Uint8Array(fileBuffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64File = btoa(binary)
    const fileMimeType = fileResponse.headers.get('Content-Type') || 'application/octet-stream'

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('El secreto GEMINI_API_KEY no está configurado.')

    if (!MODEL_CONFIG.length) throw new Error('No hay modelos de Gemini configurados.')

    const prompt = getPromptForDocument(documentType)
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: fileMimeType,
                data: base64File,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    }

    console.log('Paso 1: Llamando a la API de Gemini (API Key)...')
    const geminiResponse = await callGeminiWithFallback({
      apiKey,
      requestBody,
      models: MODEL_CONFIG,
      maxAttemptsPerModel: MAX_ATTEMPTS,
      retryDelayMs: RETRY_DELAY_MS,
    })
    console.log(`Paso 2: Respuesta de Gemini recibida (modelo ${geminiResponse.modelUsed}).`)

    const result = JSON.parse(geminiResponse.responseText)
    if (!result || !Array.isArray(result.candidates) || result.candidates.length === 0) {
      throw new Error('La respuesta de la IA no tiene la estructura esperada.')
    }

    const candidateText = result.candidates[0]?.content?.parts?.[0]?.text
    if (!candidateText) {
      throw new Error('La respuesta de la IA no tiene la estructura esperada.')
    }

    console.log('Paso 3: Texto extraído de la respuesta de la IA.')

    const extractedData = parseCandidateData(candidateText)

    console.log('Paso 4: Intentando insertar en la base de datos...')
    const { error: dbError } = await supabaseAdmin
      .from('analisis_documentos')
      .insert({
        solicitud_id,
        document_type: documentType,
        raw_data: extractedData,
        analysed_at: new Date(),
      })

    if (dbError) throw dbError
    console.log('Paso 5: Inserción en la base de datos exitosa.')

    await checkAndTriggerSynthesis(supabaseAdmin, solicitud_id)

    console.log('Paso 6: Retornando respuesta exitosa.')
    return new Response(JSON.stringify({ ok: true, data: extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`Error fatal en 'analizar-documento-v2': ${(error as Error)?.message || error}`)
    const msg = (error as Error)?.message || String(error)
    let status = 500
    let code = 'INTERNAL_ERROR'
    let cause = msg
    let action = 'Intenta nuevamente. Si persiste, contacta a soporte.'

    if (msg.includes('son requeridos')) {
      status = 400
      code = 'BAD_REQUEST'
      action = 'Verifica filePath, documentType y solicitud_id.'
    } else if (msg.includes('GEMINI_API_KEY')) {
      status = 500
      code = 'CONFIG_MISSING'
      action = 'Define GEMINI_API_KEY y GEMINI_MODEL en Secrets de Supabase.'
    } else if (msg.startsWith('Fallo al obtener el archivo')) {
      status = 502
      code = 'STORAGE_FETCH_FAILED'
      action = 'Revisa el path en Storage y permisos del bucket.'
    } else if (msg.includes('Error en la API de Gemini') || msg.includes('Gemini no-2xx')) {
      status = 502
      code = 'GEMINI_API_ERROR'
      action = 'Gemini está saturado; intenta nuevamente en unos segundos.'
    } else if (msg.includes('estructura esperada') || msg.includes('objeto JSON')) {
      status = 502
      code = 'GEMINI_PARSE_ERROR'
      action = 'Sube un documento legible; intenta otra imagen o PDF.'
    } else if ((error as any)?.code || (error as any)?.details) {
      status = 500
      code = 'DB_ERROR'
      action = 'Verifica esquema y RLS de analisis_documentos.'
    }

    const payload = { error: { code, message: 'Fallo al analizar documento', cause, action } }
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})

// --- Helpers ---
async function callGeminiWithFallback(options: {
  apiKey: string
  requestBody: unknown
  models: string[]
  maxAttemptsPerModel: number
  retryDelayMs: number
}) {
  let lastStatus = 0
  let lastStatusText = ''
  let lastBody = ''

  for (const model of options.models) {
    for (let attempt = 1; attempt <= options.maxAttemptsPerModel; attempt++) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${options.apiKey}`
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options.requestBody),
        })
        lastStatus = response.status
        lastStatusText = response.statusText
        const body = await response.text()
        lastBody = body

        if (response.ok) {
          return { responseText: body, modelUsed: model, status: response.status, statusText: response.statusText }
        }

        console.warn(`Gemini falló con ${response.status} ${response.statusText} (modelo ${model}, intento ${attempt}).`)
        if (response.status === 503 && attempt < options.maxAttemptsPerModel) {
          await delay(options.retryDelayMs * attempt)
          continue
        }
        break
      } catch (err) {
        console.warn(`Gemini request error (modelo ${model}, intento ${attempt}):`, err)
        if (attempt < options.maxAttemptsPerModel) {
          await delay(options.retryDelayMs * attempt)
          continue
        }
        throw err
      }
    }
    console.log(`Gemini: cambiando al siguiente modelo en la lista.`)
  }

  throw new Error(`Error en la API de Gemini: ${lastStatus} ${lastStatusText} - ${lastBody}`)
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseCandidateData(responseText: string) {
  let extractedData: any
  let jsonString = ''
  const responseForError = responseText.substring(0, 500)

  const markdownStart = responseText.indexOf('```json')
  if (markdownStart !== -1) {
    const jsonBlock = responseText.substring(markdownStart + 7)
    const markdownEnd = jsonBlock.indexOf('```')
    if (markdownEnd !== -1) {
      jsonString = jsonBlock.substring(0, markdownEnd).trim()
    }
  }

  if (!jsonString) {
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonString = responseText.substring(jsonStart, jsonEnd + 1)
    }
  }

  if (jsonString) {
    try {
      extractedData = JSON.parse(jsonString)
      console.log('Paso 4: JSON extraído y parseado desde el texto.')
    } catch (parseError) {
      console.warn('Fallo al parsear el JSON extraído. Se guardará como error.', (parseError as Error)?.message)
      extractedData = {
        error: 'json_invalido',
        mensaje: 'La IA retornó un JSON bien formado pero inválido.',
        respuesta_ia: responseForError,
      }
    }
  } else {
    console.warn('No se encontró JSON en la respuesta de la IA. Se guardará como error.')
    extractedData = {
      error: 'json_no_encontrado',
      mensaje: 'La IA no retornó un objeto JSON.',
      respuesta_ia: responseForError,
    }
  }

  return extractedData
}

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
    certificado_gestora: "Analiza el certificado de la Gestora Pública (o AFP). Extrae el nombre completo del titular ('nombre_titular'), el total de aportes acumulados ('total_aportes'), y la fecha de emisión del certificado ('fecha_emision_certificado'). El total de aportes debe ser un número sin símbolos. Si un campo no es visible, su valor debe ser null. Devuelve los datos estrictamente en formato JSON.",
    extracto_bancario_m1: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    extracto_bancario_m2: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    extracto_bancario_m3: "Analiza el extracto bancario. Extrae el total de ingresos, el total de egresos y el saldo final del mes. Devuelve los datos estrictamente en formato JSON con las claves 'total_ingresos', 'total_egresos' y 'saldo_final'. Los valores deben ser números sin símbolos de moneda.",
    nit: "Analiza el certificado de NIT. Extrae el nombre o razón social y el número de NIT. Devuelve los datos en formato JSON con las claves 'razon_social' y 'numero_nit'.",
    boleta_jubilacion: "Analiza la boleta de pago de jubilación. Extrae el líquido pagable ('ingreso_neto_jubilacion'), el nombre completo del titular ('nombre_titular'), y el ente gestor que emite el pago ('ente_gestor'), por ejemplo, 'SENASIR'. Si un campo no es visible, su valor debe ser null.",
  }
  return prompts[documentType] || 'Analiza el documento y extrae la información más relevante en formato JSON.'
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
    console.log(`¡Completo! Generando autorización INFOCRED preimpresa y disparando síntesis para ${solicitud_id}`)
    await ensureAuthorizationPreprint(supabaseAdmin, solicitudData)
    const { error: invokeError } = await supabaseAdmin.functions.invoke('sintetizar-perfil-riesgo', {
      body: { solicitud_id },
    })
    if (invokeError) {
      console.error('Error al invocar la función de síntesis:', invokeError)
    }
  }
}

const PREPRINT_DOCUMENT_TYPE = 'autorizacion_infocred_preimpresa'

async function ensureAuthorizationPreprint(supabaseAdmin: any, solicitud: any) {
  if (!solicitud) return
  const { id: solicitud_id, user_id } = solicitud
  const { data: existing } = await supabaseAdmin
    .from('documentos')
    .select('id')
    .eq('solicitud_id', solicitud_id)
    .eq('tipo_documento', PREPRINT_DOCUMENT_TYPE)
    .limit(1)
  if (existing && existing.length > 0) {
    console.log(`Preimpreso INFOCRED ya existe para solicitud ${solicitud_id}`)
    return
  }

  try {
    const pdfBytes = await generateAuthorizationPDF(solicitud)
    const pdfFileName = `${user_id}/${solicitud_id}_autorizacion_infocred_preimpresa.pdf`
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documentos-prestatarios')
      .upload(pdfFileName, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (storageError) {
      console.error(`Error subiendo preimpreso INFOCRED para ${solicitud_id}:`, storageError)
      return
    }

    const { error: dbError } = await supabaseAdmin.from('documentos').insert({
      solicitud_id,
      user_id,
      tipo_documento: PREPRINT_DOCUMENT_TYPE,
      nombre_archivo: pdfFileName,
      url_archivo: pdfFileName,
      estado: 'subido',
    })
    if (dbError) {
      console.error(`Error registrando preimpreso INFOCRED para ${solicitud_id}:`, dbError)
    } else {
      console.log(`Preimpreso INFOCRED creado para solicitud ${solicitud_id}`)
    }
  } catch (err) {
    console.error(`Error generando preimpreso INFOCRED para solicitud ${solicitud_id}:`, err)
  }
}
