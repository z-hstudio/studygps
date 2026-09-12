import { zhCN, enUS } from '@clerk/localizations';

let instance;
let pending;
let configuration;

function fail(code, message) { return Object.assign(new Error(message), { code }); }

async function bounded(promise, milliseconds = 20000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(fail('SERVICE_UNAVAILABLE', 'Authentication timed out. Please try again.')), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

function brandLocale(value) {
  if (typeof value === 'string') return value.replaceAll('{{applicationName}}', 'StudyGPS');
  if (Array.isArray(value)) return value.map(brandLocale);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, brandLocale(item)]));
  return value;
}

function loadScript(src, attributes = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
    const timer = setTimeout(() => { script.remove(); reject(fail('AUTH_LOAD_FAILED', 'Authentication timed out.')); }, 20000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(fail('AUTH_LOAD_FAILED', 'Unable to load authentication.')); };
    document.head.appendChild(script);
  });
}

async function initialize(locale) {
  const response = await fetch('/api/auth-config', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw fail('AUTH_LOAD_FAILED', 'Unable to load authentication settings.');
  configuration = await response.json();
  if (!configuration.configured) throw fail('AUTH_NOT_CONFIGURED', 'Authentication is not configured.');
  const key = configuration.publishableKey;
  let domain;
  try { domain = atob(key.split('_')[2]).replace(/\$$/, ''); } catch { throw fail('AUTH_NOT_CONFIGURED', 'Invalid authentication settings.'); }
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) throw fail('AUTH_NOT_CONFIGURED', 'Invalid authentication domain.');
  // Official browser distributions; only the portal loads them. No auth SDK on the homepage.
  await loadScript(`https://${domain}/npm/@clerk/ui@1.32.3/dist/ui.browser.js`);
  await loadScript(`https://${domain}/npm/@clerk/clerk-js@6.31.1/dist/clerk.browser.js`, { 'data-clerk-publishable-key': key });
  instance = window.Clerk;
  await bounded(instance.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
    localization: brandLocale(locale === 'en' ? enUS : zhCN),
    signInUrl: `/portal.html?lang=${locale}`, signUpUrl: `/portal.html?lang=${locale}&mode=signup`,
    signInFallbackRedirectUrl: '/portal.html', signUpFallbackRedirectUrl: '/portal.html',
    afterSignOutUrl: `/portal.html?lang=${locale}`,
    appearance: { variables: { colorPrimary: '#355740', colorText: '#16291f', colorBackground: '#fcfdf8', borderRadius: '0.75rem', fontFamily: 'Arial, "PingFang SC", sans-serif', fontSize: '16px' } },
  }));
  return { clerk: instance, config: configuration };
}

async function ready(locale = 'zh') {
  if (!pending) pending = initialize(locale).catch(error => { pending = null; throw error; });
  // The portal reloads on locale changes so Clerk and app text change together.
  return pending;
}

async function request(path, options = {}) {
  const target = new URL(path, location.origin);
  if (target.origin !== location.origin || target.pathname !== '/api/portal') throw fail('FORBIDDEN', 'Unsupported account request.');
  const session = instance?.session;
  if (!session) throw fail('AUTH_REQUIRED', 'Please sign in.');
  const token = await bounded(session.getToken());
  if (!token || instance.session?.id !== session.id) throw fail('AUTH_REQUIRED', 'Please sign in again.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const signals = [AbortSignal.timeout(20000)];
  if (options.signal) signals.push(options.signal);
  const response = await fetch(target, { ...options, headers, credentials: 'omit', cache: 'no-store', signal: AbortSignal.any(signals) });
  let body;
  try { body = await response.json(); } catch { throw fail('SERVICE_UNAVAILABLE', 'Unable to read the server response.'); }
  if (instance.session?.id !== session.id) throw fail('AUTH_REQUIRED', 'Your account changed. Please try again.');
  if (!response.ok) throw Object.assign(fail(body.error?.code || 'SERVICE_UNAVAILABLE', body.error?.message || 'Unable to access your workspace.'), { status: response.status });
  return body;
}

window.StudyGPSAuth = Object.freeze({ ready, request });
