/**
 * GiraFila — Screen 2: Event Management View
 * Implements requirements from projectScope.md Tela 2
 */

import { createEvent, getAllEvents, updateEvent, deleteEvent } from '../services/storageService.js';
import { sanitizeText, capitalizeWords, formatUtcDisplayDate } from '../utils/sanitizer.js';
import { showToast, showSuccess, showErrorModal } from '../services/errorHandler.js';
import { getSession, openSessionModal, clearSessionIfMatches, updateSessionNames } from './sessionModal.js';
import { getIcon } from '../utils/icons.js';
import { verifyPassword } from '../utils/masterPassword.js';

export function initEventView() {
  const form = document.getElementById('eventForm');
  const inputName = document.getElementById('eventName');
  const inputDate = document.getElementById('eventDate');
  const inputLocation = document.getElementById('eventLocation');
  const inputDesc = document.getElementById('eventDescription');
  const eventsList = document.getElementById('eventsList');
  const eventCountBadge = document.getElementById('eventCountBadge');

  if (!form) return;

  // Clear field errors on input
  [inputName, inputDate, inputLocation].forEach(inp => {
    inp.addEventListener('input', () => {
      inp.classList.remove('has-error');
      const errorMsg = document.getElementById(`${inp.id}Error`);
      if (errorMsg) errorMsg.classList.remove('visible');
    });
  });

  // Name Auto-capitalization
  inputName.addEventListener('blur', () => {
    inputName.value = capitalizeWords(inputName.value);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;

    // Validate Name (up to 50 chars, alphabetic / text with spaces)
    const rawName = sanitizeText(inputName.value);
    const cleanName = capitalizeWords(rawName);
    inputName.value = cleanName;

    if (!cleanName || cleanName.length > 50) {
      inputName.classList.add('has-error');
      const err = document.getElementById('eventNameError');
      if (err) err.classList.add('visible');
      showToast('GF-EVENT-VAL-001', 'error');
      hasError = true;
    }

    // Validate Date
    if (!inputDate.value) {
      inputDate.classList.add('has-error');
      const err = document.getElementById('eventDateError');
      if (err) err.classList.add('visible');
      showToast('GF-EVENT-VAL-002', 'error');
      hasError = true;
    }

    // Validate Location
    const cleanLocation = sanitizeText(inputLocation.value);
    if (!cleanLocation) {
      inputLocation.classList.add('has-error');
      const err = document.getElementById('eventLocationError');
      if (err) err.classList.add('visible');
      showToast('GF-EVENT-VAL-003', 'error');
      hasError = true;
    }

    if (hasError) return;

    const cleanDesc = sanitizeText(inputDesc.value);

    try {
      const created = await createEvent({
        name: cleanName,
        date: inputDate.value,
        location: cleanLocation,
        description: cleanDesc
      });

      showSuccess(`Evento "${cleanName}" criado com sucesso!`);
      form.reset();
      await renderEvents();

      // If no event is selected in the active session, prompt or offer to select it
      const session = getSession();
      if (!session.eventId) {
        openSessionModal(false);
      }
    } catch {
      showToast('GF-SYSTEM-SYS-001', 'error');
    }
  });

  // Delegated actions on list (Edit / Delete)
  if (eventsList) {
    eventsList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit-event"]');
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const events = await getAllEvents();
        const ev = events.find(x => x.id === id);
        if (ev) openEditEventModal(ev);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete-event"]');
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const events = await getAllEvents();
        const ev = events.find(x => x.id === id);
        if (ev) confirmDeleteEvent(ev);
        return;
      }
    });
  }

  function openEditEventModal(ev) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-backdrop)';

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="z-index: var(--z-modal-primary);">
        <div class="modal-header">
          <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('pencil', 18)}
            <span>Editar Evento</span>
          </h3>
          <button type="button" class="btn-icon" id="btnEditEventClose" aria-label="Fechar" style="border:none; background:transparent;">${getIcon('close', 18)}</button>
        </div>
        <form id="editEventModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label required" for="editEventName">Nome do Evento</label>
              <input type="text" id="editEventName" class="form-input" maxlength="50" required value="${escapeHtml(ev.name)}" />
              <span class="form-hint">Máximo de 50 caracteres.</span>
            </div>
            <div class="form-group">
              <label class="form-label required" for="editEventDate">Data do Evento</label>
              <input type="date" id="editEventDate" class="form-input" required value="${ev.date ? ev.date.substring(0, 10) : ''}" />
            </div>
            <div class="form-group">
              <label class="form-label required" for="editEventLocation">Local</label>
              <input type="text" id="editEventLocation" class="form-input" required value="${escapeHtml(ev.location)}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="editEventDescription">Descrição</label>
              <textarea id="editEventDescription" class="form-input" rows="3">${escapeHtml(ev.description || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btnEditEventCancel">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnEditEventSave">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#btnEditEventClose').onclick = close;
    backdrop.querySelector('#btnEditEventCancel').onclick = close;

    const modalForm = backdrop.querySelector('#editEventModalForm');
    const inputModalName = backdrop.querySelector('#editEventName');
    const inputModalDate = backdrop.querySelector('#editEventDate');
    const inputModalLoc = backdrop.querySelector('#editEventLocation');
    const inputModalDesc = backdrop.querySelector('#editEventDescription');

    inputModalName.addEventListener('blur', () => {
      inputModalName.value = capitalizeWords(inputModalName.value);
    });

    modalForm.onsubmit = async (evt) => {
      evt.preventDefault();
      const cleanName = capitalizeWords(sanitizeText(inputModalName.value));
      inputModalName.value = cleanName;

      if (!cleanName || cleanName.length > 50) {
        showToast('GF-EVENT-VAL-001', 'error');
        return;
      }
      if (!inputModalDate.value) {
        showToast('GF-EVENT-VAL-002', 'error');
        return;
      }
      const cleanLoc = sanitizeText(inputModalLoc.value);
      if (!cleanLoc) {
        showToast('GF-EVENT-VAL-003', 'error');
        return;
      }

      const cleanDesc = sanitizeText(inputModalDesc.value);

      try {
        await updateEvent(ev.id, {
          name: cleanName,
          date: inputModalDate.value,
          location: cleanLoc,
          description: cleanDesc
        });
        updateSessionNames(ev.id, cleanName);
        showSuccess(`Evento "${cleanName}" atualizado com sucesso!`);
        close();
        await renderEvents();
      } catch (err) {
        showToast('GF-SYSTEM-SYS-002', 'error');
      }
    };
  }

  function confirmDeleteEvent(ev) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    backdrop.innerHTML = `
      <div class="modal-dialog confirm" role="alertdialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="card-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 8px;">
            ${getIcon('trash', 18)}
            <span>Excluir Evento</span>
          </h3>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-base);">Deseja realmente excluir o evento <strong>${escapeHtml(ev.name)}</strong>?</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Esta ação não poderá ser desfeita.</p>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label required" for="deleteEventMasterPwd">
              ${getIcon('lock', 14)}
              Senha Mestre para Confirmar
            </label>
            <input
              type="password"
              id="deleteEventMasterPwd"
              class="form-input"
              placeholder="Digite a senha mestre..."
              autocomplete="current-password"
              aria-label="Senha mestre para confirmar exclusão do evento"
            />
            <span class="form-error-msg" id="deleteEventMasterPwdError"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelDelete">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmDelete">${getIcon('trash', 14)} Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    const pwdInput = backdrop.querySelector('#deleteEventMasterPwd');
    const pwdError = backdrop.querySelector('#deleteEventMasterPwdError');
    const btnConfirm = backdrop.querySelector('#btnConfirmDelete');

    backdrop.querySelector('#btnCancelDelete').onclick = close;

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    // Focus password input
    setTimeout(() => pwdInput && pwdInput.focus(), 50);

    // Clear error on typing
    if (pwdInput) {
      pwdInput.addEventListener('input', () => {
        pwdInput.classList.remove('has-error');
        if (pwdError) pwdError.textContent = '';
      });
      pwdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnConfirm.click();
      });
    }

    btnConfirm.onclick = async () => {
      const pwd = pwdInput ? pwdInput.value : '';
      if (!pwd) {
        if (pwdInput) pwdInput.classList.add('has-error');
        if (pwdError) pwdError.textContent = 'Informe a senha mestre para continuar.';
        return;
      }

      let isValid = false;
      try {
        isValid = await verifyPassword(pwd);
      } catch {
        showToast('GF-LOCK-SYS-001', 'error');
        return;
      }

      if (!isValid) {
        if (pwdInput) pwdInput.classList.add('has-error');
        if (pwdError) pwdError.textContent = 'Senha mestre incorreta. Tente novamente.';
        pwdInput.value = '';
        pwdInput.focus();
        return;
      }

      close();
      try {
        await deleteEvent(ev.id);
        clearSessionIfMatches(ev.id);
        showSuccess(`Evento "${ev.name}" excluído com sucesso!`);
        await renderEvents();
      } catch (err) {
        if (err && err.code === 'GF-EVENT-REG-001') {
          showErrorModal('GF-EVENT-REG-001');
        } else {
          showToast('GF-SYSTEM-SYS-002', 'error');
        }
      }
    };
  }

  async function renderEvents() {
    if (!eventsList) return;
    const events = await getAllEvents();
    if (eventCountBadge) eventCountBadge.textContent = String(events.length);

    if (events.length === 0) {
      eventsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum evento cadastrado ainda.</p>';
      return;
    }

    const current = getSession();

    eventsList.innerHTML = events.map(ev => {
      const isCurrentActive = current.eventId && Number(current.eventId) === ev.id;
      const activeBadge = isCurrentActive
        ? '<span class="badge badge-done">Sessão Ativa</span>'
        : '';

      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-item-title">
              ${escapeHtml(ev.name)} ${activeBadge}
            </div>
            <div class="data-item-meta">
              <span>${getIcon('calendar', 13)} ${formatUtcDisplayDate(ev.date)}</span>
              <span>${getIcon('mapPin', 13)} ${escapeHtml(ev.location)}</span>
            </div>
            ${ev.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(ev.description)}</p>` : ''}
          </div>
          <div class="data-item-actions">
            <button type="button" class="btn-icon" data-action="edit-event" data-id="${ev.id}" title="Editar evento" aria-label="Editar evento">
              ${getIcon('pencil', 16)}
            </button>
            <button type="button" class="btn-icon btn-icon-danger" data-action="delete-event" data-id="${ev.id}" title="Excluir evento" aria-label="Excluir evento">
              ${getIcon('trash', 16)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.refreshEventView = renderEvents;
  renderEvents();
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
