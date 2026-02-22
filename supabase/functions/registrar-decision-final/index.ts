import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

const PRICING = {
  A: { tasa_prestatario: 15, tasa_inversionista: 10, comision_originacion: 3 },
  B: { tasa_prestatario: 17, tasa_inversionista: 12, comision_originacion: 4 },
  C: { tasa_prestatario: 20, tasa_inversionista: 15, comision_originacion: 5 },
};
const COSTO_NOTARIADO_MVP = 150;

const calcApprovedOfferCosts = (montoBruto: number, netoVerificado: number | null, tasaAnualPct: number, plazoMeses: number) => {
  const principal = Number(montoBruto) || 0;
  const neto = Number(netoVerificado) || 0;
  const n = Number(plazoMeses) || 0;
  const tasaAnual = Number(tasaAnualPct) || 0;

  if (principal <= 0 || n <= 0) {
    return {
      interesTotal: 0,
      servicioSeguroTotal: 0,
      costoTotalCredito: 0,
      cuotaPromedio: null as number | null,
    };
  }

  const monthlyRate = tasaAnual / 100 / 12;
  const serviceFeeRate = 0.0015;
  const minServiceFee = 10;

  const pmt = monthlyRate > 0
    ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
    : (principal / n);

  let balance = principal;
  let totalInterest = 0;
  let totalServiceFee = 0;

  if (!isFinite(pmt)) {
    const principalPayment = principal / n;
    for (let i = 0; i < n; i++) {
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const interestPayment = balance * monthlyRate;
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      const principalPayment = pmt - interestPayment;
      totalInterest += interestPayment;
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  }

  const originacionMonto = Math.max(0, principal - neto);
  const costoTotalCredito = originacionMonto + totalInterest + totalServiceFee;
  const avgServiceFee = n > 0 ? totalServiceFee / n : 0;
  const cuotaPromedio = (isFinite(pmt) ? pmt : 0) + avgServiceFee;

  return {
    interesTotal: Number(totalInterest.toFixed(2)),
    servicioSeguroTotal: Number(totalServiceFee.toFixed(2)),
    costoTotalCredito: Number(costoTotalCredito.toFixed(2)),
    cuotaPromedio: Number(cuotaPromedio.toFixed(2)),
  };
};

type DecisionPayload = {
  solicitud_id?: number;
  decision?: "Aprobado" | "Rechazado";
  motivo?: string;
  notas?: string;
  monto_bruto_aprobado?: number;
  saldo_deudor_verificado?: number;
  perfil_riesgo?: string;
  plazo_meses?: number;
};

const resendKey = Deno.env.get("RESEND_API_KEY");
const resend = resendKey ? new Resend(resendKey) : null;

const getRequiredDocs = (situacionLaboral?: string | null): string[] => {
  const baseDocs = [
    "ci_anverso",
    "ci_reverso",
    "boleta_aviso_electricidad",
    "extracto_tarjeta",
    "selfie_ci",
    "autorizacion_infocred_firmada",
  ];
  const situacionDocs: Record<string, string[]> = {
    Dependiente: ["boleta_pago", "certificado_gestora"],
    Independiente: ["extracto_bancario_m1", "extracto_bancario_m2", "extracto_bancario_m3"],
    Jubilado: ["boleta_jubilacion"],
  };
  return [...baseDocs, ...(situacionDocs[situacionLaboral || ""] || [])];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: DecisionPayload = await req.json();
    const {
      solicitud_id,
      decision,
      motivo = null,
      notas = null,
      monto_bruto_aprobado = null,
      saldo_deudor_verificado = null,
      perfil_riesgo,
      plazo_meses,
    } = body || {};

    if (!solicitud_id || !decision) {
      return new Response(JSON.stringify({ error: "solicitud_id y decision son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Intentar identificar al analista desde el token del frontend
    let analistaId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader && anonKey) {
      try {
        const supabaseAuth = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
        if (!userError && userData?.user) {
          analistaId = userData.user.id;
        }
      } catch (e) {
        console.warn("No se pudo obtener analista desde el token:", e);
      }
    }
    if (!analistaId) {
      return new Response(JSON.stringify({ error: "No se pudo identificar al analista (token faltante o inválido)." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Traer solicitud y perfil de riesgo
    const { data: solicitud, error: solError } = await supabase
      .from("solicitudes")
      .select("id, email, nombre_completo, user_id, plazo_meses, estado, monto_solicitado, situacion_laboral")
      .eq("id", solicitud_id)
      .single();
    if (solError || !solicitud) throw solError || new Error("Solicitud no encontrada");

    const { data: perfilRow, error: perfilError } = await supabase
      .from("perfiles_de_riesgo")
      .select("id")
      .eq("solicitud_id", solicitud_id)
      .maybeSingle();
    if (perfilError) throw perfilError;

    const perfilDeRiesgoId = perfilRow?.id;

    // Insertar decisión en la tabla oficial si tenemos perfil
    if (perfilDeRiesgoId) {
      let razonesValue: string[] = [];
      if (decision === "Aprobado") {
        if (Array.isArray(motivo)) {
          razonesValue = motivo.map(String);
        } else if (typeof motivo === "string" && motivo.trim()) {
          // si vino como string JSON, intentar parsear
          try {
            const parsed = JSON.parse(motivo);
            if (Array.isArray(parsed)) razonesValue = parsed.map(String);
          } catch (_) {
            razonesValue = [motivo];
          }
        }
      } else {
        if (typeof motivo === "string" && motivo.trim()) razonesValue = [motivo];
      }

      const { error: decisionError } = await supabase.from("decisiones_de_riesgo").insert({
        perfil_riesgo_id: perfilDeRiesgoId,
        decision,
        razones: razonesValue,
        comentarios: notas,
        analista_id: analistaId,
      });
      if (decisionError) throw decisionError;
    }

    const perfilKey = (perfil_riesgo || "").toUpperCase();
    const pricing = PRICING[perfilKey as keyof typeof PRICING];
    const comisionPct = pricing?.comision_originacion ?? 0;
    const netoVerificado = Number(saldo_deudor_verificado) > 0 ? Number(saldo_deudor_verificado) : null;

    if (decision === "Aprobado") {
      const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);
      const { data: uploadedDocs, error: docsError } = await supabase
        .from("documentos")
        .select("tipo_documento, estado")
        .eq("solicitud_id", solicitud_id)
        .eq("estado", "subido");
      if (docsError) throw docsError;

      const uploadedSet = new Set((uploadedDocs || []).map((d: any) => String(d.tipo_documento || "")));
      const hasDomicilio = uploadedSet.has("boleta_aviso_electricidad") || uploadedSet.has("factura_servicio");
      const missing = requiredDocs.filter((docId) => {
        if (docId === "boleta_aviso_electricidad") return !hasDomicilio;
        return !uploadedSet.has(docId);
      });
      if (missing.length > 0) {
        return new Response(JSON.stringify({ error: `No se puede aprobar. Faltan documentos: ${missing.join(", ")}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const brutoCalculado = (() => {
      if (!netoVerificado) return null;
      if (netoVerificado <= 10000) return netoVerificado + 450; // mínimo aplicado
      if (comisionPct >= 0 && comisionPct < 100) return netoVerificado / (1 - comisionPct / 100);
      return null;
    })();

    if (decision === "Rechazado") {
      const { error: rejectStateError } = await supabase.rpc("apply_risk_decision_state", {
        p_solicitud_id: solicitud_id,
        p_decision: "Rechazado",
        p_motivo: motivo,
      });
      if (rejectStateError) throw rejectStateError;

      if (resend && solicitud.email) {
        try {
          const appUrl = (Deno.env.get("APP_BASE_URL") || "https://www.tuprestamobo.com") + "/borrower-dashboard";
          const nombre = solicitud.nombre_completo || "cliente";
          await resend.emails.send({
            from: "Tu PrÃ©stamo <contacto@tuprestamobo.com>",
            to: [solicitud.email],
            subject: "Tu solicitud no fue aprobada en esta ocasiÃ³n",
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu PrÃ©stamo</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family: Arial, Helvetica, sans-serif;color:#222;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#00445A;padding:18px 20px;">
              <img src="https://www.tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Tu PrÃ©stamo" style="height:38px;display:block;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 8px 20px;">
              <h1 style="margin:0;font-size:22px;color:#00445A;font-weight:700;font-family: Montserrat, Arial, sans-serif;">Hola, ${nombre}</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">Revisamos tu informaciÃ³n con detalle y por el momento no podemos aprobar tu crÃ©dito.</p>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">PodrÃ¡s volver a postular cuando tu situaciÃ³n financiera mejore. Queremos acompaÃ±arte en el proceso.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 20px 24px 20px;">
              <a href="${appUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background:#26C2B2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:6px;">Ir a mi panel</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;font-size:13px;line-height:1.5;color:#555;border-top:1px solid #e9ecef;">
              <p style="margin:12px 0 4px 0;">Â¿Necesitas ayuda? EscrÃ­benos a <a href="mailto:soporte@tuprestamobo.com" style="color:#00445A;text-decoration:none;">soporte@tuprestamobo.com</a>.</p>
              <p style="margin:0;color:#777;">Este es un correo automÃ¡tico. Por favor no respondas a esta direcciÃ³n.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
          });
        } catch (e) {
          console.error("No se pudo enviar correo de rechazo:", e);
        }
      }

      return new Response(JSON.stringify({ message: "Solicitud rechazada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aprobado
    const nuevoPlazo = plazo_meses || solicitud.plazo_meses || 24;
    const montoBase = brutoCalculado ?? (monto_bruto_aprobado || solicitud.monto_solicitado || 0);
    const monto = Number.isFinite(montoBase) ? montoBase : 0;
    const originacionBruta = Math.max(0, Number(monto || 0) - Number(netoVerificado || 0));
    const costoNotariado = originacionBruta > 0 ? COSTO_NOTARIADO_MVP : 0;
    const originacionNeta = Math.max(0, originacionBruta - costoNotariado);
    const costos = calcApprovedOfferCosts(monto, netoVerificado, pricing?.tasa_prestatario || 0, nuevoPlazo);
    const cuotaPromedio = costos.cuotaPromedio;
    const updateOportunidad: Record<string, unknown> = {
      estado: "borrador", // se quedará borrador hasta aceptación del prestatario
      monto,
      plazo_meses: nuevoPlazo,
      saldo_deudor_verificado: netoVerificado ?? monto,
      cuota_promedio: cuotaPromedio,
      interes_total: costos.interesTotal,
      comision_servicio_seguro_total: costos.servicioSeguroTotal,
      costo_total_credito: costos.costoTotalCredito,
      originacion_bruta: originacionBruta,
      costo_notariado: costoNotariado,
      originacion_neta: originacionNeta,
      notariado_absorbido: true,
    };
    if (pricing) {
      updateOportunidad.perfil_riesgo = perfilKey;
      updateOportunidad.tasa_interes_prestatario = pricing.tasa_prestatario;
      updateOportunidad.tasa_interes_anual = pricing.tasa_prestatario;
      updateOportunidad.tasa_rendimiento_inversionista = pricing.tasa_inversionista;
      updateOportunidad.comision_originacion_porcentaje = pricing.comision_originacion;
      updateOportunidad.comision_servicio_inversionista_porcentaje = 1;
      updateOportunidad.cargo_servicio_seguro_porcentaje = 0.15;
    }

    const { error: approveStateError } = await supabase.rpc("apply_risk_decision_state", {
      p_solicitud_id: solicitud_id,
      p_decision: "Aprobado",
      p_motivo: null,
      p_neto_verificado: netoVerificado,
      p_monto_bruto: monto,
      p_plazo_meses: nuevoPlazo,
      p_cuota_promedio: cuotaPromedio,
      p_perfil_riesgo: updateOportunidad.perfil_riesgo ?? null,
      p_tasa_interes_prestatario: updateOportunidad.tasa_interes_prestatario ?? null,
      p_tasa_interes_anual: updateOportunidad.tasa_interes_anual ?? null,
      p_tasa_rendimiento_inversionista: updateOportunidad.tasa_rendimiento_inversionista ?? null,
      p_comision_originacion_porcentaje: updateOportunidad.comision_originacion_porcentaje ?? null,
      p_comision_servicio_inversionista_porcentaje: updateOportunidad.comision_servicio_inversionista_porcentaje ?? null,
      p_cargo_servicio_seguro_porcentaje: updateOportunidad.cargo_servicio_seguro_porcentaje ?? null,
      p_interes_total: updateOportunidad.interes_total ?? null,
      p_comision_servicio_seguro_total: updateOportunidad.comision_servicio_seguro_total ?? null,
      p_costo_total_credito: updateOportunidad.costo_total_credito ?? null,
      p_originacion_bruta: updateOportunidad.originacion_bruta ?? null,
      p_costo_notariado: updateOportunidad.costo_notariado ?? null,
      p_originacion_neta: updateOportunidad.originacion_neta ?? null,
      p_notariado_absorbido: updateOportunidad.notariado_absorbido ?? null,
    });
    if (approveStateError) throw approveStateError;

    // Correo al prestatario si tenemos Resend
    if (resend && solicitud.email) {
      try {
        const nombre = solicitud.nombre_completo || "cliente";
        const titulo = `${nombre}, tu propuesta de crédito está lista`;
        const buttonUrl = (Deno.env.get("APP_BASE_URL") || "https://www.tuprestamobo.com") + "/borrower-dashboard";
        const montoFmt = Number(monto || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const netoFmt = Number(netoVerificado || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const originacionMonto = Math.max(0, Number(monto || 0) - Number(netoVerificado || 0));
        const originacionMontoFmt = originacionMonto.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const originacionPct = pricing?.comision_originacion ?? null;
        const shouldShowOriginacionPct = Number(netoVerificado || 0) > 10000 && originacionPct != null;
        const tasa = pricing ? pricing.tasa_prestatario : "N/D";
        await resend.emails.send({
          from: "Tu Préstamo <contacto@tuprestamobo.com>",
          to: [solicitud.email],
          subject: titulo,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family: Arial, Helvetica, sans-serif;color:#222;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#00445A;padding:18px 20px;">
              <img src="https://www.tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Tu Préstamo" style="height:38px;display:block;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 8px 20px;">
              <h1 style="margin:0;font-size:22px;color:#00445A;font-weight:700;font-family: Montserrat, Arial, sans-serif;">${nombre}, tu propuesta está lista</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">Aprobamos tu solicitud. Revisa y acepta tu propuesta de crédito en tu panel.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 8px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;border:1px solid #e9ecef;border-radius:10px;padding:14px;">
                <tr>
                  <td style="font-size:15px;line-height:1.6;color:#222;">
                    <strong>Monto aprobado:</strong> Bs ${montoFmt}<br/>
                    <strong>Saldo deudor verificado (neto al banco):</strong> Bs ${netoFmt}<br/>
                    <strong>Comisión de originación:</strong> Bs ${originacionMontoFmt}${shouldShowOriginacionPct ? ` (${originacionPct}%)` : ''}<br/>
                    <strong>Costo de firma notariada:</strong> Incluido por Tu Préstamo (sin cargo adicional para ti)<br/>
                    <strong>Cargo mensual de servicio y seguro:</strong> 0.15% sobre saldo (mínimo Bs 10 por mes)<br/>
                    <strong>Plazo:</strong> ${nuevoPlazo} meses<br/>
                    <strong>Tasa anual:</strong> ${tasa}%<br/>
                    <span style="color:#00445A;">El desembolso se hará directo a tu banco acreedor.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 20px 24px 20px;">
              <a href="${buttonUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background:#26C2B2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:6px;">Ir a mi propuesta</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;font-size:13px;line-height:1.5;color:#555;border-top:1px solid #e9ecef;">
              <p style="margin:12px 0 4px 0;">Verás el detalle completo y cronograma en tu panel antes de aceptar la propuesta.</p>
              <p style="margin:0 0 4px 0;">¿Necesitas ayuda? Escríbenos a <a href="mailto:contacto@tuprestamobo.com" style="color:#00445A;text-decoration:none;">contacto@tuprestamobo.com</a>.</p>
              <p style="margin:0;color:#777;">Este es un correo automático. Por favor no respondas a esta dirección.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `,
        });
      } catch (e) {
        console.error("No se pudo enviar correo de propuesta:", e);
      }
    }

    return new Response(JSON.stringify({ message: "Solicitud aprobada, propuesta lista" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en registrar-decision-final:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
