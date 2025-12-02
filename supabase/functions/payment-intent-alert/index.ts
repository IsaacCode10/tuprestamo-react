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

    const amountStr =
      payload.expected_amount != null
        ? `Bs ${Number(payload.expected_amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'n/d'

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1a26; background:#f7fbfc; padding:16px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e6f2f4; border-radius:10px; overflow:hidden;">
          <div style="padding:18px 20px; border-bottom:1px solid #e6f2f4; background:#00445A;">
            <h2 style="margin:0; color:#fff; font-size:18px; font-weight:700;">${subject}</h2>
            <p style="margin:6px 0 0 0; color:#cde9f3; font-size:13px;">Alerta operativa • Tu Préstamo</p>
          </div>
          <div style="padding:18px 20px; line-height:1.5;">
            <p style="margin:0 0 10px 0; font-weight:600; color:#0f5a62;">
              ${payload.type === 'receipt_uploaded' ? 'El inversionista subió un comprobante. Revisa y concilia.' : 'Pago marcado como conciliado. Actualiza el estado si aplica.'}
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; margin:0 0 12px 0;">
              <tbody>
                <tr>
                  <td style="padding:6px 0; font-weight:600; color:#00445A;">Intent</td>
                  <td style="padding:6px 0; color:#0d1a26;">${payload.intent_id}</td>
                </tr>
                ${payload.opportunity_id ? `<tr><td style="padding:6px 0; font-weight:600; color:#00445A;">Oportunidad</td><td style="padding:6px 0; color:#0d1a26;">${payload.opportunity_id}</td></tr>` : ''}
                <tr>
                  <td style="padding:6px 0; font-weight:600; color:#00445A;">Monto</td>
                  <td style="padding:6px 0; color:#0d1a26;">${amountStr}</td>
                </tr>
                ${payload.status ? `<tr><td style="padding:6px 0; font-weight:600; color:#00445A;">Estado</td><td style="padding:6px 0; color:#0d1a26;">${payload.status}</td></tr>` : ''}
                ${payload.expires_at ? `<tr><td style="padding:6px 0; font-weight:600; color:#00445A;">Vence</td><td style="padding:6px 0; color:#0d1a26;">${payload.expires_at}</td></tr>` : ''}
              </tbody>
            </table>
            <div style="margin:16px 0 0 0;">
              <a href="https://tuprestamobo.com/admin/operaciones" style="display:inline-block; padding:10px 16px; background:#26C2B2; color:#fff; text-decoration:none; border-radius:6px; font-weight:700;">
                Ir al panel de Operaciones
              </a>
            </div>
          </div>
          <div style="padding:14px 20px; background:#f7fbfc; color:#55747b; font-size:12px; border-top:1px solid #e6f2f4;">
            Este aviso es automático. Revisa el intent en Operaciones y concilia según corresponda.
          </div>
        </div>
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
