import mixpanel from 'mixpanel-browser';

const mixpanelEnabled = import.meta.env.MODE !== 'development';
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
let initialized = false;

export const initMixpanel = () => {
  if (!mixpanelEnabled) return;
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel no inicializado: falta VITE_MIXPANEL_TOKEN');
    initialized = false;
    return;
  }
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.MODE === 'development',
    track_pageview: true,
    persistence: 'localStorage',
    autocapture: true,
    record_sessions_percent: 100,
  });
  if (typeof mixpanel.start_session_recording === 'function') {
    try { mixpanel.start_session_recording(); } catch (_) { /* noop */ }
  }
  initialized = true;
};

export const isMixpanelInitialized = () => initialized;

export const trackEvent = (eventName, properties) => {
  if (!mixpanelEnabled || !initialized) return;
  mixpanel.track(eventName, properties);
};

export const identifyUser = (userId, properties) => {
  if (!mixpanelEnabled || !initialized) return;
  if (userId) {
    mixpanel.identify(userId);
  }
  if (properties) {
    try {
      mixpanel.people.set(properties);
    } catch (_) {
      // Ignorar si People no está habilitado en el plan
    }
  }
};

export const resetMixpanel = () => {
  if (!mixpanelEnabled || !initialized) return;
  mixpanel.reset();
};
