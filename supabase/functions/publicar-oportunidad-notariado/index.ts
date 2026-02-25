import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

type PublishPayload = {
  opportunity_id?: number;
};

const resendKey = Deno.env.get("RESEND_API_KEY");
const resend = resendKey ? new Resend(resendKey) : null;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: PublishPayload = await req.json();
    const { opportunity_id } = body || {};
    if (!opportunity_id) {
      return new Response(JSON.stringify({ error: "opportunity_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: disb, error: disbErr } = await supabase
      .from("desembolsos")
      .select("id, notariado_ok")
      .eq("opportunity_id", opportunity_id)
      .maybeSingle();
    if (disbErr) throw disbErr;
    if (!disb?.notariado_ok) {
      return new Response(JSON.stringify({ error: "Contrato notariado pendiente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: opp, error: oppErr } = await supabase
      .from("oportunidades")
      .select("id, estado, solicitud_id, monto, plazo_meses, tasa_interes_prestatario")
      .eq("id", opportunity_id)
      .single();
    if (oppErr || !opp) throw oppErr || new Error("Oportunidad no encontrada");

    if ((opp.estado || "").toLowerCase() === "disponible") {
      return new Response(JSON.stringify({ message: "La oportunidad ya está publicada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: solicitud, error: solErr } = await supabase
      .from("solicitudes")
      .select("id, email, nombre_completo, monto_solicitado, plazo_meses, tasa_interes_tc")
      .eq("id", opp.solicitud_id)
      .single();
    if (solErr || !solicitud) throw solErr || new Error("Solicitud no encontrada");

    await Promise.all([
      supabase.from("oportunidades").update({ estado: "disponible" }).eq("id", opportunity_id),
      supabase.from("solicitudes").update({ estado: "prestatario_acepto" }).eq("id", solicitud.id),
    ]);

    if (resend && solicitud.email) {
      try {
        const appUrl = (Deno.env.get("APP_BASE_URL") || "https://www.tuprestamobo.com") + "/borrower-dashboard";
        const montoBruto = Number(opp.monto || solicitud.monto_solicitado || 0);
        const montoNeto = Number(solicitud.monto_solicitado || 0);
        const plazo = opp.plazo_meses ?? solicitud.plazo_meses ?? 24;
        const tasa = opp.tasa_interes_prestatario ?? solicitud.tasa_interes_tc ?? 0;
        await resend.emails.send({
          from: "Tu Préstamo <contacto@tuprestamobo.com>",
          to: [solicitud.email],
          subject: "Publicamos tu oportunidad para fondeo",
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
              <h1 style="margin:0;font-size:22px;color:#00445A;font-weight:700;font-family: Montserrat, Arial, sans-serif;">¡Listo, ${solicitud.nombre_completo || "cliente"}!</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">Publicamos tu oportunidad para fondeo. Te avisaremos cuando esté financiada y paguemos tu tarjeta directamente en tu banco acreedor.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 8px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;border:1px solid #e9ecef;border-radius:10px;padding:14px;">
                <tr>
                  <td style="font-size:15px;line-height:1.6;color:#222;">
                    <strong>Monto aprobado (bruto):</strong> Bs ${montoBruto.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                    <strong>Monto a pagar a tu banco (neto):</strong> Bs ${montoNeto.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                    <strong>Tasa anual:</strong> ${tasa}%<br/>
                    <strong>Plazo:</strong> ${plazo} meses<br/>
                    <span style="color:#00445A;">Puedes ver tu tabla de amortización y el detalle completo en tu panel.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 20px 24px 20px;">
              <a href="${appUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background:#26C2B2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:6px;">IR A MI PANEL</a>
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
        console.error("No se pudo enviar correo de publicacion:", e);
      }
    }

    return new Response(JSON.stringify({ message: "Oportunidad publicada" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en publicar-oportunidad-notariado:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
