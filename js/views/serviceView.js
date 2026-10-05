/**
 * GiraFila — Screen 3: Service Management View
 * Implements requirements from projectScope.md Tela 3
 */

import { createService, getAllEvents, getAllServices, getEventById, updateService, deleteService } from '../services/storageService.js';
import { sanitizeText, capitalizeWords, formatUtcDisplayDate } from '../utils/sanitizer.js';
import { showToast, showSuccess, showErrorModal } from '../services/errorHandler.js';
import { getSession, clearSessionIfMatches, updateSessionNames } from './sessionModal.js';
import { getIcon } from '../utils/icons.js';
import { verifyPassword } from '../utils/masterPassword.js';

export function initServiceView() {
  const form = document.getElementById('serviceForm');
  const inputName = document.getElementById('serviceName');
  const inputEventSearch = document.getElementById('serviceEventSearch');
  const inputEventId = document.getElementById('serviceEventId');
  const eventDropdown = document.getElementById('serviceEventDropdown');
  const toggleAllowsChildren = document.getElementById('serviceAllowsChildren');
  const toggleAllowsAdults = document.getElementById('serviceAllowsAdults');
  const inputAttendant = document.getElementById('serviceAttendant');
  const inputDesc = document.getElementById('serviceDescription');
  const servicesList = document.getElementById('servicesList');
  const serviceCountBadge = document.getElementById('serviceCountBadge');

  if (!form) return;

  // Clear field errors on input
  [inputName, inputEventSearch, inputAttendant].forEach(inp => {
    inp.addEventListener('input', () => {
      inp.classList.remove('has-error');
      const errorMsg = document.getElementById(`${inp.id}Error`);
      if (errorMsg) errorMsg.classList.remove('visible');
    });
  });

  // Clear audience error on toggle change
  [toggleAllowsChildren, toggleAllowsAdults].forEach(toggle => {
    if (toggle) {
      toggle.addEventListener('change', () => {
        const errorMsg = document.getElementById('serviceAudienceError');
        if (errorMsg) errorMsg.classList.remove('visible');
      });
    }
  });

  // Capitalization on blur
  inputName.addEventListener('blur', () => {
    inputName.value = capitalizeWords(inputName.value);
  });

  inputAttendant.addEventListener('blur', () => {
    inputAttendant.value = capitalizeWords(inputAttendant.value);
  });

  // Smart Autocomplete for Event (Triggered after 3+ characters typed)
  let cachedEvents = [];
  inputEventSearch.addEventListener('input', async () => {
    const query = inputEventSearch.value.trim().toLowerCase();
    inputEventId.value = ''; // Reset selected ID while typing

    if (query.length < 3) {
      eventDropdown.classList.remove('visible');
      eventDropdown.innerHTML = '';
      return;
    }

    if (cachedEvents.length === 0) {
      cachedEvents = await getAllEvents();
    }

    const matches = cachedEvents.filter(ev =>
      ev.name.toLowerCase().includes(query) ||
      ev.date.includes(query) ||
      ev.location.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      eventDropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--color-text-muted); cursor: default;">Nenhum evento encontrado</div>';
      eventDropdown.classList.add('visible');
      return;
    }

    eventDropdown.innerHTML = matches.map(ev => `
      <div class="autocomplete-item" data-id="${ev.id}" data-name="${escapeHtml(ev.name)}">
        <strong>${escapeHtml(ev.name)}</strong> (${formatUtcDisplayDate(ev.date)}) — ${escapeHtml(ev.location)}
      </div>
    `).join('');

    eventDropdown.classList.add('visible');

    // Click on suggestion
    eventDropdown.querySelectorAll('.autocomplete-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        inputEventId.value = item.getAttribute('data-id');
        inputEventSearch.value = item.getAttribute('data-name');
        eventDropdown.classList.remove('visible');
        inputEventSearch.classList.remove('has-error');
        const err = document.getElementById('serviceEventSearchError');
        if (err) err.classList.remove('visible');
      });
    });
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!eventDropdown.contains(e.target) && e.target !== inputEventSearch) {
      eventDropdown.classList.remove('visible');
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let hasError = false;

    // Validate Name
    const rawName = sanitizeText(inputName.value);
    const cleanName = capitalizeWords(rawName);
    inputName.value = cleanName;

    if (!cleanName) {
      inputName.classList.add('has-error');
      const err = document.getElementById('serviceNameError');
      if (err) err.classList.add('visible');
      showToast('GF-SERV-VAL-001', 'error');
      hasError = true;
    }

    // Validate Selected Event ID
    const eventId = inputEventId.value;
    if (!eventId) {
      inputEventSearch.classList.add('has-error');
      const err = document.getElementById('serviceEventSearchError');
      if (err) err.classList.add('visible');
      showToast('GF-SERV-VAL-001', 'error', 'Selecione um evento válido a partir das sugestões.');
      hasError = true;
    }

    // Validate Attendant Name (up to 200 chars)
    const rawAttendant = sanitizeText(inputAttendant.value);
    const cleanAttendant = capitalizeWords(rawAttendant);
    inputAttendant.value = cleanAttendant;

    if (!cleanAttendant || cleanAttendant.length > 200) {
      inputAttendant.classList.add('has-error');
      const err = document.getElementById('serviceAttendantError');
      if (err) err.classList.add('visible');
      showToast('GF-SERV-VAL-002', 'error');
      hasError = true;
    }

    // Validate Audience (At least one must be selected)
    const allowsChildren = toggleAllowsChildren ? toggleAllowsChildren.checked : true;
    const allowsAdults = toggleAllowsAdults ? toggleAllowsAdults.checked : true;

    if (!allowsChildren && !allowsAdults) {
      const err = document.getElementById('serviceAudienceError');
      if (err) err.classList.add('visible');
      showToast('GF-SERV-VAL-003', 'error', 'Selecione pelo menos um público para o serviço (Crianças e/ou Adultos).');
      hasError = true;
    }

    if (hasError) return;

    const rawDesc = sanitizeText(inputDesc.value);
    const cleanDesc = rawDesc.slice(0, 200);

    try {
      await createService({
        name: cleanName,
        event_id: Number(eventId),
        allows_children: allowsChildren,
        allows_adults: allowsAdults,
        only_children: allowsChildren && !allowsAdults,
        only_adults: allowsAdults && !allowsChildren,
        attendant_name: cleanAttendant,
        description: cleanDesc
      });

      showSuccess(`Serviço "${cleanName}" cadastrado com sucesso!`);
      form.reset();
      inputEventId.value = '';
      if (toggleAllowsChildren) toggleAllowsChildren.checked = false;
      if (toggleAllowsAdults) toggleAllowsAdults.checked = false;
      cachedEvents = [];
      await renderServices();
    } catch {
      showToast('GF-SYSTEM-SYS-001', 'error');
    }
  });

  // Delegated actions on list (Edit / Delete)
  if (servicesList) {
    servicesList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit-service"]');
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const services = await getAllServices();
        const srv = services.find(x => x.id === id);
        if (srv) openEditServiceModal(srv);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete-service"]');
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const services = await getAllServices();
        const srv = services.find(x => x.id === id);
        if (srv) confirmDeleteService(srv);
        return;
      }
    });
  }

  async function openEditServiceModal(srv) {
    const events = await getAllEvents();
    const allowsCh = srv.allows_children !== undefined ? srv.allows_children : !srv.only_adults;
    const allowsAd = srv.allows_adults !== undefined ? srv.allows_adults : !srv.only_children;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-backdrop)';

    const eventOptionsHtml = events.map(ev => `
      <option value="${ev.id}" ${ev.id === srv.event_id ? 'selected' : ''}>
        ${escapeHtml(ev.name)} (${formatUtcDisplayDate(ev.date)})
      </option>
    `).join('');

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="z-index: var(--z-modal-primary);">
        <div class="modal-header">
          <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('pencil', 18)}
            <span>Editar Serviço</span>
          </h3>
          <button type="button" class="btn-icon" id="btnEditServiceClose" aria-label="Fechar" style="border:none; background:transparent;">${getIcon('close', 18)}</button>
        </div>
        <form id="editServiceModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label required" for="editServiceName">Nome do Serviço</label>
              <input type="text" id="editServiceName" class="form-input" required value="${escapeHtml(srv.name)}" />
            </div>
            <div class="form-group">
              <label class="form-label required" for="editServiceEventId">Evento Vinculado</label>
              <select id="editServiceEventId" class="form-input" required>
                ${eventOptionsHtml}
              </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2); background: var(--color-surface-hover); padding: var(--space-3); border-radius: var(--radius-sm);">
              <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">Público:</span>
              <div class="toggle-wrapper" style="padding: 0;">
                <label class="toggle-label" for="editServiceAllowsChildren">Crianças</label>
                <label class="toggle-switch">
                  <input type="checkbox" id="editServiceAllowsChildren" ${allowsCh ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="toggle-wrapper" style="padding: 0;">
                <label class="toggle-label" for="editServiceAllowsAdults">Adultos</label>
                <label class="toggle-switch">
                  <input type="checkbox" id="editServiceAllowsAdults" ${allowsAd ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required" for="editServiceAttendant">Responsável pelo Atendimento</label>
              <input type="text" id="editServiceAttendant" class="form-input" maxlength="200" required value="${escapeHtml(srv.attendant_name || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="editServiceDescription">Descrição / Detalhes</label>
              <textarea id="editServiceDescription" class="form-textarea" maxlength="200" rows="3">${escapeHtml(srv.description || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btnEditServiceCancel">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnEditServiceSave">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#btnEditServiceClose').onclick = close;
    backdrop.querySelector('#btnEditServiceCancel').onclick = close;

    const modalForm = backdrop.querySelector('#editServiceModalForm');
    const inputModalName = backdrop.querySelector('#editServiceName');
    const selectModalEvent = backdrop.querySelector('#editServiceEventId');
    const checkModalCh = backdrop.querySelector('#editServiceAllowsChildren');
    const checkModalAd = backdrop.querySelector('#editServiceAllowsAdults');
    const inputModalAtt = backdrop.querySelector('#editServiceAttendant');
    const inputModalDesc = backdrop.querySelector('#editServiceDescription');

    inputModalName.addEventListener('blur', () => {
      inputModalName.value = capitalizeWords(inputModalName.value);
    });
    inputModalAtt.addEventListener('blur', () => {
      inputModalAtt.value = capitalizeWords(inputModalAtt.value);
    });

    modalForm.onsubmit = async (evt) => {
      evt.preventDefault();
      const cleanName = capitalizeWords(sanitizeText(inputModalName.value));
      inputModalName.value = cleanName;

      if (!cleanName) {
        showToast('GF-SERV-VAL-001', 'error');
        return;
      }

      const eventId = selectModalEvent.value;
      if (!eventId) {
        showToast('GF-SERV-VAL-001', 'error', 'Selecione um evento válido.');
        return;
      }

      const cleanAttendant = capitalizeWords(sanitizeText(inputModalAtt.value));
      inputModalAtt.value = cleanAttendant;
      if (!cleanAttendant || cleanAttendant.length > 200) {
        showToast('GF-SERV-VAL-002', 'error');
        return;
      }

      const modalAllowsCh = checkModalCh.checked;
      const modalAllowsAd = checkModalAd.checked;
      if (!modalAllowsCh && !modalAllowsAd) {
        showToast('GF-SERV-VAL-003', 'error', 'Selecione pelo menos um público para o serviço (Crianças e/ou Adultos).');
        return;
      }

      const cleanDesc = sanitizeText(inputModalDesc.value).slice(0, 200);

      try {
        await updateService(srv.id, {
          name: cleanName,
          event_id: Number(eventId),
          allows_children: modalAllowsCh,
          allows_adults: modalAllowsAd,
          only_children: modalAllowsCh && !modalAllowsAd,
          only_adults: modalAllowsAd && !modalAllowsCh,
          attendant_name: cleanAttendant,
          description: cleanDesc
        });

        updateSessionNames(null, null, srv.id, cleanName);
        showSuccess(`Serviço "${cleanName}" atualizado com sucesso!`);
        close();
        await renderServices();
      } catch (err) {
        showToast('GF-SYSTEM-SYS-002', 'error');
      }
    };
  }

  function confirmDeleteService(srv) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    backdrop.innerHTML = `
      <div class="modal-dialog confirm" role="alertdialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="card-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 8px;">
            ${getIcon('trash', 18)}
            <span>Excluir Serviço</span>
          </h3>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-base);">Deseja realmente excluir o serviço <strong>${escapeHtml(srv.name)}</strong>?</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Esta ação não poderá ser desfeita.</p>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label required" for="deleteServiceMasterPwd">
              ${getIcon('lock', 14)}
              Senha Mestre para Confirmar
            </label>
            <input
              type="password"
              id="deleteServiceMasterPwd"
              class="form-input"
              placeholder="Digite a senha mestre..."
              autocomplete="current-password"
              aria-label="Senha mestre para confirmar exclusão do serviço"
            />
            <span class="form-error-msg" id="deleteServiceMasterPwdError"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelDeleteService">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmDeleteService">${getIcon('trash', 14)} Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    const pwdInput = backdrop.querySelector('#deleteServiceMasterPwd');
    const pwdError = backdrop.querySelector('#deleteServiceMasterPwdError');
    const btnConfirm = backdrop.querySelector('#btnConfirmDeleteService');

    backdrop.querySelector('#btnCancelDeleteService').onclick = close;

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
        await deleteService(srv.id);
        clearSessionIfMatches(null, srv.id);
        showSuccess(`Serviço "${srv.name}" excluído com sucesso!`);
        await renderServices();
      } catch (err) {
        if (err && err.code === 'GF-SERV-REG-001') {
          showErrorModal('GF-SERV-REG-001');
        } else {
          showToast('GF-SYSTEM-SYS-002', 'error');
        }
      }
    };
  }

  async function renderServices() {
    if (!servicesList) return;
    const services = await getAllServices();
    const events = await getAllEvents();
    const eventsMap = new Map(events.map(e => [e.id, e]));

    if (serviceCountBadge) serviceCountBadge.textContent = String(services.length);

    if (services.length === 0) {
      servicesList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum serviço cadastrado ainda.</p>';
      return;
    }

    const session = getSession();

    servicesList.innerHTML = services.map(srv => {
      const ev = eventsMap.get(srv.event_id);
      const evName = ev ? ev.name : 'Evento #' + srv.event_id;

      // Inclusive audience badge display
      const allowsCh = srv.allows_children !== undefined ? srv.allows_children : !srv.only_adults;
      const allowsAd = srv.allows_adults !== undefined ? srv.allows_adults : !srv.only_children;

      let audienceBadge = '';
      if (allowsCh && allowsAd) {
        audienceBadge = '<span class="badge" style="background: #ede9fe; color: #6d28d9;">Público: Todos</span>';
      } else if (allowsCh) {
        audienceBadge = '<span class="badge badge-child">Público: Crianças</span>';
      } else if (allowsAd) {
        audienceBadge = '<span class="badge badge-adult">Público: Adultos</span>';
      }

      const isCurrentActive = session.serviceId && Number(session.serviceId) === srv.id;
      const activeBadge = isCurrentActive
        ? '<span class="badge badge-done">Sessão Ativa</span>'
        : '';

      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-item-title">
              ${escapeHtml(srv.name)} ${audienceBadge} ${activeBadge}
            </div>
            <div class="data-item-meta">
              <span>${getIcon('calendar', 13)} ${escapeHtml(evName)}</span>
              <span>${getIcon('user', 13)} Resp: ${escapeHtml(srv.attendant_name)}</span>
            </div>
            ${srv.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(srv.description)}</p>` : ''}
          </div>
          <div class="data-item-actions">
            <button type="button" class="btn-icon" data-action="edit-service" data-id="${srv.id}" title="Editar serviço" aria-label="Editar serviço">
              ${getIcon('pencil', 16)}
            </button>
            <button type="button" class="btn-icon btn-icon-danger" data-action="delete-service" data-id="${srv.id}" title="Excluir serviço" aria-label="Excluir serviço">
              ${getIcon('trash', 16)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Pre-fill search if current session has event
  const prefillSessionEvent = async () => {
    const session = getSession();
    if (session.eventId && !inputEventId.value) {
      const ev = await getEventById(session.eventId);
      if (ev) {
        inputEventId.value = ev.id;
        inputEventSearch.value = ev.name;
      }
    }
  };

  window.refreshServiceView = async () => {
    cachedEvents = [];
    await renderServices();
    await prefillSessionEvent();
  };

  renderServices();
  prefillSessionEvent();
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
