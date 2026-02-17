import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { corsHeaders } from "../_shared/cors.ts";

// Esta función replica la lógica del frontend para saber qué documentos son requeridos
const getRequiredDocs = (situacionLaboral: string): string[] => {
  const baseDocs = [
    'ci_anverso',
    'ci_reverso',
    'boleta_aviso_electricidad',
    'extracto_tarjeta',
    'selfie_ci',
    'autorizacion_infocred_firmada',
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

    // Prefer service role when available; otherwise forward the caller's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? '';
    const authHeader = req.headers.get("Authorization") ?? '';

    const supabaseDb = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

    // 1. Obtener la solicitud y verificar su estado actual para evitar trabajo duplicado.
    const { data: solicitud, error: solError } = await supabaseDb
      .from('solicitudes')
      .select('id, estado, situacion_laboral, user_id')
      .eq('id', solicitud_id)
      .single();

    if (solError) throw solError;
    if (!solicitud) {
      return new Response(JSON.stringify({ message: "Solicitud no encontrada." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Si el estado ya avanzó a la fase de revisión o más allá, no se hace nada.
    if (['documentos-en-revision', 'aprobado', 'desembolsado', 'rechazado'].includes(solicitud.estado)) {
      return new Response(JSON.stringify({ message: `La solicitud ya tiene el estado '${solicitud.estado}'. No se requiere acción.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Determinar documentos requeridos y los que ya se subieron
    const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);
    const { data: uploadedDocs, error: docsError } = await supabaseDb
      .from('documentos')
      .select('tipo_documento')
      .eq('solicitud_id', solicitud_id)
      .eq('estado', 'subido');

    if (docsError) throw docsError;

    const uploadedDocTypes = (uploadedDocs ?? []).map((doc: any) => doc.tipo_documento);
    const uploadedSet = new Set(uploadedDocTypes);
    const hasDomicilio = uploadedSet.has('boleta_aviso_electricidad') || uploadedSet.has('factura_servicio');
    const allDocsUploaded = requiredDocs.every(docId => {
      if (docId === 'boleta_aviso_electricidad') return hasDomicilio;
      return uploadedSet.has(docId);
    });

    // 3. Si aún faltan documentos, terminar la ejecución silenciosamente.
    if (!allDocsUploaded) {
      return new Response(JSON.stringify({ message: "Aún faltan documentos por subir." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. ÉXITO! Todos los documentos están. Actualizar estado, invocar síntesis y correo.
    console.log(`Todos los docs para solicitud ${solicitud_id} subidos. Actualizando estado, disparando síntesis y enviando correo.`);

    const { error: updateError } = await supabaseDb
      .from('solicitudes')
      .update({ estado: 'documentos-en-revision' })
      .eq('id', solicitud_id);

    if (updateError) throw updateError;

    // Usar un cliente admin para las operaciones de backend si es posible
    const adminClient = serviceKey ? createClient(supabaseUrl, serviceKey) : supabaseDb;

    // 5. Invocar la síntesis del perfil de riesgo (PASO CRÍTICO FALTANTE)
    try {
      const { error: sintesisError } = await adminClient.functions.invoke('sintetizar-perfil-riesgo', {
        body: { solicitud_id },
      });
      if (sintesisError) {
        console.error("Error al invocar sintetizar-perfil-riesgo:", sintesisError);
        // No detenemos el flujo, pero es un error grave que debe registrarse.
      }
    } catch (e) {
      console.error('Fallo catastrófico al invocar la síntesis del perfil:', e);
    }

    // 6. Intentar enviar email de confirmación
    if (serviceKey) {
      try {
        const { data: userRes, error: adminErr } = await adminClient.auth.admin.getUserById(solicitud.user_id);
        if (adminErr) throw adminErr;
        
        const email = userRes?.user?.email ?? '';
        const nombre_completo = (userRes?.user?.user_metadata as any)?.full_name ?? '';

        if (email) {
          const { error: functionError } = await adminClient.functions.invoke('send-final-confirmation-email', {
            body: { email, nombre_completo },
          });
          if (functionError) {
            // El error ya se registra internamente, pero lo volvemos a loguear aquí para contexto.
            console.error("Error durante la invocación de send-final-confirmation-email:", functionError.message);
          }
        } else {
          console.warn('No se pudo obtener el email del usuario para enviar confirmación.');
        }
      } catch (e) {
        console.error('Fallo al intentar construir y enviar el correo de confirmación:', e);
      }
    }

    return new Response(JSON.stringify({ message: "Éxito! La solicitud ha sido actualizada y el perfil de riesgo está siendo generado." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

