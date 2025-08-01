import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function send-welcome-email starting up.");

// Obtén la clave de API de Resend desde las variables de entorno de Supabase
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables.");
}

// URL del logo (reemplazar con la URL de tu logo)
const LOGO_URL = "https://tuprestamobo.com/Logo-Tu-Prestamo.png";

// URL de la página de oportunidades (reemplazar con tu URL)
const OPORTUNIDADES_URL = "https://tuprestamobo.com/oportunidades";

const handler = async (_req: Request): Promise<Response> => {
  console.log("Handler invoked.");

  // Si el método no es POST, devuelve un error
  if (_req.method !== "POST") {
    console.log(`Method ${_req.method} not allowed.`);
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    console.log("Parsing request body...");
    const { record } = await _req.json();
    console.log("Request body parsed:", { record });

    // --- CORRECCIÓN CLAVE ---
    // Usamos 'nombre_completo' en lugar de 'nombre' para que coincida con la tabla.
    const { email, nombre_completo, tipo_solicitud } = record;

    if (!email || !nombre_completo || !tipo_solicitud) {
      console.error("Missing required fields in record:", { record });
      return new Response("Missing required fields: email, nombre_completo, tipo_solicitud", { status: 400 });
    }
    console.log("Extracted data:", { email, nombre_completo, tipo_solicitud });

    // Define el asunto y el cuerpo del correo según el tipo de solicitud
    let subject = "";
    let htmlBody = "";

    if (tipo_solicitud === "inversionista") {
      console.log("Building email for 'inversionista'.");
      subject = "¡Gracias por tu interés en Tu Préstamo Bolivia!";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <img src="${LOGO_URL}" alt="Logo Tu Préstamo Bolivia" style="width: 150px; margin-bottom: 20px;">
          <h2 style="color: #333;">¡Hola ${nombre_completo}!</h2>
          <p>Gracias por registrarte como inversionista en <strong>Tu Préstamo Bolivia</strong>.</p>
          <p>Hemos recibido tus datos y nuestro equipo se pondrá en contacto contigo pronto para guiarte en los siguientes pasos.</p>
          <p>Mientras tanto, puedes ver las oportunidades de inversión activas en nuestro sitio web:</p>
          <p><a href="${OPORTUNIDADES_URL}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Oportunidades</a></p>
          <p>Atentamente,<br>El equipo de Tu Préstamo Bolivia</p>
        </div>
      `;
    } else if (tipo_solicitud === "prestatario") {
      console.log("Building email for 'prestatario'.");
      subject = "Hemos recibido tu solicitud de préstamo";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <img src="${LOGO_URL}" alt="Logo Tu Préstamo Bolivia" style="width: 150px; margin-bottom: 20px;">
          <h2 style="color: #333;">¡Hola ${nombre_completo}!</h2>
          <p>Hemos recibido tu solicitud de préstamo en <strong>Tu Préstamo Bolivia</strong>.</p>
          <p>Nuestro equipo la revisará y se pondrá en contacto contigo pronto para informarte sobre los siguientes pasos.</p>
          <p>Atentamente,<br>El equipo de Tu Préstamo Bolivia</p>
        </div>
      `;
    } else {
      console.error(`Invalid request type: ${tipo_solicitud}`);
      return new Response("Invalid request type", { status: 400 });
    }

    console.log(`Sending email to ${email} with subject: ${subject}`);
    // Envía el correo usando la API de Resend
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

    // Devuelve la respuesta de Resend
    return new Response(JSON.stringify(resendData), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: resendResponse.status,
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
};

// Inicia el servidor de la Edge Function
serve(handler);
