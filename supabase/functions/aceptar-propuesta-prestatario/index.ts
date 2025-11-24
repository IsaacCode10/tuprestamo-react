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
      .select("id, email, nombre_completo")
      .eq("id", solicitud_id)
      .single();
    if (solError || !solicitud) throw solError || new Error("Solicitud no encontrada");

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

    // Aceptar
    await Promise.all([
      supabase.from("solicitudes").update({ estado: "prestatario_acepto" }).eq("id", solicitud_id),
      supabase.from("oportunidades").update({ estado: "disponible" }).eq("solicitud_id", solicitud_id),
    ]);

    if (resend && solicitud.email) {
      try {
        await resend.emails.send({
          from: "Tu Prestamo <contacto@tuprestamobo.com>",
          to: [solicitud.email],
          subject: "Aceptaste tu propuesta de crédito",
          html: `
            <h1>¡Listo, ${solicitud.nombre_completo || ""}!</h1>
            <p>Publicamos tu oportunidad para fondeo. Te avisaremos cuando esté 100% financiada y procedamos a pagar tu deuda bancaria.</p>
          `,
        });
      } catch (e) {
        console.error("No se pudo enviar correo de aceptación:", e);
      }
    }

    return new Response(JSON.stringify({ message: "Propuesta aceptada y publicada a inversionistas" }), {
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
