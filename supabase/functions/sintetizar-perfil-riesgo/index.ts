
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "sintetizar-perfil-riesgo" up and running!`)

// Interfaces para tipado
interface RequestBody {
  solicitud_id: string
}

interface AnalisisDocumento {
  document_type: string
  raw_data: Record<string, any>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { solicitud_id }: RequestBody = await req.json()
    if (!solicitud_id) throw new Error('solicitud_id es requerido')
    console.log(`Iniciando síntesis para solicitud_id: ${solicitud_id}`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    )

    // 1. Consultar la solicitud original
    console.log(`Buscando datos de la solicitud: ${solicitud_id}`)
    const { data: solicitudData, error: solicitudError } = await supabaseClient
      .from('solicitudes')
      .select('id, monto_solicitado, user_id, situacion_laboral')
      .eq('id', solicitud_id)
      .single()

    if (solicitudError) throw solicitudError
    if (!solicitudData) throw new Error(`No se encontró la solicitud: ${solicitud_id}`)
    console.log('Solicitud encontrada:', solicitudData)

    // 2. Consultar todos los análisis de documentos para esa solicitud
    console.log(`Buscando análisis de documentos para: ${solicitud_id}`)
    const { data: analisisDocs, error: analisisError } = await supabaseClient
      .from('analisis_documentos')
      .select('document_type, raw_data')
      .eq('solicitud_id', solicitud_id)

    if (analisisError) throw analisisError
    if (!analisisDocs || analisisDocs.length === 0) {
      throw new Error(`No se encontraron análisis de documentos para la solicitud: ${solicitud_id}`)
    }
    console.log(`Se encontraron ${analisisDocs.length} análisis de documentos.`)

    // 3. Sintetizar los datos de todos los documentos en un solo objeto
    console.log('Sintetizando datos de documentos...')
    const datosSintetizados = analisisDocs.reduce((acc: Record<string, any>, doc: AnalisisDocumento) => {
      // Agrega un prefijo del tipo de documento para evitar colisiones de claves
      // Ejemplo: ci_anverso_numero_cedula, extracto_tarjeta_deuda_total
      for (const [key, value] of Object.entries(doc.raw_data)) {
        acc[`${doc.document_type}__${key}`] = value
      }
      return acc
    }, {})
    console.log('Datos sintetizados:', datosSintetizados)

    // 4. Calcular métricas de riesgo (Lógica de negocio placeholder)
    console.log('Calculando métricas de riesgo...')
    // TODO: Implementar la lógica real de cálculo de DTI y Score de Confianza
    const metricasRiesgo = {
      dti_calculado: 0.35, // Placeholder
      score_confianza: 90, // Placeholder
      // Ejemplo de cómo podrías acceder a los datos:
      // deuda_total_tarjeta: datosSintetizados['extracto_tarjeta__deuda_total'] || null,
      // salario_neto: datosSintetizados['boleta_pago__salario_neto'] || null,
    }
    console.log('Métricas calculadas:', metricasRiesgo)

    // 5. Insertar el perfil de riesgo consolidado
    console.log('Creando perfil de riesgo en la base de datos...')
    const { data: perfilDeRiesgo, error: perfilError } = await supabaseClient
      .from('perfiles_de_riesgo')
      .insert({
        solicitud_id: solicitud_id,
        user_id: solicitudData.user_id,
        monto_solicitado_evaluacion: solicitudData.monto_solicitado,
        estado: 'listo_para_revision',
        datos_sintetizados: datosSintetizados,
        metricas_evaluacion: metricasRiesgo,
        decision_tomada: false,
      })
      .select('id')
      .single()

    if (perfilError) throw perfilError
    console.log('Perfil de riesgo creado exitosamente con ID:', perfilDeRiesgo.id)

    // 6. Retornar una respuesta exitosa
    return new Response(JSON.stringify({ perfil_de_riesgo_id: perfilDeRiesgo.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`Error fatal en la función 'sintetizar-perfil-riesgo': ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
