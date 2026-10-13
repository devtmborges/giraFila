/**
 * GiraFila — Access Address Configuration Utility
 * Centralizes read, validate, sanitize, and persist of the access mode
 * (Local Wi-Fi vs Virtual/Web URL) used by the header bar and access modal.
 *
 * Storage strategy (priority order):
 *   1. Central SQLite via api.php?entity=config  ← shared across ALL devices
 *   2. localStorage fallback                      ← used only when API is unavailable
 *
 * Config keys:
 *   gf_access_mode    : 'local' | 'web'   (default: 'local')
 *   gf_access_web_url : string             (default: '')
 *
 * Aligned with HARNESS/Architecture/ErrorGovernance.md and SecurityGovernance.md
 */

const KEY_MODE    = 'gf_access_mode';
const KEY_WEB_URL = 'gf_access_web_url';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ─── API helpers ────────────────────────────────────────────────────────────

async function _apiGet() {
  try {
    const res = await fetch('api.php?entity=config', { method: 'GET', cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch { /* fallback to localStorage */ }
  return null;
}

async function _apiPost(data) {
  try {
    const res = await fetch('api.php?entity=config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store'
    });
    return res.ok;
  } catch { /* fallback to localStorage */ }
  return false;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the current access configuration.
 * Reads from the central SQLite API first; falls back to localStorage.
 * @returns {Promise<{ mode: 'local' | 'web', webUrl: string }>}
 */
export async function getAccessConfig() {
  const remote = await _apiGet();
  if (remote !== null) {
    const mode   = remote[KEY_MODE]    || 'local';
    const webUrl = remote[KEY_WEB_URL] || '';
    return { mode: mode === 'web' ? 'web' : 'local', webUrl };
  }
  // Fallback: localStorage (offline / no PHP)
  const mode   = localStorage.getItem(KEY_MODE)    || 'local';
  const webUrl = localStorage.getItem(KEY_WEB_URL) || '';
  return { mode: mode === 'web' ? 'web' : 'local', webUrl };
}

/**
 * Sanitizes a URL string: trims whitespace and strips javascript:/data: schemes.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeWebUrl(raw) {
  const trimmed = (raw || '').trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  return trimmed;
}

/**
 * Validates a URL string: must be parseable and use http: or https: protocol.
 * @param {string} url
 * @returns {boolean}
 */
export function validateWebUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Persists the access configuration.
 * Writes to the central SQLite API first; always also writes to localStorage as cache.
 * Does NOT validate — callers must validate before calling.
 * @param {{ mode: 'local' | 'web', webUrl: string }} config
 * @returns {Promise<void>}
 */
export async function saveAccessConfig({ mode, webUrl }) {
  const safeMode   = mode === 'web' ? 'web' : 'local';
  const safeWebUrl = (webUrl || '').trim();

  // Always persist to localStorage as an offline cache
  localStorage.setItem(KEY_MODE,    safeMode);
  localStorage.setItem(KEY_WEB_URL, safeWebUrl);

  // Best-effort persist to the shared SQLite API
  await _apiPost({
    [KEY_MODE]:    safeMode,
    [KEY_WEB_URL]: safeWebUrl
  });
}

/**
 * Returns the URL that should be displayed and copied by volunteers:
 * - In 'web' mode: returns the saved virtual URL (or empty string if unconfigured).
 * - In 'local' mode: returns empty string (caller uses the live LAN IP from the API).
 * @returns {Promise<string>}
 */
export async function getActiveDisplayUrl() {
  const { mode, webUrl } = await getAccessConfig();
  return mode === 'web' ? webUrl : '';
}
