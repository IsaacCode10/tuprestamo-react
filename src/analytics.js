import mixpanel from 'mixpanel-browser';

const mixpanelEnabled = import.meta.env.MODE !== 'development';
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

export const initMixpanel = () => {
  if (!mixpanelEnabled) return;
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel no inicializado: falta VITE_MIXPANEL_TOKEN');
    return;
  }
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.MODE === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  });
};

export const trackEvent = (eventName, properties) => {
  if (!mixpanelEnabled) return;
  mixpanel.track(eventName, properties);
};

export const identifyUser = (userId, properties) => {
  if (!mixpanelEnabled) return;
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
  if (!mixpanelEnabled) return;
  mixpanel.reset();
};
