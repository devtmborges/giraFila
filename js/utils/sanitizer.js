/**
 * GiraFila — Input Sanitization & Formatting Utilities
 * Aligned with HARNESS/Security/SecurityGovernance.md and HARNESS/Architecture/TimeAndDates.md
 */

/**
 * Strips HTML tags and potential script injections
 * @param {string} input 
 * @returns {string}
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .trim();
}

/**
 * Capitalizes first letter of each word (Title Case)
 * Handles Portuguese prepositions properly in lowercase if desired,
 * but scope asks: "com formatação automática de capitalização (primeira letra de cada palavra em maiúsculo)".
 * @param {string} input 
 * @returns {string}
 */
export function capitalizeWords(input) {
  const clean = sanitizeText(input);
  if (!clean) return '';
  return clean
    .toLowerCase()
    .split(/\s+/)
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
}

/**
 * Formats a numeric string to standard phone mask: (XX) XXXXX-XXXX
 * @param {string} input 
 * @returns {string}
 */
export function formatPhoneNumber(input) {
  if (!input) return '';
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Validates and converts QR code ticket to valid integer between 1 and 9999
 * @param {string|number} input 
 * @returns {number|null}
 */
export function parseQrTicketNumber(input) {
  if (input === null || input === undefined || input === '') return null;
  const num = parseInt(String(input).trim(), 10);
  if (isNaN(num) || num < 1 || num > 9999) {
    return null;
  }
  return num;
}

/**
 * Converts empty or whitespace string to null
 * (SecurityGovernance.md Section 2)
 * @param {string} input 
 * @returns {string|null}
 */
export function emptyToNull(input) {
  if (input === null || input === undefined) return null;
  const clean = String(input).trim();
  return clean.length === 0 ? null : clean;
}

/**
 * Normalizes date string to literal UTC ISO-8601 string
 * Aligned with TimeAndDates.md Rule 1.1
 * @param {string} dateStr 
 * @returns {string}
 */
export function toLiteralUtcIso(dateStr) {
  if (!dateStr) return new Date().toISOString();
  // If format is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T00:00:00.000Z`;
  }
  return dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
}

/**
 * Formats stored date to local display forcing UTC interpretation
 * Aligned with TimeAndDates.md Rule 1.2
 * @param {string} isoString 
 * @returns {string}
 */
export function formatUtcDisplayDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return isoString.substring(0, 10);
  }
}

/**
 * Formats stored UTC timestamp to display with local date and time.
 * Converts UTC ISO timestamp to the user's local timezone (e.g. America/Sao_Paulo),
 * matching the user's physical wall-clock time.
 * @param {string} isoString 
 * @returns {string}
 */
export function formatUtcDisplayDateTime(isoString) {
  if (!isoString) return '';
  try {
    const raw = String(isoString).trim();
    const normalized = (!raw.endsWith('Z') && !raw.includes('+'))
      ? (raw.includes('T') ? `${raw}Z` : `${raw.replace(' ', 'T')}Z`)
      : raw;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return isoString;
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return isoString;
  }
}
