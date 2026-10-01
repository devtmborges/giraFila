/**
 * GiraFila — Error Handler Service
 * Aligned with HARNESS/Architecture/ErrorGovernance.md
 */

import { ERROR_CATALOG } from '../constants/errors.js';
import { logAudit } from './auditService.js';
import { getIcon } from '../utils/icons.js';

let toastContainerElement = null;

function getToastContainer() {
  if (!toastContainerElement) {
    toastContainerElement = document.getElementById('toastContainer');
    if (!toastContainerElement) {
      toastContainerElement = document.createElement('div');
      toastContainerElement.id = 'toastContainer';
      toastContainerElement.className = 'toast-container';
      document.body.appendChild(toastContainerElement);
    }
  }
  return toastContainerElement;
}

/**
 * Resolves an error definition from the catalog
 * @param {string} errorCode 
 * @returns {object}
 */
export function getErrorDef(errorCode) {
  return ERROR_CATALOG[errorCode] || {
    userMessage: 'Ocorreu um erro inesperado no sistema.',
    technicalContext: {
      summary: 'Código de erro não catalogado: ' + errorCode,
      commonCauses: ['Código de erro inexistente'],
      relatedFiles: [],
      suggestedAction: 'Registrar o erro no catálogo centralizado.'
    }
  };
}

/**
 * Displays a toast notification with the error code attached
 * @param {string} errorCode 
 * @param {'error'|'warning'|'success'} type 
 * @param {string} [customMessage] 
 * @param {number} [durationMs] 
 */
export function showToast(errorCode, type = 'error', customMessage = null, durationMs = 4500) {
  const def = getErrorDef(errorCode);
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const messageText = customMessage || def.userMessage;

  toast.innerHTML = `
    <div class="toast-message">${escapeHtml(messageText)}</div>
    <div class="toast-code">[Código: ${escapeHtml(errorCode)}]</div>
  `;

  container.appendChild(toast);

  // Trigger audit if SYS or SEC error (ErrorGovernance.md Section 5.3)
  if (errorCode.includes('-SYS-') || errorCode.includes('-SEC-')) {
    logAudit({
      entity: 'SYSTEM_ERROR',
      action: 'ERROR_OCCURRED',
      record_id: errorCode,
      data: { message: messageText, technicalContext: def.technicalContext }
    });
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

/**
 * Displays a success notification toast
 * @param {string} message 
 * @param {number} [durationMs] 
 */
export function showSuccess(message, durationMs = 3000) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.innerHTML = `<div class="toast-message">${escapeHtml(message)}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

/**
 * Displays a blocking modal alert for Business Rule (REG) or Security (SEC) failures
 * @param {string} errorCode 
 * @param {string} [customDetails] 
 * @returns {Promise<void>}
 */
export function showErrorModal(errorCode, customDetails = null) {
  return new Promise((resolve) => {
    const def = getErrorDef(errorCode);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    const detailsHtml = customDetails ? `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(customDetails)}</p>` : '';

    backdrop.innerHTML = `
      <div class="modal-dialog confirm" role="alertdialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="card-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 8px;">
            ${getIcon('alertTriangle', 20)}
            <span>Atenção</span>
          </h3>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-base); font-weight: var(--font-weight-medium);">${escapeHtml(def.userMessage)}</p>
          ${detailsHtml}
          <div style="font-size: var(--font-size-xs); font-family: var(--font-family-mono); color: var(--color-text-subtle);">
            [Código: ${escapeHtml(errorCode)}]
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btnErrorModalOk">Entendido</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const btnOk = backdrop.querySelector('#btnErrorModalOk');
    const close = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 200);
      resolve();
    };

    btnOk.addEventListener('click', close);
    btnOk.focus();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
