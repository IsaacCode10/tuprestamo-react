import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

type AcceptPayload = {
  solicitud_id?: number;
  decision?: "Aceptar" | "Rechazar";
};

const resendKey = Deno.env.get("RESEND_API_KEY");
const resend = resendKey ? new Resend(resendKey) : null;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: AcceptPayload = await req.json();
    const { solicitud_id, decision = "Aceptar" } = body || {};
    if (!solicitud_id) {
      return new Response(JSON.stringify({ error: "solicitud_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: solicitud, error: solError } = await supabase
      .from("solicitudes")
      .select("id, email, nombre_completo, monto_solicitado, plazo_meses, tasa_interes_tc")
      .eq("id", solicitud_id)
      .single();
    if (solError || !solicitud) throw solError || new Error("Solicitud no encontrada");

    const { data: oportunidad, error: oppError } = await supabase
      .from("oportunidades")
      .select("id, monto, plazo_meses, tasa_interes_prestatario, comision_originacion_porcentaje")
      .eq("solicitud_id", solicitud_id)
      .maybeSingle();
    if (oppError) throw oppError;

    const neto = solicitud.monto_solicitado ?? 0;
    const comisionPct = Number(oportunidad?.comision_originacion_porcentaje) || 0;
    let brutoCalc = oportunidad?.monto ?? neto;

    // Regla de negocio: mínimo 450 hasta netos 10k; sobre 10k usar gross-up con comisión por perfil.
    if (neto > 0) {
      if (neto <= 10000) {
        brutoCalc = neto + 450;
      } else if (comisionPct > 0 && comisionPct < 100) {
        brutoCalc = neto / (1 - comisionPct / 100);
      }
    }

    const bruto = brutoCalc;
    const plazo = oportunidad?.plazo_meses ?? solicitud.plazo_meses ?? 24;
    const tasa = oportunidad?.tasa_interes_prestatario ?? solicitud.tasa_interes_tc ?? 0;
    const originacionPct = oportunidad?.comision_originacion_porcentaje ?? 0;

    if (decision === "Rechazar") {
      await Promise.all([
        supabase.from("solicitudes").update({ estado: "declinada_por_prestatario" }).eq("id", solicitud_id),
        supabase.from("oportunidades").update({ estado: "descartada", motivo: "Declinada por prestatario" }).eq("solicitud_id", solicitud_id),
      ]);
      return new Response(JSON.stringify({ message: "Propuesta rechazada por el prestatario" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!oportunidad?.id) {
      throw new Error("Oportunidad no encontrada para la solicitud");
    }

    // Aceptar: requerir contrato notariado antes de publicar
    await Promise.all([
      supabase.from("solicitudes").update({ estado: "pendiente_notariado" }).eq("id", solicitud_id),
      supabase.from("oportunidades").update({ estado: "pendiente_notariado", monto: brutoCalc }).eq("solicitud_id", solicitud_id),
    ]);

    // Asegurar fila de desembolso para contrato/notariado
    const { data: disb } = await supabase
      .from("desembolsos")
      .select("id, contract_url")
      .eq("opportunity_id", oportunidad.id)
      .maybeSingle();

    if (!disb) {
      await supabase.from("desembolsos").insert({
        opportunity_id: oportunidad.id,
        monto_bruto: brutoCalc,
        monto_neto: neto,
        estado: "pendiente",
      });
    }

    // Generar contrato PDF (best-effort)
    try {
      const fnUrl = `${supabaseUrl}/functions/v1/generate-contract`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opportunity_id: oportunidad.id }),
      });
    } catch (e) {
      console.error("No se pudo generar contrato automáticamente:", e);
    }

    if (resend && solicitud.email) {
      try {
        const appUrl = (Deno.env.get("APP_BASE_URL") || "https://www.tuprestamobo.com") + "/borrower-dashboard";
        await resend.emails.send({
          from: "Tu Préstamo <contacto@tuprestamobo.com>",
          to: [solicitud.email],
          subject: "Firma notariada pendiente",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu Préstamo</title>
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
            <td style="padding:20px 20px 8px 20px;">
              <h1 style="margin:0;font-size:22px;color:#00445A;font-weight:700;font-family: Montserrat, Arial, sans-serif;">¡Gracias, ${solicitud.nombre_completo || "cliente"}!</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">Recibimos tu aceptación. Antes de publicar tu oportunidad necesitamos la firma notariada del contrato.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 8px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;border:1px solid #e9ecef;border-radius:10px;padding:14px;">
                <tr>
                  <td style="font-size:15px;line-height:1.6;color:#222;">
                    <strong>Monto aprobado (bruto):</strong> Bs ${Number(bruto || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                    <strong>Monto a pagar a tu banco (neto):</strong> Bs ${Number(neto || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                    <strong>Costo de firma notariada:</strong> Incluido por Tu Préstamo (sin cargo adicional para ti)<br/>
                    <strong>Tasa anual:</strong> ${tasa}%<br/>
                    <strong>Plazo:</strong> ${plazo} meses<br/>
                    <span style="color:#00445A;">En tu panel podrás descargar el contrato y agendar la firma notariada.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 20px 24px 20px;">
              <a href="${appUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background:#26C2B2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:6px;">Ir a mi panel</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;font-size:13px;line-height:1.5;color:#555;border-top:1px solid #e9ecef;">
              <p style="margin:12px 0 4px 0;">¿Necesitas ayuda? Escríbenos a <a href="mailto:soporte@tuprestamobo.com" style="color:#00445A;text-decoration:none;">soporte@tuprestamobo.com</a>.</p>
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
        console.error("No se pudo enviar correo de aceptación:", e);
      }
    }

    return new Response(JSON.stringify({ message: "Propuesta aceptada. Pendiente de firma notariada antes de publicar." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en aceptar-propuesta-prestatario:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
