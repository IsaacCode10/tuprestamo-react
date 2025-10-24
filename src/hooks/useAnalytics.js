import { trackEvent, identifyUser, resetMixpanel } from '@/analytics.js';

// Shim de compatibilidad para código legado basado en PostHog
// Expone una API mínima similar: capture, identify, reset
export default function useAnalytics() {
  return {
    capture: (eventName, properties) => trackEvent(eventName, properties),
    identify: (userId, properties) => identifyUser(userId, properties),
    reset: () => resetMixpanel(),
  };
}

