import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Segmento "frio": empezo el formulario de solicitud (dejo nombre + email + celular) pero
// nunca lo termino. Ver GUIA_DEFINITIVA_BOT_WHATSAPP.md Parte 10 y
// FRAMEWORK_CONVERSION.md - mismo patron que send-carrito-abandonado de Capibara Kids.
//
// Corte por fecha: solo solicitudes_parciales creadas desde HOY (2026-09-07) en adelante -
// decision explicita de Isaac para no reactivar leads viejos con plantillas pagas.
//
// Pensado para correr cada 30 min via pg_cron (ver migracion add-reactivacion-fria-cron).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const HORAS_ESPERA = 6 // mismo criterio que Capibara Kids, ajustable
const FECHA_CORTE = '2026-09-07T00:00:00Z' // no tocar solicitudes anteriores a hoy

function primerNombre(nombreCompleto: string) {
  return (nombreCompleto || '').trim().split(/\s+/)[0] || 'Hola'
}

// solicitudes_parciales.telefono se guarda como lo tipeo la persona (sin normalizar) -
// mismo criterio de normalizacion que usa Capibara Kids para bot_contacts.phone.
function normalizarWhatsapp(numero: string): string {
  const limpio = (numero || '').replace(/\D/g, '')
  return limpio.startsWith('591') ? limpio : `591${limpio}`
}

// Mismo patron que Capibara Kids: esta funcion le habla directo a la API de Meta, sin pasar
// por el webhook del bot (tuprestamo-bot) - hay que registrar el contacto/mensaje a mano
// para que aparezca en el panel de conversaciones de Sofia.
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
      .insert({ phone: whatsappNormalizado, name: nombre, source: 'reactivacion_fria' })
      .select('id')
      .single()
    if (error) { console.error('[send-reactivacion-fria] error creando bot_contact:', error); return }
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
        name: 'reactivacion_solicitud_fria',
        language: { code: 'es_AR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: nombre }] }],
      },
    }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) { console.error('[send-reactivacion-fria] error whatsapp:', JSON.stringify(json)); return false }
  const wamid = json?.messages?.[0]?.id ?? null

  // Texto real todavia no confirmado contra un envio real (plantilla recien creada) - mejor
  // aproximacion, a revisar cuando Meta la apruebe y se vea el primer envio de verdad.
  const contenidoReal = `Hola ${nombre}! Vimos que empezaste tu solicitud para refinanciar tu tarjeta de credito con Tu Prestamo y no llegaste a terminarla. Te tomamos unos 3 minutos, sin compromiso - seguis exactamente donde la dejaste. Si tenes alguna duda, contestanos por aca no mas.`
  await logToBotCRM(numero, nombreCompleto, contenidoReal, wamid)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const limite = new Date(Date.now() - HORAS_ESPERA * 60 * 60 * 1000).toISOString()

    const { data: parciales, error } = await supabaseAdmin
      .from('solicitudes_parciales')
      .select('id, nombre_completo, telefono, email, updated_at')
      .eq('convertido', false)
      .not('telefono', 'is', null)
      .gte('created_at', FECHA_CORTE)
      .lte('updated_at', limite)
      .is('contactado_at', null)

    if (error) throw error

    let enviados = 0
    for (const p of parciales ?? []) {
      if (!p.telefono) continue
      try {
        const ok = await enviarWhatsApp(p.telefono, p.nombre_completo || '')
        if (ok) {
          await supabaseAdmin
            .from('solicitudes_parciales')
            .update({ contactado_at: new Date().toISOString() })
            .eq('id', p.id)
          enviados++
        }
      } catch (err) {
        console.error('[send-reactivacion-fria] error con parcial', p.id, err)
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados, revisados: (parciales ?? []).length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('send-reactivacion-fria error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
