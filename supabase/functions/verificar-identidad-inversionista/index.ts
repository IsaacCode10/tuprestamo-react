import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Function verificar-identidad-inversionista starting up...')

type StorageDocPayload = {
  record?: {
    id?: string
    user_id?: string
    url_archivo?: string
    tipo_documento?: string | null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record }: StorageDocPayload = await req.json()
    const user_id = record?.user_id
    const url_archivo = record?.url_archivo
    const tipo_documento = record?.tipo_documento || null
    const document_id = record?.id || 'sin-id'

    if (!user_id || !url_archivo) {
      throw new Error('user_id y url_archivo son requeridos en el payload.')
    }

    // Procesar SOLO el anverso del CI de inversionista; si falta tipo_documento o no coincide, ignorar
    if (tipo_documento !== 'ci_inversionista_anverso') {
      return new Response(JSON.stringify({ message: 'ignorado: tipo_documento no aplica' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Iniciando verificación para user_id=${user_id} doc=${document_id}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Crear URL firmada del archivo (bucket privado unificado)
    const BUCKET_NAME = 'documentos-prestatarios'
    const { data: signedData, error: signedErr } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .createSignedUrl(url_archivo, 3600)
    if (signedErr || !signedData?.signedUrl) {
      throw new Error(`No se pudo generar URL firmada para ${url_archivo}: ${signedErr?.message ?? 'desconocido'}`)
    }
    const signedUrl = signedData.signedUrl

    // 2) Perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nombre_completo, numero_ci, email, estado_verificacion')
      .eq('id', user_id)
      .single()
    if (profileError || !profile) {
      throw new Error(`No se encontró perfil para ${user_id}: ${profileError?.message}`)
    }

    // 3) Descargar archivo y convertir a Base64
    const fileResp = await fetch(signedUrl)
    if (!fileResp.ok) throw new Error(`Fallo al obtener el archivo: ${fileResp.status} ${fileResp.statusText}`)
    const fileBuffer = await fileResp.arrayBuffer()
    const fileMimeType = fileResp.headers.get('Content-Type') || 'image/jpeg'
    let binary = ''
    const bytes = new Uint8Array(fileBuffer)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64File = btoa(binary)

    // 4) Llamada a Gemini (alineada con analizar-documento-v2)
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!apiKey) throw new Error('Falta GEMINI_API_KEY (o GOOGLE_GEMINI_API_KEY).')
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`

    const prompt = `
Eres un sistema experto de OCR para Cédulas de Identidad (Bolivia).
Devuelve SIEMPRE JSON puro con las claves: nombre_completo (string|null) y numero_ci (string|null).
Si la imagen no es válida, devuelve {"error":"Imagen ilegible o documento no válido"}.
`

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: fileMimeType, data: base64File } }
          ]
        }
      ],
      generationConfig: { temperature: 0.1, topP: 0.95, topK: 40, maxOutputTokens: 2048 }
    } as any

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    if (!geminiResponse.ok) {
      const txt = await geminiResponse.text()
      throw new Error(`Error Gemini: ${geminiResponse.status} ${geminiResponse.statusText} - ${txt}`)
    }
    const result = await geminiResponse.json()
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extraer JSON de respuesta de manera robusta
    let jsonString = ''
    const mdStart = rawText.indexOf('```json')
    if (mdStart !== -1) {
      const block = rawText.substring(mdStart + 7)
      const mdEnd = block.indexOf('```')
      if (mdEnd !== -1) jsonString = block.substring(0, mdEnd).trim()
    }
    if (!jsonString) {
      const s = rawText.indexOf('{')
      const e = rawText.lastIndexOf('}')
      if (s !== -1 && e !== -1) jsonString = rawText.substring(s, e + 1)
    }
    if (!jsonString) throw new Error('La IA no devolvió JSON reconocible.')

    const aiData = JSON.parse(jsonString)

    // 5) Comparación con perfil
    const normalize = (str?: string) => (str ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
    const onlyDigits = (str?: string) => (str ?? '').replace(/\D/g, '')

    const nameOK = normalize(profile.nombre_completo) === normalize(aiData?.nombre_completo)
    const ciOK = onlyDigits(profile.numero_ci) === onlyDigits(aiData?.numero_ci)

    let finalStatus: 'verificado' | 'pendiente_revision' | 'requiere_revision_manual' = 'requiere_revision_manual'
    if (aiData?.error) {
      finalStatus = 'requiere_revision_manual'
    } else if (nameOK && ciOK) {
      finalStatus = 'verificado'
    } else {
      finalStatus = 'requiere_revision_manual'
    }

    // 6) Actualizar perfil
    const { error: updErr } = await supabaseAdmin
      .from('profiles')
      .update({ estado_verificacion: finalStatus })
      .eq('id', user_id)
    if (updErr) throw new Error(`Error al actualizar perfil: ${updErr.message}`)

    // 7) Notificación al usuario (solo si cambió el estado; no bloquear en caso de error)
    try {
      if (profile.estado_verificacion !== finalStatus) {
        const notifyTitle = finalStatus === 'verificado'
          ? 'Tu verificación fue aprobada'
          : 'Tu verificación requiere revisión'
        const notifyBody = finalStatus === 'verificado'
          ? '¡Listo! Ya puedes invertir y solicitar retiros.'
          : 'No pudimos confirmar automáticamente tu identidad. Un analista revisará tu caso.'
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ user_id, type: 'kyc_status', title: notifyTitle, body: notifyBody, email: true })
        })
      }
    } catch (_) { /* noop */ }

    return new Response(JSON.stringify({ message: 'ok', status: finalStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error en verificar-identidad-inversionista:', error)
    return new Response(JSON.stringify({ error: error.message ?? 'unknown_error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
