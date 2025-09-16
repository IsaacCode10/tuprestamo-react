
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0';

console.log('Function handle-new-solicitud (V4 - Scorecard Model) starting up.');

// --- Modelo de Riesgo y Precios ---

const PRICING_MODEL = {
  A: { label: 'A', tasa_interes_prestatario: 15.0, tasa_rendimiento_inversionista: 10.0 },
  B: { label: 'B', tasa_interes_prestatario: 17.0, tasa_rendimiento_inversionista: 12.0 },
  C: { label: 'C', tasa_interes_prestatario: 20.0, tasa_rendimiento_inversionista: 15.0 },
  Rechazado: { label: 'Rechazado' },
};

// Lógica del Scorecard de Riesgo
const runRiskScorecard = (solicitud) => {
  const {
    ingreso_mensual,
    saldo_deuda_tc,
    tasa_interes_tc,
    antiguedad_laboral,
  } = solicitud;

  // 1. Validar y parsear datos de entrada
  const ingresos = parseFloat(ingreso_mensual);
  const saldoDeuda = parseFloat(saldo_deuda_tc);
  const tasaAnual = parseFloat(tasa_interes_tc);
  const antiguedad = parseInt(antiguedad_laboral, 10);

  if (isNaN(ingresos) || isNaN(saldoDeuda) || isNaN(tasaAnual) || isNaN(antiguedad)) {
    console.error('Datos de solicitud inválidos para scorecard:', solicitud);
    return PRICING_MODEL.Rechazado;
  }

  // 2. Lógica de Rechazo Automático (Early Exit)
  if (ingresos < 3000) {
    console.log(`Rechazo automático: Ingreso ${ingresos} < 3000`);
    return PRICING_MODEL.Rechazado;
  }

  // 3. Estimar Deuda Mensual y Calcular DTI
  const interesMensual = (saldoDeuda * (tasaAnual / 100)) / 12;
  const amortizacionCapital = saldoDeuda * 0.01; // Asumimos 1% del capital
  const deudaMensualEstimada = interesMensual + amortizacionCapital;
  const dti = (deudaMensualEstimada / ingresos) * 100;

  if (dti > 50) {
    console.log(`Rechazo automático: DTI ${dti.toFixed(2)}% > 50%`);
    return PRICING_MODEL.Rechazado;
  }

  // 4. Calcular Puntos del Scorecard
  let totalScore = 0;

  // Puntos por Ingreso
  if (ingresos > 8000) totalScore += 3;
  else if (ingresos >= 5000) totalScore += 2;
  else if (ingresos >= 3000) totalScore += 1;

  // Puntos por DTI
  if (dti < 30) totalScore += 3;
  else if (dti <= 40) totalScore += 2;
  else if (dti <= 50) totalScore += 1;

  // Puntos por Antigüedad Laboral
  if (antiguedad >= 24) totalScore += 2;
  else if (antiguedad >= 12) totalScore += 1;

  console.log(`Scorecard: Ingresos=${ingresos}, DTI=${dti.toFixed(2)}%, Antigüedad=${antiguedad}m => Puntuación Total = ${totalScore}`);

  // 5. Asignar Perfil de Riesgo según Puntaje
  if (totalScore >= 7) return PRICING_MODEL.A;
  if (totalScore >= 5) return PRICING_MODEL.B;
  if (totalScore >= 2) return PRICING_MODEL.C;
  
  return PRICING_MODEL.Rechazado;
};

// --- Inicialización de Servicios ---

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record: solicitud } = await req.json();
    const { id: solicitud_id, email, nombre_completo, tipo_solicitud, monto_solicitado, plazo_meses } = solicitud;

    // La lógica para inversionistas no cambia y se puede manejar por separado.
    if (tipo_solicitud === 'inversionista') {
      // ... (código original para inversionistas, si se quiere mantener)
      console.log(`Procesando solicitud de inversionista para ${email}...`);
      return new Response(JSON.stringify({ message: 'Flujo de inversionista procesado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    if (tipo_solicitud !== 'prestatario') {
        throw new Error(`Tipo de solicitud no reconocido: ${tipo_solicitud}`);
    }

    // --- INICIA FLUJO AUTOMÁTICO PARA PRESTATARIO ---

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Correr el Scorecard de Riesgo
    const riskProfile = runRiskScorecard(solicitud);
    console.log(`Solicitud ${solicitud_id}: Perfil Asignado=${riskProfile.label}`);

    // 2. Manejar el resultado
    if (riskProfile.label === 'Rechazado') {
      // --- FLUJO DE RECHAZO AUTOMÁTICO ---
      await supabaseAdmin.from('solicitudes').update({ estado: 'rechazado' }).eq('id', solicitud_id);

      await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: 'Actualización sobre tu solicitud en Tu Préstamo',
        html: `... (HTML de correo de rechazo) ...`,
      });

      return new Response(JSON.stringify({ message: 'Solicitud rechazada automáticamente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else {
      // --- FLUJO DE PRE-APROBACIÓN AUTOMÁTICA ---
      
      // a. Crear usuario en Auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: nombre_completo, role: 'prestatario' } });
      if (userError && !userError.message.includes('User already registered')) throw userError;
      const user_id = userData?.user?.id || (await supabaseAdmin.auth.admin.getUserByEmail(email)).data.user.id;

      // b. Generar enlace de activación
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email });
      if (linkError) throw linkError;
      const inviteLink = linkData.properties.action_link;

      // c. Crear la oportunidad de inversión con el pricing correcto
      const { data: oppData, error: oppError } = await supabaseAdmin.from('oportunidades').insert([{
        solicitud_id,
        user_id, // Nombre de columna corregido
        monto: monto_solicitado,
        plazo_meses,
        perfil_riesgo: riskProfile.label,
        tasa_interes_prestatario: riskProfile.tasa_interes_prestatario,
        tasa_rendimiento_inversionista: riskProfile.tasa_rendimiento_inversionista,
        // Las comisiones y seguros pueden ser fijos o parte del pricing model
        comision_originacion_porcentaje: 5.0, // Ejemplo
        seguro_desgravamen_porcentaje: 0.10, // Ejemplo
        comision_servicio_inversionista_porcentaje: 1.5, // Ejemplo
        estado: 'disponible',
      }]).select().single();
      if (oppError) throw oppError;

      // d. Actualizar la solicitud original
      await supabaseAdmin.from('solicitudes').update({ estado: 'pre-aprobado', user_id, opportunity_id: oppData.id }).eq('id', solicitud_id);

      // e. Enviar correo de pre-aprobación
      await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: `¡Felicidades! Tu solicitud en Tu Préstamo ha sido pre-aprobada (Perfil ${riskProfile.label})`,
        html: `... (HTML de correo de pre-aprobación) ...`,
      });

      return new Response(JSON.stringify({ message: 'Solicitud pre-aprobada automáticamente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

  } catch (error) {
    console.error('Error en handle-new-solicitud (V4):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
