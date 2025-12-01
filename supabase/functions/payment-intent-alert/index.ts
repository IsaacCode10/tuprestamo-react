import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

type Payload = {
  type: 'receipt_uploaded' | 'paid'
  intent_id: string
  opportunity_id?: number
  expected_amount?: number
  status?: string
  expires_at?: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const payload: Payload = await req.json()
    if (!payload?.type || !payload?.intent_id) {
      throw new Error('type e intent_id son requeridos')
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const toRaw = Deno.env.get('OPS_ALERT_TO') || ''
    const ccRaw = Deno.env.get('OPS_ALERT_CC') || ''
    const to = toRaw.split(',').map((s) => s.trim()).filter(Boolean)
    const cc = ccRaw.split(',').map((s) => s.trim()).filter(Boolean)

    if (!resendKey || to.length === 0) {
      console.warn('Faltan RESEND_API_KEY o destinatarios OPS_ALERT_TO; alerta no enviada')
      return json({ ok: false, message: 'Missing config' }, 200)
    }

    const subject =
      payload.type === 'receipt_uploaded'
        ? `Comprobante recibido – Intent ${payload.intent_id}`
        : `Pago conciliado – Intent ${payload.intent_id}`

    const lines = [
      `Intent: ${payload.intent_id}`,
      payload.opportunity_id ? `Oportunidad: ${payload.opportunity_id}` : null,
      payload.expected_amount != null ? `Monto: Bs ${Number(payload.expected_amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
      payload.status ? `Estado: ${payload.status}` : null,
      payload.expires_at ? `Vence: ${payload.expires_at}` : null,
      'Acción sugerida: revisar en /admin/operaciones y conciliar.',
    ].filter(Boolean)

    const html = `
      <div style="font-family: Arial, sans-serif; color: #222">
        <p>${payload.type === 'receipt_uploaded' ? 'El inversionista subió un comprobante.' : 'Pago marcado como conciliado.'}</p>
        <ul>
          ${lines.map((l) => `<li>${l}</li>`).join('')}
        </ul>
        <p><a href="https://tuprestamobo.com/admin/operaciones" style="color:#00445A;">Ir al panel de Operaciones</a></p>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tu Prestamo <notificaciones@tuprestamobo.com>',
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject,
        html,
      }),
    })

    return json({ ok: true }, 200)
  } catch (e) {
    console.error('payment-intent-alert error', e)
    return json({ error: (e as Error).message }, 400)
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
