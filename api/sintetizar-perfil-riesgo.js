import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { solicitud_id } = req.body;

    if (!solicitud_id) {
      return res.status(400).json({ error: 'solicitud_id is required.' });
    }

    // 1. Fetch all document analysis results for the given solicitud_id
    const { data: analysisData, error: fetchError } = await supabaseAdmin
      .from('analisis_documentos')
      .select('raw_data')
      .eq('solicitud_id', solicitud_id);

    if (fetchError) {
      console.error('Error fetching document analyses:', fetchError);
      return res.status(500).json({ error: 'Could not fetch document analyses.' });
    }

    if (!analysisData || analysisData.length === 0) {
      return res.status(404).json({ error: 'No analyzed documents found for this solicitud_id.' });
    }

    // 2. Synthesize all raw_data JSON objects into a single profile
    const perfil_sintetizado = analysisData.reduce((acc, item) => {
      return { ...acc, ...item.raw_data };
    }, {});

    // 3. Save the synthesized profile into the perfiles_de_riesgo table
    // Using 'upsert' to either create a new profile or update an existing one for the same solicitud_id
    const { data: profileData, error: upsertError } = await supabaseAdmin
      .from('perfiles_de_riesgo')
      .upsert(
        {
          solicitud_id: solicitud_id,
          perfil_sintetizado: perfil_sintetizado,
        },
        { onConflict: 'solicitud_id' }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting risk profile:', upsertError);
      // DEBUGGING: Send detailed error back to the client
      return res.status(500).json({
        error: 'Failed to save synthesized profile.',
        details: upsertError
      });
    }

    // 4. Return a success response
    res.status(200).json({ success: true, message: 'Risk profile synthesized and saved.', data: profileData });

  } catch (error) {
    console.error('Unhandled error in risk synthesis function:', error);
    res.status(500).json({ 
      error: `Internal Server Error: ${error.message}`,
      details: error.stack 
    });
  }
}
