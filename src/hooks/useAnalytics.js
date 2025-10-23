import { usePostHog } from 'posthog-js/react';

// --- INICIO DE INSTRUMENTACIÓN DE DEBUG ---
console.log('[Analytics Debug] VITE_PUBLIC_POSTHOG_KEY:', import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
console.log('[Analytics Debug] VITE_PUBLIC_POSTHOG_HOST:', import.meta.env.VITE_PUBLIC_POSTHOG_HOST);
// --- FIN DE INSTRUMENTACIÓN DE DEBUG ---

/**
 * Hook personalizado para centralizar la captura de eventos de PostHog.
 * Proporciona una interfaz única para enviar eventos de analítica,
 * asegurando consistencia y facilitando el mantenimiento.
 */
const useAnalytics = () => {
  const posthog = usePostHog();

  /**
   * Captura un evento y lo envía a PostHog.
   * @param {string} eventName - El nombre del evento (ej: 'submitted_loan_application').
   * @param {Object} [properties={}] - Un objeto con propiedades adicionales para el evento.
   */
  const captureEvent = (eventName, properties = {}) => {
    // --- INICIO DE INSTRUMENTACIÓN DE DEBUG ---
    console.log(`[Analytics Debug] Capturando evento: "${eventName}"`);
    console.log('[Analytics Debug] Estado del objeto posthog:', posthog);
    console.log('[Analytics Debug] Tipo del objeto posthog:', typeof posthog);
    if (posthog) {
      console.log('[Analytics Debug] Propiedades del objeto posthog:', Object.keys(posthog));
    }
    // --- FIN DE INSTRUMENTACIÓN DE DEBUG ---

    try {
      if (!posthog || typeof posthog.capture !== 'function') {
        console.error(
          `[Analytics Debug] ¡FALLO CRÍTICO! PostHog no está listo o no tiene el método 'capture'. Evento "${eventName}" no fue enviado. Revisa las variables de entorno en Vercel.`,
          {
            posthogObject: posthog,
            hasCaptureMethod: posthog ? typeof posthog.capture === 'function' : false,
          }
        );
        return;
      }
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error(`[Analytics Debug] Ocurrió un error inesperado al capturar el evento "${eventName}":`, error);
    }
  };

  return { captureEvent };
};

export default useAnalytics;
