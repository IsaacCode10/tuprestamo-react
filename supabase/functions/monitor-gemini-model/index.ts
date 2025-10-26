import { corsHeaders } from '../_shared/cors.ts'

console.log('Function "monitor-gemini-model" up and running!')

interface HealthResult {
  ok: boolean
  status: 'healthy' | 'unhealthy'
  details?: Record<string, unknown>
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1) Cargar configuración
    const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
    const modelInput = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
    const resendKey = Deno.env.get('RESEND_API_KEY') || ''
    const alertEmailsEnv = Deno.env.get('ALERT_EMAIL') || ''

    // Soporte opcional para override vía payload
    const isJson = req.headers.get('content-type')?.includes('application/json')
    const body = isJson ? await req.json().catch(() => ({})) : {}
    const overrideEmails: string | undefined = body?.alert_emails

    let model = modelInput
    if (model.endsWith('-latest')) model = model.replace(/-latest$/, '')

    const defaultEmails = ['contacto@tuprestamobo.com', 'alfaro.isaac10@gmail.com']
    const alertRecipients = (overrideEmails || alertEmailsEnv)
      ? String(overrideEmails || alertEmailsEnv).split(',').map(s => s.trim()).filter(Boolean)
      : defaultEmails

    if (!apiKey) throw new Error('Falta GEMINI_API_KEY')
    if (!resendKey) console.warn('RESEND_API_KEY no configurado: se omitirá el email de alerta')

    const keyLooksLikeAiStudio = apiKey.startsWith('AIza')
    console.log(`Monitor: model=${model}, keyLooksLikeAiStudio=${keyLooksLikeAiStudio}, recipients=${alertRecipients.join(';')}`)

    // 2) Healthcheck a Gemini
    const health = await checkGemini({ apiKey, model })
    console.log(`Monitor: health=${health.status}`)

    // 3) Enviar alerta si está unhealthy
    if (!health.ok && resendKey && alertRecipients.length > 0) {
      const subject = 'ALERTA: Gemini Health Check FALLÓ'
      const text = formatAlertEmail({ model, health })
      try {
        await sendResendEmail({ apiKey: resendKey, to: alertRecipients, subject, text })
        console.log('Monitor: alerta enviada vía Resend')
      } catch (e) {
        console.error('Monitor: fallo al enviar alerta vía Resend', (e as Error)?.message)
      }
    }

    // 4) Respuesta HTTP
    const statusCode = health.ok ? 200 : 503
    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    })
  } catch (error) {
    const msg = (error as Error)?.message || String(error)
    console.error('Monitor: error no controlado', msg)
    const payload: HealthResult = { ok: false, status: 'unhealthy', error: msg }
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function checkGemini({ apiKey, model }: { apiKey: string; model: string }): Promise<HealthResult> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
    const requestBody = {
      contents: [
        {
          parts: [
            { text: 'healthcheck' },
          ],
        },
      ],
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return {
        ok: false,
        status: 'unhealthy',
        error: `Gemini no-2xx: ${resp.status} ${resp.statusText}`,
        details: { body: safeTruncate(text, 1200) },
      }
    }

    // Intentar parsear JSON y validar estructura mínima
    let json: any = {}
    try { json = JSON.parse(text) } catch {
      return { ok: false, status: 'unhealthy', error: 'Gemini respondió sin JSON', details: { body: safeTruncate(text, 600) } }
    }

    const hasCandidates = Array.isArray(json?.candidates) && json.candidates.length > 0
    if (!hasCandidates) {
      return { ok: false, status: 'unhealthy', error: 'Gemini sin candidates', details: { json: json } }
    }

    return { ok: true, status: 'healthy', details: { model } }
  } catch (e) {
    return { ok: false, status: 'unhealthy', error: (e as Error)?.message || String(e) }
  }
}

function safeTruncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max) + '…'
}

async function sendResendEmail({ apiKey, to, subject, text }: { apiKey: string; to: string[]; subject: string; text: string }) {
  const payload = {
    from: 'contacto@tuprestamobo.com',
    to,
    subject,
    text,
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Resend no-2xx: ${resp.status} ${resp.statusText} - ${body}`)
  }
}

function formatAlertEmail({ model, health }: { model: string; health: HealthResult }): string {
  const lines = [
    'ALERTA: Gemini Health Check FALLÓ',
    '',
    `Modelo: ${model}`,
    `Estado: ${health.status}`,
    health.error ? `Error: ${health.error}` : undefined,
    health.details ? `Detalles: ${JSON.stringify(health.details).slice(0, 2000)}` : undefined,
    '',
    'Acción sugerida:',
    '- Verificar GEMINI_API_KEY (AI Studio) y restricciones',
    '- Confirmar que "Generative Language API" esté habilitada',
    '- Probar curl directo al endpoint de Google',
  ].filter(Boolean)
  return lines.join('\n')
}

