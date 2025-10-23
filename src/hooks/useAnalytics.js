import { usePostHog } from 'posthog-js/react';

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
    if (!posthog) {
      console.warn('PostHog no está disponible. Evento no capturado:', eventName);
      return;
    }
    posthog.capture(eventName, properties);
  };

  return { captureEvent };
};

export default useAnalytics;
