import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

// Esta función replica la lógica del frontend para saber qué documentos son requeridos
const getRequiredDocs = (situacionLaboral: string): string[] => {
  const baseDocs = [
    'ci_anverso',
    'ci_reverso',
    'factura_servicio',
    'extracto_tarjeta',
    'selfie_ci',
  ];
  const situacionDocs: { [key: string]: string[] } = {
    'Dependiente': ['boleta_pago', 'certificado_gestora'],
    'Independiente': ['extracto_bancario_m1', 'extracto_bancario_m2', 'extracto_bancario_m3'], // NIT es opcional, no se incluye aquí
    'Jubilado': ['boleta_jubilacion'],
  };
  return [...baseDocs, ...(situacionDocs[situacionLaboral] || [])];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { solicitud_id } = await req.json();
    if (!solicitud_id) {
      throw new Error("Falta solicitud_id en el cuerpo de la solicitud.");
    }

    // Se usa el SERVICE_ROLE_KEY para tener permisos de escritura en la tabla 'solicitudes'
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    // 1. Obtener la solicitud y verificar su estado actual para evitar trabajo duplicado.
    const { data: solicitud, error: solError } = await supabaseAdmin
      .from('solicitudes')
      .select('id, estado, situacion_laboral, user_id, user:user_id(email, raw_user_meta_data)')
      .eq('id', solicitud_id)
      .single();

    if (solError) throw solError;
    if (!solicitud) {
      return new Response(JSON.stringify({ message: "Solicitud no encontrada." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Si el estado ya avanzó, no se hace nada más.
    if (solicitud.estado !== 'pre-aprobado') {
      return new Response(JSON.stringify({ message: `La solicitud ya tiene el estado '${solicitud.estado}'. No se requiere acción.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Determinar documentos requeridos y los que ya se subieron
    const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);
    const { data: uploadedDocs, error: docsError } = await supabaseAdmin
      .from('documentos')
      .select('tipo_documento')
      .eq('solicitud_id', solicitud_id)
      .eq('estado', 'subido');

    if (docsError) throw docsError;

    const uploadedDocTypes = uploadedDocs.map(doc => doc.tipo_documento);
    const allDocsUploaded = requiredDocs.every(docId => uploadedDocTypes.includes(docId));

    // 3. Si aún faltan documentos, terminar la ejecución silenciosamente.
    if (!allDocsUploaded) {
      return new Response(JSON.stringify({ message: "Aún faltan documentos por subir." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. ¡ÉXITO! Todos los documentos están. Actualizar estado e invocar el correo.
    console.log(`Todos los docs para solicitud ${solicitud_id} subidos. Actualizando estado y enviando correo.`);

    const { error: updateError } = await supabaseAdmin
      .from('solicitudes')
      .update({ estado: 'documentos-en-revision' })
      .eq('id', solicitud_id);

    if (updateError) throw updateError;

    // Invocar la función de envío de correo que ya modificamos
    const { error: functionError } = await supabaseAdmin.functions.invoke('send-final-confirmation-email', {
      body: { 
        email: solicitud.user.email, 
        nombre_completo: solicitud.user.raw_user_meta_data?.full_name || ''
      },
    });

    if (functionError) {
      console.error("Error al invocar send-final-confirmation-email:", functionError);
      // No lanzamos un error fatal, la actualización de estado es más importante.
    }

    return new Response(JSON.stringify({ message: "¡Éxito! La solicitud ha sido actualizada a 'documentos-en-revision' y se ha notificado al usuario." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
