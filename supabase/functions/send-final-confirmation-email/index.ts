import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function send-final-confirmation-email starting up.");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables.");
}

const LOGO_URL = "https://tuprestamobo.com/Logo-Tu-Prestamo.png";
// Asegúrate de tener esta variable en tu configuración de Supabase
const APP_DASHBOARD_URL = Deno.env.get("APP_BASE_URL") ? `${Deno.env.get("APP_BASE_URL")}/borrower-dashboard` : "https://tuprestamobo.com/borrower-dashboard";


const handler = async (_req: Request): Promise<Response> => {
  console.log("Handler invoked for send-final-confirmation-email.");

  if (_req.method !== "POST") {
    console.log(`Method ${_req.method} not allowed.`);
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    console.log("Parsing request body...");
    const { email, nombre_completo } = await _req.json();
    console.log("Request body parsed:", { email, nombre_completo });

    if (!email) {
      console.error("Missing required field: email");
      return new Response("Missing required field: email", { status: 400 });
    }

    // Fallback logic for a more personal display name
    let displayName = nombre_completo;
    if (!displayName || displayName.trim() === '' || displayName.includes('@')) {
      const namePart = email.split('@')[0];
      displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    const subject = "¡Gracias! Hemos recibido tus documentos";
    const htmlBody = `
      <div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
        <img src=\"${LOGO_URL}\" alt=\"Logo Tu Préstamo Bolivia\" style=\"width: 150px; margin-bottom: 20px;\">
        <h2 style=\"color: #333;\">¡Hola ${displayName}!</h2>
        <p>Hemos recibido y confirmado la carga de todos tus documentos en la plataforma de <strong>Tu Préstamo Bolivia</strong>.</p>
        <p>Nuestro equipo de analistas de riesgo comenzará la revisión final. Te notificaremos sobre la decisión de tu crédito en los próximos días.</p>
        <p>Puedes revisar el estado de tu solicitud en cualquier momento desde tu panel de control:</p>
        <p style=\"margin-top: 30px; margin-bottom: 30px;\">
          <a href=\"${APP_DASHBOARD_URL}\" style=\"background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;\">IR A MI PANEL DE CONTROL</a>
        </p>
        <p>Atentamente,<br>El equipo de Tu Préstamo Bolivia</p>
      </div>
    `;

    console.log(`Sending email to ${email} with subject: ${subject}`);
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tu Préstamo Bolivia <contacto@tuprestamobo.com>",
        to: [email],
        subject: subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resend API response:", resendData);

    if (!resendResponse.ok) {
      throw new Error(JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({ message: "Email sent successfully", data: resendData }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });

  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
};

serve(handler);
