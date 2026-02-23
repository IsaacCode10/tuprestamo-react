import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

type ContractPayload = {
  opportunity?: {
    id?: number
    monto_bruto?: number
    monto_neto?: number
    plazo_meses?: number
    tasa_interes_prestatario?: number
    perfil_riesgo?: string
    comision_originacion_porcentaje?: number
    cargo_servicio_seguro_porcentaje?: number
    cuota_promedio?: number
  }
  borrower?: {
    nombre_completo?: string
    cedula_identidad?: string
    email?: string
    telefono?: string
    departamento?: string
  }
  funding?: {
    total_pagado?: number
    monto_objetivo?: number
    inversionistas?: Array<{ investor_id?: string; amount?: number; status?: string }>
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const BUCKET = 'contratos'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const { opportunity_id } = await req.json()
    if (!opportunity_id) {
      return json({ error: 'opportunity_id requerido' }, 400)
    }

    const { data: payload, error: payloadErr } = await supabaseAdmin
      .rpc('get_contract_payload', { p_opportunity_id: opportunity_id })
    if (payloadErr) throw payloadErr

    const contractPayload = (payload || {}) as ContractPayload
    const pdfBytes = await buildPdf(contractPayload)

    const path = `opportunity-${opportunity_id}/contrato_${Date.now()}.pdf`
    const uploadRes = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, new Blob([pdfBytes], { type: 'application/pdf' }), { upsert: true })
    if (uploadRes.error) throw uploadRes.error

    // Guarda referencia en tabla de desembolsos (si existe la fila)
    await supabaseAdmin
      .from('desembolsos')
      .update({ contract_url: path })
      .eq('opportunity_id', opportunity_id)

    const { data: signed } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 días

    return json({
      ok: true,
      path,
      signedUrl: signed?.signedUrl || null,
    })
  } catch (e) {
    console.error('generate-contract error:', e)
    return json({ error: (e as Error).message || 'Error generando contrato' }, 500)
  }
})

async function buildPdf(payload: ContractPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const PAGE_WIDTH = 612
  const PAGE_HEIGHT = 792 // Carta
  const MARGIN_X = 50
  const MARGIN_TOP = 60
  const MARGIN_BOTTOM = 50
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN_TOP

  const lineHeight = 14
  const smallLineHeight = 12

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN_BOTTOM) newPage()
  }

  const wrapText = (text: string, usedFont: typeof font, size: number) => {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word
      const width = usedFont.widthOfTextAtSize(next, size)
      if (width <= CONTENT_WIDTH) {
        current = next
      } else {
        if (current) lines.push(current)
        current = word
      }
    })
    if (current) lines.push(current)
    return lines
  }

  const drawText = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; leading?: number }) => {
    const size = opts?.size || 12
    const leading = opts?.leading || lineHeight
    const textColor = opts?.color || rgb(0.05, 0.1, 0.14)
    const usedFont = opts?.bold ? fontBold : font
    const lines = wrapText(text, usedFont, size)
    lines.forEach((line) => {
      ensureSpace(leading)
      page.drawText(line, { x: MARGIN_X, y, size, font: usedFont, color: textColor })
      y -= leading
    })
  }

  const drawBlock = (title: string, lines: string[]) => {
    ensureSpace(lineHeight * 2)
    drawText(title, { bold: true, size: 14, color: rgb(0, 0.28, 0.35) })
    lines.forEach((l) => drawText(l))
    y -= 6
  }

  const opp = payload.opportunity || {}
  const borrower = payload.borrower || {}
  const funding = payload.funding || {}
  const investors = Array.isArray(funding.inversionistas) ? funding.inversionistas : []

  // Logo opcional desde URL (configurable)
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
          y: PAGE_HEIGHT - MARGIN_TOP + 10 - logoHeight,
          width: logoWidth,
          height: logoHeight,
        })
        y -= logoHeight + 6
      }
    } catch (_) {
      // Si falla el logo, continuar sin bloquear el contrato
    }
  }

  drawText('Contrato de préstamo y mandato de pago dirigido', { bold: true, size: 16, color: rgb(0, 0.35, 0.4) })
  drawText(`Operación: ${opp.id ?? 'N/D'} • Fecha: ${new Date().toLocaleDateString('es-BO')}`, { size: 11, leading: smallLineHeight })
  y -= 8

  drawBlock('1) Partes y datos del préstamo', [
    `Prestatario: ${borrower.nombre_completo || 'N/D'} (${borrower.cedula_identidad || 'sin CI'})`,
    `Contacto: ${borrower.email || 'correo n/d'} • Tel: ${borrower.telefono || 'n/d'} • Dpto: ${borrower.departamento || 'n/d'}`,
    `Monto bruto aprobado: Bs ${formatMoney(opp.monto_bruto)}`,
    `Monto neto a pagar al banco acreedor: Bs ${formatMoney(opp.monto_neto)}`,
    `Plazo: ${opp.plazo_meses || 'n/d'} meses • Tasa prestatario: ${opp.tasa_interes_prestatario || 0}% • Perfil: ${opp.perfil_riesgo || 'n/d'}`,
    `Cuota mensual: Bs ${formatMoney(opp.cuota_promedio)}`,
  ])

  drawBlock('2) Fondeo por inversionistas', [
    `Meta de fondeo: Bs ${formatMoney(funding.monto_objetivo)}`,
    `Monto acreditado: Bs ${formatMoney(funding.total_pagado)}`,
    investors.length > 0
      ? 'Participaciones registradas al momento de emisión:'
      : 'Participaciones: se completará una vez publicada y fondeada la oportunidad.',
  ])

  investors.forEach((inv) => {
    const pct = funding.monto_objetivo
      ? ((Number(inv.amount || 0) / Number(funding.monto_objetivo || 1)) * 100).toFixed(2)
      : null
    drawText(`• ${inv.investor_id || 'inversionista'} – Bs ${formatMoney(inv.amount)} (${pct ? `${pct}%` : 'n/d'})`, {
      size: 11,
    })
  })
  y -= 4

  drawBlock('3) Mandato de pago dirigido', [
    'El prestatario otorga mandato expreso a Tu Préstamo para pagar el saldo de su tarjeta/crédito directamente al banco acreedor con los fondos fondeados.',
    'Este mandato aplica exclusivamente al pago dirigido de la presente operación y se mantiene vigente hasta su ejecución o extinción de la obligación.',
    'La publicación y ejecución del pago dirigido requieren validación de firma notariada y fondeo completo de la oportunidad.',
    'Al ejecutarse el pago dirigido, el préstamo se considera desembolsado y se activa el cronograma de cuotas.',
    'El comprobante del pago al banco formará parte de este contrato.',
  ])

  drawBlock('4) Cronograma y obligaciones', [
    'Se aplicará un cronograma de cuota fija mensual: capital + interés + cargo de administración/seguro según las condiciones aprobadas.',
    'Los pagos deben realizarse en las fechas de vencimiento publicadas en el panel del prestatario.',
    'Imputación de pagos: (i) cargos por mora, (ii) interés, (iii) administración/seguro, (iv) capital.',
    'En mora, podrán aplicarse cargos conforme a la política vigente publicada en Tu Préstamo.',
  ])

  drawBlock('5) Transparencia económica y riesgos', [
    'El prestatario declara conocer y aceptar: monto bruto, monto neto al banco, comisión de originación, cargo mensual de administración/seguro, plazo y cronograma.',
    'Costo de firma notariada: asumido por Tu Préstamo en esta operación (sin cargo adicional al prestatario).',
    'Inversionistas: los retornos dependen del pago del prestatario. No existe garantía estatal ni custodia de fondos.',
    'Prestatario: la tasa es fija, pero el impago puede afectar su historial crediticio y derivar en gestiones de cobranza.',
  ])

  drawBlock('6) Ley aplicable, jurisdicción y notificaciones', [
    'Este contrato se rige por la normativa vigente del Estado Plurinacional de Bolivia.',
    'Las partes señalan como domicilio contractual los datos declarados en plataforma y aceptan notificaciones por medios digitales registrados.',
    'Toda controversia será tratada conforme a la jurisdicción competente en Bolivia, según normativa aplicable.',
  ])

  drawBlock('7) Aceptación y control documental', [
    'La aceptación en plataforma constituye consentimiento electrónico; la firma notariada otorga formalidad para la ejecución operativa del pago dirigido.',
    `Hash de control: op-${opp.id || 'n/a'}-${Date.now()}`,
  ])

  return await doc.save()
}

function formatMoney(v?: number) {
  const num = Number(v || 0)
  return num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
