/**
 * GiraFila — Universal Clipboard Utility
 * Aligned with HARNESS/Architecture/ErrorGovernance.md and SecurityGovernance.md
 * 
 * Works seamlessly across iOS (iPhone/iPad), Android, Windows, Mac, and Linux,
 * supporting both Secure Contexts (HTTPS / localhost) and Non-Secure Contexts (HTTP over LAN IP).
 */

/**
 * Copies plain text to the device clipboard using a multi-tiered fallback strategy.
 * 
 * Strategy:
 * 1. Modern Async Clipboard API (navigator.clipboard.writeText) if available and in secure context.
 * 2. Optimized document.execCommand('copy') with iOS-specific WebKit selection and Android focus handling.
 * 3. Range selection fallback for visual manual copy if automatic copying is restricted by the OS/browser.
 * 
 * @param {string} text - The text to copy to clipboard
 * @param {HTMLElement} [fallbackElement] - Optional DOM element whose text should be selected if all copy APIs fail
 * @returns {Promise<boolean>} True if text was successfully copied to clipboard, false otherwise
 */
export async function copyTextToClipboard(text, fallbackElement = null) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const cleanText = text.trim();

  // Tier 1: Modern Async Clipboard API
  // Strictly requires window.isSecureContext === true (HTTPS or localhost)
  if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch {
      // Fall through to Tier 2 if permission denied or rejected
    }
  }

  // Tier 2: Universal document.execCommand('copy') with cross-platform mobile compatibility
  try {
    const success = _execCommandCopy(cleanText);
    if (success) {
      return true;
    }
  } catch (err) {
    console.warn('[GiraFila Clipboard] execCommand failed:', err);
  }

  // Tier 3: Visual selection fallback on the source element if provided
  if (fallbackElement && typeof window.getSelection === 'function') {
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(fallbackElement);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {}
  }

  return false;
}

/**
 * Executes document.execCommand('copy') using an ephemeral textarea configured
 * specifically to avoid iOS WebKit layout jumps, virtual keyboard popups, and selection drops.
 * 
 * @private
 * @param {string} text 
 * @returns {boolean}
 */
function _execCommandCopy(text) {
  const isIOS = navigator.userAgent.match(/ipad|iphone|ipod/i);
  const textarea = document.createElement('textarea');

  textarea.value = text;

  // iOS Safari fixes:
  // 1. Must have font-size >= 16px to prevent automatic viewport zoom on focus
  // 2. Must be readonly to prevent iOS virtual keyboard from popping up
  // 3. Must be positioned in viewport (not display:none / visibility:hidden, which iOS ignores)
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  textarea.style.fontSize = '16px';
  textarea.style.opacity = '0';
  textarea.style.zIndex = '-1';

  document.body.appendChild(textarea);

  let succeeded = false;

  try {
    if (isIOS) {
      // iOS WebKit selection range strategy
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, 999999);
    } else {
      // Android, Windows, Mac, Linux standard selection
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
    }

    succeeded = document.execCommand('copy');
  } catch (e) {
    succeeded = false;
  } finally {
    // Clean up selection and DOM element
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    } catch {}
    
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }

  return succeeded;
}
