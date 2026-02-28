import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const BUCKET = 'contratos'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type InvestmentRow = {
  id: number
  opportunity_id: number
  investor_id: string
  amount: number
  status: string
  payment_intent_id: string | null
  created_at: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    // Guard: only admin/operaciones users can trigger contract generation.
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return json({ error: 'No autorizado' }, 401)

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !authData?.user?.id) return json({ error: 'No autorizado' }, 401)

    const { data: requester, error: requesterErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (requesterErr) throw requesterErr

    const role = String(requester?.role || '').toLowerCase()
    if (!['admin', 'operaciones', 'ops', 'admin_ops'].includes(role)) {
      return json({ error: 'Permisos insuficientes' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const paymentIntentId = body?.payment_intent_id as string | undefined
    const investmentId = body?.investment_id as number | undefined

    if (!paymentIntentId && !investmentId) {
      return json({ error: 'payment_intent_id o investment_id requerido' }, 400)
    }

    let query = supabaseAdmin
      .from('inversiones')
      .select('id, opportunity_id, investor_id, amount, status, payment_intent_id, created_at')
      .eq('status', 'pagado')
      .limit(100)

    if (paymentIntentId) query = query.eq('payment_intent_id', paymentIntentId)
    if (investmentId) query = query.eq('id', investmentId)

    const { data: investments, error: invErr } = await query
    if (invErr) throw invErr

    if (!investments?.length) {
      return json({ ok: true, generated: 0, message: 'No hay inversiones pagadas para generar contrato' })
    }

    const results: Array<{ investment_id: number; path: string | null; error?: string }> = []
    for (const inv of investments as InvestmentRow[]) {
      try {
        const path = await generateInvestorContract(inv)
        results.push({ investment_id: inv.id, path })
      } catch (e) {
        console.error('generate-investor-contract item error:', inv.id, e)
        results.push({ investment_id: inv.id, path: null, error: (e as Error).message })
      }
    }

    return json({ ok: true, generated: results.filter((r) => !!r.path).length, results })
  } catch (e) {
    console.error('generate-investor-contract error:', e)
    return json({ error: (e as Error).message || 'Error generando contratos de inversionista' }, 500)
  }
})

async function generateInvestorContract(inv: InvestmentRow): Promise<string> {
  const { data: opp, error: oppErr } = await supabaseAdmin
    .from('oportunidades')
    .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje, estado')
    .eq('id', inv.opportunity_id)
    .single()
  if (oppErr) throw oppErr

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, nombre_completo, email')
    .eq('id', inv.investor_id)
    .maybeSingle()

  const { data: disb } = await supabaseAdmin
    .from('desembolsos')
    .select('estado, paid_at')
    .eq('opportunity_id', inv.opportunity_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: nextBorrowerIntent } = await supabaseAdmin
    .from('borrower_payment_intents')
    .select('due_date')
    .eq('opportunity_id', inv.opportunity_id)
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const pdfBytes = await buildPdf(inv, opp || {}, profile || {}, disb || {}, nextBorrowerIntent || {})
  const path = `investor-contracts/opportunity-${inv.opportunity_id}/inversion_${inv.id}_${Date.now()}.pdf`
  const uploadRes = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, new Blob([pdfBytes], { type: 'application/pdf' }), { upsert: true })
  if (uploadRes.error) throw uploadRes.error

  const { error: updErr } = await supabaseAdmin
    .from('inversiones')
    .update({ investor_contract_url: path, investor_contract_generated_at: new Date().toISOString() })
    .eq('id', inv.id)
  if (updErr) throw updErr

  return path
}

async function buildPdf(
  inv: InvestmentRow,
  opp: Record<string, unknown>,
  profile: Record<string, unknown>,
  disb: Record<string, unknown>,
  nextBorrowerIntent: Record<string, unknown>,
) {
  const doc = await PDFDocument.create()
  const PAGE_WIDTH = 612
  const PAGE_HEIGHT = 792
  const MARGIN_X = 52
  const MARGIN_TOP = 50
  const MARGIN_BOTTOM = 50
  const width = PAGE_WIDTH - (MARGIN_X * 2)
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let y = PAGE_HEIGHT - MARGIN_TOP

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  const draw = (text: string, opts?: { b?: boolean; s?: number; c?: ReturnType<typeof rgb>; l?: number }) => {
    const size = opts?.s || 12
    const line = opts?.l || 16
    const used = opts?.b ? bold : font
    const color = opts?.c || rgb(0.05, 0.1, 0.14)
    const words = text.split(' ')
    let acc = ''
    const lines: string[] = []
    for (const w of words) {
      const next = acc ? `${acc} ${w}` : w
      if (used.widthOfTextAtSize(next, size) <= width) acc = next
      else {
        if (acc) lines.push(acc)
        acc = w
      }
    }
    if (acc) lines.push(acc)
    for (const ln of lines) {
      if (y - line < MARGIN_BOTTOM) newPage()
      page.drawText(ln, { x: MARGIN_X, y, size, font: used, color })
      y -= line
    }
  }

  // Optional logo from shared contract env var
  const logoUrl = Deno.env.get('CONTRACT_LOGO_URL')
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl)
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer())
        const contentType = res.headers.get('content-type') || ''
        const image = contentType.includes('png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
        const logoWidth = 120
        const scale = logoWidth / image.width
        const logoHeight = image.height * scale
        page.drawImage(image, {
          x: MARGIN_X,
          y: PAGE_HEIGHT - MARGIN_TOP + 8 - logoHeight,
          width: logoWidth,
          height: logoHeight,
        })
        y -= logoHeight + 8
      }
    } catch (_) {
      // Continue without logo if fetch/embed fails
    }
  }

  draw('Constancia de inversión y aceptación digital', { b: true, s: 16, c: rgb(0, 0.35, 0.4), l: 18 })
  draw(`Operación: ${opp.id || inv.opportunity_id} • Inversión: ${inv.id} • Fecha: ${new Date().toLocaleDateString('es-BO')}`, { s: 11, l: 13 })
  y -= 8

  draw('1) Datos del inversionista', { b: true, s: 13, c: rgb(0, 0.28, 0.35) })
  draw(`Nombre: ${String(profile.nombre_completo || 'N/D')}`)
  draw(`Email: ${String(profile.email || 'N/D')}`)
  draw(`ID inversionista: ${inv.investor_id}`)
  y -= 6

  draw('2) Datos de la inversión', { b: true, s: 13, c: rgb(0, 0.28, 0.35) })
  draw(`Monto invertido: Bs ${formatMoney(inv.amount)}`)
  draw(`Plazo: ${Number(opp.plazo_meses || 0)} meses`)
  draw(`Rendimiento anual bruto objetivo: ${Number(opp.tasa_rendimiento_inversionista || 0)}%`)
  draw(`Comisión servicio inversionista: ${Number(opp.comision_servicio_inversionista_porcentaje || 0)}% sobre cada pago`)
  draw(`Estado de la oportunidad: ${String(opp.estado || 'N/D')}`)
  y -= 6

  draw('3) Inicio de pagos y activación de retornos', { b: true, s: 13, c: rgb(0, 0.28, 0.35) })
  draw('La inversión no genera retornos mientras la oportunidad esté en fondeo.')
  draw('El cronograma de pagos al inversionista inicia únicamente cuando:')
  draw('• la oportunidad alcanza 100% del fondeo, y')
  draw('• Tu Préstamo registra el pago dirigido al banco acreedor (desembolso).')
  draw(`Fecha efectiva de activación: ${disb?.paid_at ? new Date(String(disb.paid_at)).toLocaleString('es-BO') : 'Se define al registrar el desembolso dirigido'}`)
  draw(`Primera cuota estimada: ${nextBorrowerIntent?.due_date ? new Date(String(nextBorrowerIntent.due_date)).toLocaleDateString('es-BO') : 'Se mostrará en tu panel al activarse el cronograma'}`)
  y -= 6

  draw('4) Alcance y condiciones', { b: true, s: 13, c: rgb(0, 0.28, 0.35) })
  draw('La presente constancia respalda que el inversionista registró y pagó su inversión en la oportunidad indicada.')
  draw('Los retornos dependen del pago efectivo del prestatario y del cronograma de la operación.')
  draw('No existe garantía estatal. Tu Préstamo actúa como plataforma de intermediación y administración operativa.')
  y -= 6

  draw('5) Aceptación y trazabilidad', { b: true, s: 13, c: rgb(0, 0.28, 0.35) })
  draw('La aceptación en plataforma constituye consentimiento electrónico de las condiciones de inversión y del flujo operativo.')
  draw(`Hash de control: inv-${inv.id}-${Date.now()}`)

  return await doc.save()
}

function formatMoney(v: number) {
  const num = Number(v || 0)
  return num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
