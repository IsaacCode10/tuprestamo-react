import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Segmento "documentos incompletos": la solicitud esta activa (aprobada por el scorecard)
// y la persona ya subio AL MENOS un documento (o sea, ya activo su cuenta), pero no todos
// los requeridos. Es el segmento mas valioso de los 3 (ver ESTRATEGIA_REACTIVACION_WHATSAPP.md
// seccion 8.1) - ya cruzo el filtro mas dificil, solo le falta un tramite mecanico.
//
// Corte por fecha + whitelist retroactiva: mismo mecanismo que send-reactivacion-caliente,
// pero con su PROPIA columna (incluir_reactivacion_documentos_retroactiva) - a proposito
// separada de la de la campaña caliente, para que nadie califique para las dos por error.
//
// Pensado para correr cada 30 min via pg_cron.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const HORAS_ESPERA = 6 // desde la ULTIMA subida real de documento, no desde created_at
const FECHA_CORTE = '2026-09-07T00:00:00Z'
const ESTADOS_ACTIVOS = ['pendiente', 'pre-aprobado', 'documentos-en-revision', 'aprobado_para_oferta']

// Mismo mapa que tuprestamo-bot/src/app/api/webhook/route.ts (duplicado a proposito, son
// runtimes distintos) y que getRequiredDocsBySituation en RiskAnalystDashboard.jsx. El NIT de
// Independiente es opcional, no se cuenta como requerido. Orden: extracto_tarjeta primero
// (decision de Isaac, 2026-09-09, ver Parte 11.4 de GUIA_DEFINITIVA_BOT_WHATSAPP.md) - aca
// el orden no cambia el conteo (solo se usa el largo de faltantes), se mantiene igual por
// consistencia con los otros 2 lugares donde vive esta lista.
const BASE_DOCS = ['extracto_tarjeta', 'ci_anverso', 'ci_reverso', 'boleta_aviso_electricidad', 'selfie_ci', 'autorizacion_infocred_firmada']
const REQUIRED_DOCS_BY_SITUACION: Record<string, string[]> = {
  Dependiente: [...BASE_DOCS, 'boleta_pago', 'certificado_gestora'],
  Independiente: [...BASE_DOCS, 'extracto_bancario_m1', 'extracto_bancario_m2', 'extracto_bancario_m3'],
  Jubilado: [...BASE_DOCS, 'boleta_jubilacion'],
}
function getRequiredDocs(situacionLaboral: string): string[] {
  return REQUIRED_DOCS_BY_SITUACION[situacionLaboral] || BASE_DOCS
}

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
      .insert({ phone: whatsappNormalizado, name: nombre, source: 'reactivacion_documentos' })
      .select('id')
      .single()
    if (error) { console.error('[send-reactivacion-documentos] error creando bot_contact:', error); return }
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

async function enviarWhatsApp(telefono: string, nombreCompleto: string, cantidadFaltante: number): Promise<boolean> {
  const numero = normalizarWhatsapp(telefono)
  const nombre = primerNombre(nombreCompleto)
  const cantidadTexto = `${cantidadFaltante} documento${cantidadFaltante === 1 ? '' : 's'}`

  const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numero,
      type: 'template',
      template: {
        name: 'reactivacion_solicitud_documentos',
        language: { code: 'es_AR' },
        // Botones "Termino por WhatsApp" / "Termino por la web" / "Necesito ayuda" son de
        // Respuesta rapida, texto fijo - vienen incluidos en la plantilla aprobada, no hace
        // falta un componente 'button' aca. Se manejan en tuprestamo-bot/webhook/route.ts.
        components: [{ type: 'body', parameters: [
          { type: 'text', text: nombre },
          { type: 'text', text: cantidadTexto },
        ] }],
      },
    }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) { console.error('[send-reactivacion-documentos] error whatsapp:', JSON.stringify(json)); return false }
  const wamid = json?.messages?.[0]?.id ?? null

  // Texto real de la plantilla aprobada (con Isaac, ver FRAMEWORK_CONVERSION.md).
  const contenidoReal = `Hola ${nombre}! Soy Sofía, de Tu Préstamo 👋 Tu solicitud de refinanciamiento de tarjeta de crédito ya está aprobada y ya subiste algunos documentos. Te faltan ${cantidadTexto} para terminar tu evaluación y dejar atrás los intereses de tu tarjeta de crédito. ¿Cómo preferís terminar?`
  await logToBotCRM(numero, nombreCompleto, contenidoReal, wamid)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const limite = new Date(Date.now() - HORAS_ESPERA * 60 * 60 * 1000).toISOString()

    const { data: candidatos, error } = await supabaseAdmin
      .from('solicitudes')
      .select('id, nombre_completo, telefono, situacion_laboral')
      .eq('tipo_solicitud', 'prestatario')
      .in('estado', ESTADOS_ACTIVOS)
      .not('telefono', 'is', null)
      .or(`created_at.gte.${FECHA_CORTE},incluir_reactivacion_documentos_retroactiva.eq.true`)
      .is('reactivacion_documentos_enviada_at', null)

    if (error) throw error

    let enviados = 0
    let revisados = 0

    for (const s of candidatos ?? []) {
      if (!s.telefono) continue
      revisados++

      const { data: docs, error: docsError } = await supabaseAdmin
        .from('documentos')
        .select('tipo_documento, uploaded_at')
        .eq('solicitud_id', s.id)
        .eq('estado', 'subido')
        .neq('tipo_documento', 'autorizacion_infocred_preimpresa')

      if (docsError) { console.error('[send-reactivacion-documentos] error leyendo documentos de', s.id, docsError); continue }

      const subidos = docs ?? []
      if (subidos.length === 0) continue // no activo su cuenta todavia - no es este segmento

      const requeridos = getRequiredDocs(s.situacion_laboral)
      const subidosSet = new Set(subidos.map(d => d.tipo_documento))
      const faltantes = requeridos.filter(id => !subidosSet.has(id))
      if (faltantes.length === 0) continue // ya tiene todo

      const ultimaSubida = subidos.reduce((max, d) => {
        const t = new Date(d.uploaded_at).getTime()
        return t > max ? t : max
      }, 0)
      if (ultimaSubida > new Date(limite).getTime()) continue // todavia no pasaron las 6hs desde su ultima subida

      try {
        const ok = await enviarWhatsApp(s.telefono, s.nombre_completo || '', faltantes.length)
        if (ok) {
          await supabaseAdmin
            .from('solicitudes')
            .update({ reactivacion_documentos_enviada_at: new Date().toISOString() })
            .eq('id', s.id)
          enviados++
        }
      } catch (err) {
        console.error('[send-reactivacion-documentos] error con solicitud', s.id, err)
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados, revisados }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('send-reactivacion-documentos error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
