import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Segmento "caliente": envio la solicitud completa (esta en `solicitudes`) pero nunca activo
// ni entro a su dashboard (`activado_en_dashboard_at` null - se marca desde
// BorrowerDashboard.jsx la primera vez que carga de verdad). Ver GUIA_DEFINITIVA_BOT_WHATSAPP.md
// Parte 10 y FRAMEWORK_CONVERSION.md.
//
// Corte por fecha: solo solicitudes creadas desde HOY (2026-09-07) en adelante - decision
// explicita de Isaac para no reactivar leads viejos con plantillas pagas SIN REVISAR. Los
// leads de antes del corte que Isaac revisó y aprobó uno por uno (2026-09-08, ver
// ESTRATEGIA_REACTIVACION_WHATSAPP.md) entran vía `incluir_reactivacion_retroactiva = true`,
// no moviendo la fecha de corte general.
//
// Pensado para correr cada 30 min via pg_cron (ver migracion add-reactivacion-caliente-cron).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''
const SITE_URL = 'https://tuprestamobo.com'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const HORAS_ESPERA = 6 // mismo criterio que el segmento frio, ajustable
const FECHA_CORTE = '2026-09-07T00:00:00Z' // no tocar solicitudes anteriores a hoy

// Solo tiene sentido reactivar solicitudes todavia vivas - si ya se cerro (aprobado,
// rechazado, etc.) este mensaje no aplica. Ajustar esta lista si el listado real de
// `estado` en produccion difiere.
const ESTADOS_ACTIVOS = ['pendiente', 'pre-aprobado', 'documentos-en-revision', 'aprobado_para_oferta']

function primerNombre(nombreCompleto: string) {
  return (nombreCompleto || '').trim().split(/\s+/)[0] || 'Hola'
}

function normalizarWhatsapp(numero: string): string {
  const limpio = (numero || '').replace(/\D/g, '')
  return limpio.startsWith('591') ? limpio : `591${limpio}`
}

async function logToBotCRM(whatsappNormalizado: string, nombre: string, content: string, wamid: string | null) {
  const { data: contact } = await supabaseAdmin
    .from('bot_contacts')
    .select('id')
    .eq('phone', whatsappNormalizado)
    .maybeSingle()

  let contactId = contact?.id
  if (!contactId) {
    const { data: inserted, error } = await supabaseAdmin
      .from('bot_contacts')
      .insert({ phone: whatsappNormalizado, name: nombre, source: 'reactivacion_caliente' })
      .select('id')
      .single()
    if (error) { console.error('[send-reactivacion-caliente] error creando bot_contact:', error); return }
    contactId = inserted.id
  }

  await supabaseAdmin.from('bot_messages').insert({
    contact_id: contactId,
    role: 'assistant',
    content,
    whatsapp_message_id: wamid,
    status: 'sent',
  })
}

async function enviarWhatsApp(telefono: string, nombreCompleto: string): Promise<boolean> {
  const numero = normalizarWhatsapp(telefono)
  const nombre = primerNombre(nombreCompleto)

  const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numero,
      type: 'template',
      template: {
        name: 'reactivacion_solicitud_caliente',
        language: { code: 'es_AR' },
        // Botones "Entrar a mi cuenta" / "Que me llamen" son de Respuesta rapida (texto fijo,
        // no llevan link/telefono dinamico) - vienen ya incluidos en la plantilla aprobada,
        // no hace falta un componente 'button' aca. Se manejan al tocarlos en
        // tuprestamo-bot/src/app/api/webhook/route.ts.
        components: [{ type: 'body', parameters: [{ type: 'text', text: nombre }] }],
      },
    }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) { console.error('[send-reactivacion-caliente] error whatsapp:', JSON.stringify(json)); return false }
  const wamid = json?.messages?.[0]?.id ?? null

  // Texto real de la plantilla aprobada (con Isaac, ver FRAMEWORK_CONVERSION.md): identificacion
  // de Sofia + beneficio (dejar atras los intereses) antes del pedido, botones de Respuesta
  // rapida "Entrar a mi cuenta" / "Que me llamen" manejados en tuprestamo-bot/webhook/route.ts.
  const contenidoReal = `Hola ${nombre}! Soy Sofía, de Tu Préstamo 👋 Tu solicitud de refinanciamiento de tarjeta de crédito está lista. Solo te falta entrar a tu cuenta para ver el estado y seguir dejando atrás los altos intereses de tu tarjeta de crédito. ¿Cómo preferís seguir?`
  await logToBotCRM(numero, nombreCompleto, contenidoReal, wamid)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const limite = new Date(Date.now() - HORAS_ESPERA * 60 * 60 * 1000).toISOString()

    // Corte general por fecha, MAS una whitelist explicita de leads de antes del corte
    // revisados uno por uno con Isaac (ver incluir_reactivacion_retroactiva y
    // ESTRATEGIA_REACTIVACION_WHATSAPP.md) - nunca se movio la fecha de corte general para
    // no colar leads que todavia no se revisaron.
    const { data: solicitudes, error } = await supabaseAdmin
      .from('solicitudes')
      .select('id, nombre_completo, telefono, created_at, estado')
      .eq('tipo_solicitud', 'prestatario')
      .in('estado', ESTADOS_ACTIVOS)
      .not('telefono', 'is', null)
      .or(`created_at.gte.${FECHA_CORTE},incluir_reactivacion_retroactiva.eq.true`)
      .lte('created_at', limite)
      .is('activado_en_dashboard_at', null)
      .is('reactivacion_enviada_at', null)

    if (error) throw error

    let enviados = 0
    for (const s of solicitudes ?? []) {
      if (!s.telefono) continue
      try {
        const ok = await enviarWhatsApp(s.telefono, s.nombre_completo || '')
        if (ok) {
          await supabaseAdmin
            .from('solicitudes')
            .update({ reactivacion_enviada_at: new Date().toISOString() })
            .eq('id', s.id)
          enviados++
        }
      } catch (err) {
        console.error('[send-reactivacion-caliente] error con solicitud', s.id, err)
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados, revisados: (solicitudes ?? []).length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('send-reactivacion-caliente error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
