import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";

const PRICING = {
  A: { tasa_prestatario: 15, tasa_inversionista: 10, comision_originacion: 3 },
  B: { tasa_prestatario: 17, tasa_inversionista: 12, comision_originacion: 4 },
  C: { tasa_prestatario: 20, tasa_inversionista: 15, comision_originacion: 5 },
};

type DecisionPayload = {
  solicitud_id?: number;
  decision?: "Aprobado" | "Rechazado";
  motivo?: string;
  notas?: string;
  monto_bruto_aprobado?: number;
  perfil_riesgo?: string;
  plazo_meses?: number;
};

const resendKey = Deno.env.get("RESEND_API_KEY");
const resend = resendKey ? new Resend(resendKey) : null;

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
      .select("id, email, nombre_completo, user_id, plazo_meses, estado, monto_solicitado")
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

    if (decision === "Rechazado") {
      await Promise.all([
        supabase.from("solicitudes").update({ estado: "rechazado_final" }).eq("id", solicitud_id),
        supabase.from("perfiles_de_riesgo").update({ estado: "revisado_rechazado" }).eq("solicitud_id", solicitud_id),
        supabase.from("oportunidades").update({ estado: "descartada", motivo }).eq("solicitud_id", solicitud_id),
      ]);

      return new Response(JSON.stringify({ message: "Solicitud rechazada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aprobado
    const nuevoPlazo = plazo_meses || solicitud.plazo_meses || 24;
    const monto = monto_bruto_aprobado || solicitud.monto_solicitado || 0;
    const updateOportunidad: Record<string, unknown> = {
      estado: "borrador", // aún no visible a inversionistas
      monto,
      plazo_meses: nuevoPlazo,
    };
    if (pricing) {
      updateOportunidad.perfil_riesgo = perfilKey;
      updateOportunidad.tasa_interes_prestatario = pricing.tasa_prestatario;
      updateOportunidad.tasa_interes_anual = pricing.tasa_prestatario;
      updateOportunidad.tasa_rendimiento_inversionista = pricing.tasa_inversionista;
      updateOportunidad.comision_originacion_porcentaje = pricing.comision_originacion;
      updateOportunidad.comision_servicio_inversionista_porcentaje = 1;
      updateOportunidad.seguro_desgravamen_porcentaje = 0.5;
      updateOportunidad.comision_administracion_porcentaje = 0.1;
    }

    await Promise.all([
      supabase.from("solicitudes").update({ estado: "aprobado_para_oferta", monto_solicitado: monto, plazo_meses: nuevoPlazo }).eq("id", solicitud_id),
      supabase.from("perfiles_de_riesgo").update({ estado: "revisado_aprobado" }).eq("solicitud_id", solicitud_id),
      supabase.from("oportunidades").update(updateOportunidad).eq("solicitud_id", solicitud_id),
    ]);

    // Correo al prestatario si tenemos Resend
    if (resend && solicitud.email) {
      try {
        await resend.emails.send({
          from: "Tu Prestamo <contacto@tuprestamobo.com>",
          to: [solicitud.email],
          subject: "Tu propuesta de crédito está lista",
          html: `
            <h1>Hola ${solicitud.nombre_completo || ""}</h1>
            <p>Aprobamos tu solicitud. Ya tienes una propuesta lista en tu panel.</p>
            <ul>
              <li>Monto aprobado: Bs ${monto.toLocaleString("es-BO")}</li>
              <li>Plazo: ${nuevoPlazo} meses</li>
              <li>Tasa anual: ${pricing ? pricing.tasa_prestatario : "N/D"}%</li>
            </ul>
            <p>Ingresa a tu cuenta para aceptarla o rechazarla.</p>
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
