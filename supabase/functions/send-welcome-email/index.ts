import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { renderEmail } from '../_shared/email.ts'

console.log("Function send-welcome-email starting up.");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables.");
}

const OPORTUNIDADES_URL = "https://tuprestamobo.com/oportunidades";

const handler = async (_req: Request): Promise<Response> => {
  if (_req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { record } = await _req.json();
    const { email, nombre_completo, tipo_solicitud } = record;

    if (!email || !nombre_completo || !tipo_solicitud) {
      return new Response("Missing required fields: email, nombre_completo, tipo_solicitud", { status: 400 });
    }

    let subject = "";
    let htmlBody = "";

    if (tipo_solicitud === "inversionista") {
      subject = "Gracias por tu interes en Tu Prestamo Bolivia";
      htmlBody = renderEmail({
        greetingName: nombre_completo,
        title: 'Bienvenido(a) a Tu Prestamo',
        intro: 'Gracias por registrarte como inversionista. Estamos para ayudarte en cada paso.',
        ctaLabel: 'Ver oportunidades',
        ctaHref: OPORTUNIDADES_URL,
      })
    } else if (tipo_solicitud === "prestatario") {
      subject = "Hemos recibido tu solicitud de prestamo";
      htmlBody = renderEmail({
        greetingName: nombre_completo,
        title: 'Solicitud recibida',
        body: 'Nuestro equipo la revisara y te contactara con los siguientes pasos.',
      })
    } else {
      return new Response("Invalid request type", { status: 400 });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tu Prestamo Bolivia <contacto@tuprestamobo.com>",
        to: [email],
        subject: subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();
    return new Response(JSON.stringify(resendData), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: resendResponse.status,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
};

serve(handler);
