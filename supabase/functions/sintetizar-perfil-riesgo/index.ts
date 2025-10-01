
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "sintetizar-perfil-riesgo" up and running!`)

addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method === 'OPTIONS') {
    event.respondWith(new Response(null, { headers: corsHeaders }))
    return
  }

  event.respondWith(
    (async () => {
      try {
        // Log that we received the request
        console.log('[SMOKE TEST] Received a request.');

        // We will ignore the body for now and just return a success message
        const responseBody = { message: "Hello from the smoke test!", received_at: new Date().toISOString() };

        console.log('[SMOKE TEST] Successfully processed. Returning response.');

        return new Response(JSON.stringify(responseBody), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (error) {
        console.error(`[SMOKE TEST FATAL] Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    })()
  )
})
