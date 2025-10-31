import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Function verificar-identidad-inversionista starting up...')

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Espera payload: { record: { user_id, url_archivo, id? } }
    const { record: document } = await req.json()
    const { user_id, url_archivo, tipo_documento, id: document_id } = document || {}

    if (!user_id || !url_archivo) {
      throw new Error('user_id y url_archivo son requeridos en el payload.')
    }

    // Si el webhook dispara para otros documentos, ignorar silenciosamente
    if (tipo_documento && tipo_documento !== 'ci_inversionista_anverso') {
      return new Response(JSON.stringify({ message: 'ignorado: tipo_documento no aplica' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Iniciando verificaciÃƒÂ³n para user_id=${user_id} doc=${document_id ?? 'sin-id'}`)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) URL firmada (bucket privado)
    // MVP: reutilizar el bucket existente de prestatarios para evitar pasos manuales
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
      .select('nombre_completo, numero_ci, email')
      .eq('id', user_id)
      .single()
    if (profileError || !profile) {
      throw new Error(`No se encontro perfil para ${user_id}: ${profileError?.message}`)
    }
    const firstName = (profile.nombre_completo || '').split(' ')[0] || ''

    // 3) Descargar archivo y convertir a Base64
    const fileResp = await fetch(signedUrl)
    if (!fileResp.ok) throw new Error(`Fallo al obtener el archivo: ${fileResp.statusText}`)
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
Eres un sistema experto de OCR para CÃƒÂ©dulas de Identidad (Bolivia).
Devuelve SIEMPRE JSON puro con las claves: nombre_completo (string|null) y numero_ci (string|null).
Si la imagen no es vÃƒÂ¡lida, devuelve {"error":"Imagen ilegible o documento no vÃƒÂ¡lido"}.
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
    if (!jsonString) throw new Error('La IA no devolviÃƒÂ³ JSON reconocible.')

    const aiData = JSON.parse(jsonString)

    // 5) ComparaciÃƒÂ³n con perfil
    const normalize = (str?: string) => (str ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
    const onlyDigits = (str?: string) => (str ?? '').replace(/\D/g, '')

    const nameOK = normalize(profile.nombre_completo) === normalize(aiData?.nombre_completo)
    const ciOK = onlyDigits(profile.numero_ci) === onlyDigits(aiData?.numero_ci)

    let finalStatus: string = 'requiere_revision_manual'
    if (aiData?.error) {
      finalStatus = 'requiere_revision_manual'
    } else if (nameOK && ciOK) {
      finalStatus = 'verificado'
    }

    // 6) Actualizar perfil
    const { error: updErr } = await supabaseAdmin
      .from('profiles')
      .update({ estado_verificacion: finalStatus as any })
      .eq('id', user_id)
    if (updErr) throw new Error(`Error al actualizar perfil: ${updErr.message}`)

    // 8) NotificaciÃƒÂ³n al usuario (no bloquear en caso de error)
    try {
      const notifyTitle = finalStatus === 'verificado'
        ? 'Tu verificaciÃƒÂ³n fue aprobada'
        : 'Tu verificaciÃƒÂ³n requiere revisiÃƒÂ³n'
      const notifyBody = finalStatus === 'verificado'
        ? 'Ã‚Â¡Listo! Ya puedes invertir y solicitar retiros.'
        : 'No pudimos confirmar automÃƒÂ¡ticamente tu identidad. Un analista revisarÃƒÂ¡ tu caso.'
      // Llamar a la funciÃƒÂ³n de notificaciones (misma instancia)
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ user_id, type: 'kyc_status', title: notifyTitle, body: notifyBody, email: true })
      })
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

