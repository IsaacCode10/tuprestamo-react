import mixpanel from 'mixpanel-browser';

// Solo enviar en producción por defecto
const mixpanelEnabled = import.meta.env.MODE === 'production';
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

// Config por entorno (con defaults seguros y baratos)
const REPLAY_PUBLIC_PERCENT = Number(import.meta.env.VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT   5); // % en rutas públicas
const REPLAY_AUTH_PERCENT = Number(import.meta.env.VITE_MIXPANEL_REPLAY_AUTH_PERCENT   15); // % en dashboards
const ENABLE_ACTIVE_PING = String(import.meta.env.VITE_MIXPANEL_ENABLE_ACTIVE_PING   'false') === 'true';
const ACTIVE_PING_INTERVAL_MS = Number(import.meta.env.VITE_MIXPANEL_ACTIVE_PING_INTERVAL_MS   60000);
const ACTIVE_PING_MAX_PER_SESSION = Number(import.meta.env.VITE_MIXPANEL_ACTIVE_PING_MAX   5);

let initialized = false;
let activePingTimer = null;
let lastUserActivityTs = Date.now();
let activePingSentCount = 0;

// Throttle/dedup interno por evento (ventana de 2s)
const lastSentByEvent = new Map();
const DEDUP_WINDOW_MS = 2000;

const shouldSample = (percent) => {
  const p = Math.max(0, Math.min(100, Number(percent)));
  return Math.random() * 100 < p;
};

const isAuthDashboardPath = () => {
  try {
    const p = window.location?.pathname || '';
    return /dashboard|borrower-dashboard|investor-dashboard|admin-dashboard/i.test(p);
  } catch {
    return false;
  }
};

const startReplayWithSampling = () => {
  if (typeof mixpanel.start_session_recording !== 'function') return;
  const percent = isAuthDashboardPath() ? REPLAY_AUTH_PERCENT : REPLAY_PUBLIC_PERCENT;
  if (percent <= 0) return;
  if (!shouldSample(percent)) return;
  try { mixpanel.start_session_recording(); } catch (_) { /* noop */ }
};

// Active Ping: mide actividad real (visible + interacción reciente)
const canSendActivePing = () => {
  if (document.visibilityState !== 'visible') return false;
  // interacción reciente en 30s
  if (Date.now() - lastUserActivityTs > 30000) return false;
  // Evitar duplicados entre pestañas: solo 1 ping por intervalo global
  try {
    const key = 'tp_active_ping_last_ts';
    const last = Number(localStorage.getItem(key) || '0');
    if (Date.now() - last < ACTIVE_PING_INTERVAL_MS - 2000) return false;
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Si falla localStorage, seguimos sin la compuerta cross-tab
  }
  return true;
};

const startActivePing = () => {
  if (activePingTimer) return;
  activePingSentCount = 0;
  const handler = () => {
    if (!initialized) return;
    if (activePingSentCount >= ACTIVE_PING_MAX_PER_SESSION) return;
    if (!canSendActivePing()) return;
    mixpanel.track('Active Ping');
    activePingSentCount += 1;
  };
  activePingTimer = setInterval(handler, ACTIVE_PING_INTERVAL_MS);
};

const stopActivePing = () => {
  if (activePingTimer) {
    clearInterval(activePingTimer);
    activePingTimer = null;
  }
};

export const initMixpanel = () => {
  if (!mixpanelEnabled) return;
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel no inicializado: falta VITE_MIXPANEL_TOKEN');
    initialized = false;
    return;
  }
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.MODE !== 'production',
    track_pageview: true,
    persistence: 'localStorage',
    autocapture: true,
    // Gestionamos el muestreo de Replay manualmente por ruta
    record_sessions_percent: 0,
    batch_requests: true,
    batch_size: 20,
  });
  // Registrar UTM/referrer como superprops (first-touch + last-touch)
  try { captureAndRegisterUTM(); } catch {}
  // Listeners para actividad del usuario (para Active Ping)
  try {
    window.addEventListener('mousemove', () => { lastUserActivityTs = Date.now(); }, { passive: true });
    window.addEventListener('keydown', () => { lastUserActivityTs = Date.now(); });
    window.addEventListener('visibilitychange', () => { /* noop */ });
  } catch {}

  startReplayWithSampling();
  if (ENABLE_ACTIVE_PING) startActivePing();
  initialized = true;
};

export const isMixpanelInitialized = () => initialized;

export const trackEvent = (eventName, properties) => {
  if (!mixpanelEnabled || !initialized) return;
  const now = Date.now();
  const last = lastSentByEvent.get(eventName) || 0;
  if (now - last < DEDUP_WINDOW_MS) return;
  lastSentByEvent.set(eventName, now);
  const enriched = maybeAttachUTMToEvent(eventName, properties);
  mixpanel.track(eventName, enriched);
};

export const identifyUser = (userId, properties) => {
  if (!mixpanelEnabled || !initialized) return;
  if (userId) {
    mixpanel.identify(userId);
  }
  if (properties) {
    try {
      // Super props persistentes (no confundir con People)
      mixpanel.register(properties);
      // Si el plan permite People, esto setea el perfil
      mixpanel.people?.set?.(properties);
    } catch (_) {
      // Ignorar si People no está habilitado en el plan
    }
  }
};

export const setSuperProperties = (properties) => {
  if (!mixpanelEnabled || !initialized || !properties) return;
  try { mixpanel.register(properties); } catch {}
};

export const resetMixpanel = () => {
  if (!mixpanelEnabled || !initialized) return;
  try { stopActivePing(); } catch {}
  mixpanel.reset();
};

// Exponer control manual del Active Ping (apagado por defecto)
export const enableActivePing = () => { if (initialized) startActivePing(); };
export const disableActivePing = () => { stopActivePing(); };

// ----------------------------
// UTM helpers (first/last touch)
// ----------------------------

const getReferrerDomain = () => {
  try {
    if (!document.referrer) return '';
    const u = new URL(document.referrer);
    return u.hostname.replace(/^www\./, '');
  } catch { return ''; }
};

const parseUTMFromURL = () => {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const utm = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      fbclid: params.get('fbclid') || '',
    };
    const hasAny = Object.values(utm).some(v => v && v.length > 0);
    return { utm, hasAny };
  } catch { return { utm: {}, hasAny: false }; }
};

export const captureAndRegisterUTM = () => {
  const { utm, hasAny } = parseUTMFromURL();
  const referrer_domain = getReferrerDomain();
  const landing_page = (() => { try { return window.location.pathname || ''; } catch { return ''; } })();
  // Siempre registrar referrer/landing
  try { mixpanel.register({ referrer_domain, landing_page }); } catch {}
  if (!hasAny) return;
  // last-touch: sobreescribe
  const lastTouch = {
    utm_last_source: utm.utm_source,
    utm_last_medium: utm.utm_medium,
    utm_last_campaign: utm.utm_campaign,
    utm_last_term: utm.utm_term,
    utm_last_content: utm.utm_content,
    last_gclid: utm.gclid,
    last_fbclid: utm.fbclid,
  };
  try { mixpanel.register(lastTouch); } catch {}
  // first-touch: solo si no existe
  const firstTouch = {
    utm_first_source: utm.utm_source,
    utm_first_medium: utm.utm_medium,
    utm_first_campaign: utm.utm_campaign,
    utm_first_term: utm.utm_term,
    utm_first_content: utm.utm_content,
    first_gclid: utm.gclid,
    first_fbclid: utm.fbclid,
  };
  try { mixpanel.register_once(firstTouch); } catch {}
};

export const getCurrentUTM = () => {
  // mixpanel.get_property lee superprops actuales
  const getProp = (k) => { try { return mixpanel.get_property(k) || ''; } catch { return ''; } };
  return {
    utm_source: getProp('utm_last_source') || getProp('utm_first_source'),
    utm_medium: getProp('utm_last_medium') || getProp('utm_first_medium'),
    utm_campaign: getProp('utm_last_campaign') || getProp('utm_first_campaign'),
    utm_term: getProp('utm_last_term') || getProp('utm_first_term'),
    utm_content: getProp('utm_last_content') || getProp('utm_first_content'),
    utm_first_source: getProp('utm_first_source'),
    utm_first_medium: getProp('utm_first_medium'),
    utm_first_campaign: getProp('utm_first_campaign'),
    referrer_domain: getProp('referrer_domain'),
    landing_page: getProp('landing_page'),
    gclid: getProp('last_gclid') || getProp('first_gclid'),
    fbclid: getProp('last_fbclid') || getProp('first_fbclid'),
  };
};

const UTM_ENRICH_EVENTS = new Set(['Campaign Lead', 'Signed Up']);
const maybeAttachUTMToEvent = (eventName, properties = {}) => {
  if (!UTM_ENRICH_EVENTS.has(eventName)) return properties;
  const utm = getCurrentUTM();
  return { ...utm, ...properties };
};
