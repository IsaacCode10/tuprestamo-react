import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Payload = {
  solicitud_id?: number;
  infocred_score?: number;
  infocred_risk_level?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: Payload = await req.json();
    const { solicitud_id, infocred_score, infocred_risk_level } = body || {};
    if (!solicitud_id || !infocred_score || !infocred_risk_level) {
      return new Response(JSON.stringify({ error: 'solicitud_id, infocred_score y infocred_risk_level son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const scoreVal = Number(infocred_score);
    const riskVal = String(infocred_risk_level).toUpperCase();
    if (isNaN(scoreVal) || scoreVal < 300 || scoreVal > 850) {
      return new Response(JSON.stringify({ error: 'infocred_score debe estar entre 300 y 850' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['A','B','C','D','E','F','G','H'].includes(riskVal)) {
      return new Response(JSON.stringify({ error: 'infocred_risk_level debe ser A-H' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener métricas actuales
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles_de_riesgo')
      .select('metricas_evaluacion')
      .eq('solicitud_id', solicitud_id)
      .maybeSingle();
    if (perfilError) throw perfilError;

    const currentMetrics = (perfil?.metricas_evaluacion as Record<string, unknown>) || {};
    const updatedMetrics = { ...currentMetrics, infocred_score: scoreVal, infocred_risk_level: riskVal };

    const { error: updateError } = await supabase
      .from('perfiles_de_riesgo')
      .update({ metricas_evaluacion: updatedMetrics })
      .eq('solicitud_id', solicitud_id);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ metricas_evaluacion: updatedMetrics }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en guardar-score-infocred:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
