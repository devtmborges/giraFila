/**
 * GiraFila — Screen 1: Visitor Registration View
 * Implements requirements from projectScope.md Tela 1
 */

import { getSession } from './sessionModal.js';
import { createVisitor, getVisitorByQrAndEvent, getVisitorsByEventId, updateVisitor, deleteVisitor, getVisitorById, getAttendancesByEventId } from '../services/storageService.js';
import { verifyPassword } from '../utils/masterPassword.js';
import { sanitizeText, capitalizeWords, formatPhoneNumber, parseQrTicketNumber } from '../utils/sanitizer.js';
import { showToast, showSuccess, showErrorModal } from '../services/errorHandler.js';
import { openNativeCamera } from '../utils/qrScanner.js';
import { filterVisitorsByFamilyGroup } from '../utils/familySearch.js';
import { getIcon } from '../utils/icons.js';
import { openFamilyModal } from './familyModal.js';

export function initVisitorView() {
  const form = document.getElementById('visitorForm');
  const inputQrCode = document.getElementById('visitorQrCode');
  const btnScanVisitorQr = document.getElementById('btnScanVisitorQr');
  const inputName = document.getElementById('visitorName');
  const inputGender = document.getElementById('visitorGender');
  const inputAge = document.getElementById('visitorAge');
  const toggleChild = document.getElementById('visitorIsChild');
  const phoneContainer = document.getElementById('visitorPhoneContainer');
  const inputPhone = document.getElementById('visitorPhone');
  const toggleNoPhone = document.getElementById('visitorNoPhone');
  const guardianContainer = document.getElementById('visitorGuardianContainer');
  const inputGuardianQr = document.getElementById('visitorGuardianQr');
  const btnScanGuardianQr = document.getElementById('btnScanGuardianQr');
  const guardianInfo = document.getElementById('visitorGuardianInfo');
  const visitorsList = document.getElementById('registeredVisitorsList');
  const visitorCountBadge = document.getElementById('visitorCountBadge');
  const visitorSearchInput = document.getElementById('visitorSearchInput');

  if (!form) return;

  // Cache de dados para filtragem client-side
  let cachedVisitors = [];
  let visitorSearchDebounce = null;

  // Camera scan for visitor ticket
  if (btnScanVisitorQr) {
    btnScanVisitorQr.addEventListener('click', () => {
      openNativeCamera((detectedTicket) => {
        inputQrCode.value = detectedTicket;
        inputQrCode.dispatchEvent(new Event('input'));
      });
    });
  }

  // Camera scan for guardian ticket
  if (btnScanGuardianQr) {
    btnScanGuardianQr.addEventListener('click', () => {
      openNativeCamera((detectedTicket) => {
        inputGuardianQr.value = detectedTicket;
        inputGuardianQr.dispatchEvent(new Event('input'));
      });
    });
  }

  // Clear field errors on input
  const inputs = [inputQrCode, inputName, inputGender, inputAge, inputPhone, inputGuardianQr];
  inputs.forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      inp.classList.remove('has-error');
      const errorMsg = document.getElementById(`${inp.id}Error`);
      if (errorMsg) errorMsg.classList.remove('visible');
    });
    inp.addEventListener('change', () => {
      inp.classList.remove('has-error');
      const errorMsg = document.getElementById(`${inp.id}Error`);
      if (errorMsg) errorMsg.classList.remove('visible');
    });
  });

  // Name Auto-capitalization
  inputName.addEventListener('blur', () => {
    inputName.value = capitalizeWords(inputName.value);
  });

  // Phone formatting mask
  inputPhone.addEventListener('input', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
  });

  // Toggle child vs adult dynamic display
  const updateVisibility = () => {
    const isChild = toggleChild.checked;
    if (isChild) {
      phoneContainer.style.display = 'none';
      guardianContainer.style.display = 'flex';
    } else {
      phoneContainer.style.display = 'flex';
      guardianContainer.style.display = 'none';
      guardianInfo.textContent = '';
      guardianInfo.className = 'form-error-msg';
    }
  };

  toggleChild.addEventListener('change', updateVisibility);
  updateVisibility();

  // "Não possui telefone" toggle behavior
  toggleNoPhone.addEventListener('change', () => {
    if (toggleNoPhone.checked) {
      inputPhone.value = '';
      inputPhone.disabled = true;
      inputPhone.classList.remove('has-error');
      const err = document.getElementById('visitorPhoneError');
      if (err) err.classList.remove('visible');
    } else {
      inputPhone.disabled = false;
      inputPhone.focus();
    }
  });

  // Real-time Guardian Validation
  let guardianSearchTimeout = null;
  inputGuardianQr.addEventListener('input', () => {
    clearTimeout(guardianSearchTimeout);
    const session = getSession();
    const qrVal = parseQrTicketNumber(inputGuardianQr.value);

    guardianInfo.textContent = '';
    guardianInfo.className = 'form-error-msg';

    if (!session.eventId) {
      guardianInfo.textContent = 'Selecione um evento ativo antes de cadastrar.';
      guardianInfo.classList.add('visible');
      return;
    }

    if (!qrVal) return;

    guardianSearchTimeout = setTimeout(async () => {
      const guardian = await getVisitorByQrAndEvent(qrVal, session.eventId);
      if (!guardian) {
        guardianInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Nenhum participante encontrado com este QR no evento atual.</span>';
        guardianInfo.className = 'form-error-msg visible';
        inputGuardianQr.classList.add('has-error');
      } else if (guardian.is_child) {
        guardianInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>O ticket pertence a uma criança. O responsável deve ser um adulto.</span>';
        guardianInfo.className = 'form-error-msg visible';
        inputGuardianQr.classList.add('has-error');
      } else {
        guardianInfo.innerHTML = getIcon('check', 14) + ` <span>Adulto Responsável: ${escapeHtml(guardian.name)}</span>`;
        guardianInfo.className = 'form-error-msg visible';
        guardianInfo.style.color = 'var(--color-accent)';
        inputGuardianQr.classList.remove('has-error');
      }
    }, 300);
  });

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const session = getSession();
    if (!session.eventId) {
      showToast('GF-SESSION-VAL-001', 'error', 'Selecione um evento ativo para realizar o cadastro de participantes.');
      return;
    }

    let hasError = false;

    // Validate QR Code ticket (1 to 9999)
    const qrCode = parseQrTicketNumber(inputQrCode.value);
    if (!qrCode) {
      inputQrCode.classList.add('has-error');
      const err = document.getElementById('visitorQrCodeError');
      if (err) err.classList.add('visible');
      showToast('GF-VISIT-VAL-004', 'error');
      hasError = true;
    }

    // Validate Name (alphabetic, up to 200 chars)
    const rawName = sanitizeText(inputName.value);
    const cleanName = capitalizeWords(rawName);
    inputName.value = cleanName;

    if (!cleanName || cleanName.length > 200 || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(cleanName)) {
      inputName.classList.add('has-error');
      const err = document.getElementById('visitorNameError');
      if (err) err.classList.add('visible');
      showToast('GF-VISIT-VAL-001', 'error');
      hasError = true;
    }

    // Validate Gender (Masculino or Feminino)
    const gender = inputGender ? inputGender.value : '';
    if (!gender || (gender !== 'Masculino' && gender !== 'Feminino')) {
      if (inputGender) inputGender.classList.add('has-error');
      const err = document.getElementById('visitorGenderError');
      if (err) err.classList.add('visible');
      showToast('GF-VISIT-VAL-006', 'error');
      hasError = true;
    }

    // Validate Age (0 to 120)
    const rawAge = inputAge ? inputAge.value.trim() : '';
    const ageNum = parseInt(rawAge, 10);
    if (rawAge === '' || isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      if (inputAge) inputAge.classList.add('has-error');
      const err = document.getElementById('visitorAgeError');
      if (err) err.classList.add('visible');
      showToast('GF-VISIT-VAL-005', 'error');
      hasError = true;
    }

    const isChild = toggleChild.checked;
    let phone = null;
    let hasPhone = false;
    let guardianQr = null;

    if (!isChild) {
      hasPhone = !toggleNoPhone.checked;
      if (hasPhone) {
        const digits = inputPhone.value.replace(/\D/g, '');
        if (digits.length < 10) {
          inputPhone.classList.add('has-error');
          const err = document.getElementById('visitorPhoneError');
          if (err) err.classList.add('visible');
          showToast('GF-VISIT-VAL-002', 'error');
          hasError = true;
        } else {
          phone = inputPhone.value;
        }
      }
    } else {
      guardianQr = parseQrTicketNumber(inputGuardianQr.value);
      if (!guardianQr) {
        inputGuardianQr.classList.add('has-error');
        const err = document.getElementById('visitorGuardianQrError');
        if (err) err.classList.add('visible');
        showToast('GF-VISIT-VAL-003', 'error');
        hasError = true;
      } else {
        // Validate adult guardian existence
        const guardian = await getVisitorByQrAndEvent(guardianQr, session.eventId);
        if (!guardian || guardian.is_child) {
          inputGuardianQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-002');
          return;
        }
      }
    }

    if (hasError) return;

    try {
      await createVisitor({
        event_id: session.eventId,
        qr_code: qrCode,
        name: cleanName,
        gender,
        age: ageNum,
        is_child: isChild,
        phone,
        has_phone: hasPhone,
        guardian_qr_code: guardianQr
      });

      showSuccess(`Participante ${cleanName} (Ticket #${qrCode}) cadastrado com sucesso!`);

      // Reset form
      form.reset();
      toggleChild.checked = false;
      toggleNoPhone.checked = false;
      inputPhone.disabled = false;
      updateVisibility();
      inputQrCode.focus();

      // Refresh list
      await renderRegisteredVisitors();
    } catch (err) {
      if (err.code === 'GF-VISIT-REG-001') {
        inputQrCode.classList.add('has-error');
        showErrorModal('GF-VISIT-REG-001', `O Ticket #${qrCode} já está em uso por outro participante neste evento.`);
      } else {
        showToast('GF-SYSTEM-SYS-001', 'error');
      }
    }
  });

  // Delegated actions on list (Edit / Delete)
  if (visitorsList) {
    visitorsList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit-visitor"]');
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const visitor = await getVisitorById(id);
        if (visitor) openEditVisitorModal(visitor);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete-visitor"]');
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const visitor = await getVisitorById(id);
        if (visitor) await initiateDeleteVisitor(visitor);
        return;
      }

      // Clique no card: Abrir modal do grupo familiar
      const card = e.target.closest('.data-item--clickable');
      if (card && card.dataset.qr) {
        const session = getSession();
        if (session.eventId) {
          openFamilyModal({ qrCode: card.dataset.qr, eventId: session.eventId });
        }
      }
    });
  }

  function openEditVisitorModal(visitor) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-backdrop)';

    const typeBadge = visitor.is_child
      ? `<span class="badge badge-child">Criança (Resp: #${visitor.guardian_qr_code})</span>`
      : `<span class="badge badge-adult">Adulto</span>`;

    const phoneSectionHtml = !visitor.is_child ? `
      <div id="editVisitorPhoneContainer" class="form-group">
        <label class="form-label" for="editVisitorPhone">
          <span>Telefone de Contato</span>
          <label style="display: flex; align-items: center; gap: 6px; font-weight: normal; font-size: var(--font-size-xs); cursor: pointer;">
            <input type="checkbox" id="editVisitorNoPhone" ${!visitor.has_phone ? 'checked' : ''}>
            <span>Não possui telefone</span>
          </label>
        </label>
        <input
          type="tel"
          id="editVisitorPhone"
          class="form-input"
          placeholder="(XX) XXXXX-XXXX"
          maxlength="15"
          inputmode="tel"
          value="${escapeHtml(visitor.phone || '')}"
          ${!visitor.has_phone ? 'disabled' : ''}
        >
      </div>
    ` : '';

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="z-index: var(--z-modal-primary);">
        <div class="modal-header">
          <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('pencil', 18)}
            <span>Editar Participante</span>
          </h3>
          <button type="button" class="btn-icon" id="btnEditVisitorClose" aria-label="Fechar" style="border:none; background:transparent;">${getIcon('close', 18)}</button>
        </div>
        <form id="editVisitorModalForm">
          <div class="modal-body">
            <div style="display: flex; align-items: center; gap: 8px; padding: var(--space-2) var(--space-3); background: var(--color-surface-hover); border-radius: var(--radius-sm); font-size: var(--font-size-sm);">
              <strong>Ticket #${visitor.qr_code}</strong>
              ${typeBadge}
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto;">(QR Code imutável)</span>
            </div>
            <div class="form-group">
              <label class="form-label required" for="editVisitorName">Nome do Participante</label>
              <input type="text" id="editVisitorName" class="form-input" maxlength="200" required value="${escapeHtml(visitor.name)}" />
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3);">
              <div class="form-group">
                <label class="form-label required" for="editVisitorGender">Gênero</label>
                <select id="editVisitorGender" class="form-input">
                  <option value="">-- Selecione o Gênero --</option>
                  <option value="Masculino" ${visitor.gender === 'Masculino' ? 'selected' : ''}>Masculino</option>
                  <option value="Feminino" ${visitor.gender === 'Feminino' ? 'selected' : ''}>Feminino</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required" for="editVisitorAge">Idade</label>
                <input
                  type="number"
                  id="editVisitorAge"
                  class="form-input"
                  min="0"
                  max="120"
                  placeholder="Ex: 25"
                  value="${visitor.age !== null && visitor.age !== undefined ? visitor.age : ''}"
                >
              </div>
            </div>
            ${phoneSectionHtml}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btnEditVisitorCancel">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnEditVisitorSave">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#btnEditVisitorClose').onclick = close;
    backdrop.querySelector('#btnEditVisitorCancel').onclick = close;

    const modalForm = backdrop.querySelector('#editVisitorModalForm');
    const inputModalName = backdrop.querySelector('#editVisitorName');
    const selectModalGender = backdrop.querySelector('#editVisitorGender');
    const inputModalAge = backdrop.querySelector('#editVisitorAge');
    const inputModalPhone = backdrop.querySelector('#editVisitorPhone');
    const toggleModalNoPhone = backdrop.querySelector('#editVisitorNoPhone');

    inputModalName.addEventListener('blur', () => {
      inputModalName.value = capitalizeWords(inputModalName.value);
    });

    if (inputModalPhone && toggleModalNoPhone) {
      inputModalPhone.addEventListener('input', (e) => {
        e.target.value = formatPhoneNumber(e.target.value);
      });

      toggleModalNoPhone.addEventListener('change', () => {
        if (toggleModalNoPhone.checked) {
          inputModalPhone.value = '';
          inputModalPhone.disabled = true;
          inputModalPhone.classList.remove('has-error');
        } else {
          inputModalPhone.disabled = false;
          inputModalPhone.focus();
        }
      });
    }

    modalForm.onsubmit = async (evt) => {
      evt.preventDefault();
      const cleanName = capitalizeWords(sanitizeText(inputModalName.value));
      inputModalName.value = cleanName;

      if (!cleanName || cleanName.length > 200 || !/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(cleanName)) {
        showToast('GF-VISIT-VAL-001', 'error');
        return;
      }

      const editGender = selectModalGender.value;
      if (!editGender || (editGender !== 'Masculino' && editGender !== 'Feminino')) {
        showToast('GF-VISIT-VAL-006', 'error');
        return;
      }

      const rawEditAge = inputModalAge.value.trim();
      const editAgeNum = parseInt(rawEditAge, 10);
      if (rawEditAge === '' || isNaN(editAgeNum) || editAgeNum < 0 || editAgeNum > 120) {
        showToast('GF-VISIT-VAL-005', 'error');
        return;
      }

      let phone = null;
      let hasPhone = false;

      if (!visitor.is_child) {
        hasPhone = !toggleModalNoPhone.checked;
        if (hasPhone) {
          const digits = inputModalPhone.value.replace(/\D/g, '');
          if (digits.length < 10) {
            showToast('GF-VISIT-VAL-002', 'error');
            return;
          }
          phone = inputModalPhone.value;
        }
      }

      try {
        await updateVisitor(visitor.id, {
          name: cleanName,
          gender: editGender,
          age: editAgeNum,
          phone,
          has_phone: hasPhone
        });

        showSuccess(`Participante "${cleanName}" atualizado com sucesso!`);
        close();
        await renderRegisteredVisitors();
      } catch (err) {
        showToast('GF-SYSTEM-SYS-002', 'error');
      }
    };
  }

  /**
   * Pre-checks deletion constraints then, if satisfied, shows password-protected confirmation modal.
   * Constraints:
   *  1. Visitor must not have any attendances in the active event.
   *  2. If visitor is an adult, they must not be the guardian of any child in the event.
   */
  async function initiateDeleteVisitor(visitor) {
    const session = getSession();
    const eventId = session.eventId;

    // --- Constraint 1: attendances check ---
    let attendances = [];
    try {
      attendances = await getAttendancesByEventId(eventId);
    } catch {
      showToast('GF-SYSTEM-SYS-001', 'error');
      return;
    }
    const hasAttendances = attendances.some(
      att => Number(att.visitor_qr_code) === Number(visitor.qr_code)
    );
    if (hasAttendances) {
      showToast('GF-VISIT-REG-004', 'warning');
      return;
    }

    // --- Constraint 2: guardian check (only for adults) ---
    if (!visitor.is_child) {
      let allVisitors = [];
      try {
        allVisitors = await getVisitorsByEventId(eventId);
      } catch {
        showToast('GF-SYSTEM-SYS-001', 'error');
        return;
      }
      const hasChildren = allVisitors.some(
        v => v.is_child && Number(v.guardian_qr_code) === Number(visitor.qr_code)
      );
      if (hasChildren) {
        showToast('GF-VISIT-REG-005', 'warning');
        return;
      }
    }

    // --- All constraints passed: show password-protected confirmation modal ---
    confirmDeleteVisitor(visitor);
  }

  function confirmDeleteVisitor(visitor) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    backdrop.innerHTML = `
      <div class="modal-dialog confirm" role="alertdialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="card-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 8px;">
            ${getIcon('trash', 18)}
            <span>Excluir Participante</span>
          </h3>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-base);">Deseja realmente excluir o participante <strong>${escapeHtml(visitor.name)}</strong> (Ticket #${visitor.qr_code})?</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Esta ação não poderá ser desfeita.</p>
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label required" for="deleteVisitorMasterPwd">
              ${getIcon('lock', 14)}
              Senha Mestre para Confirmar
            </label>
            <input
              type="password"
              id="deleteVisitorMasterPwd"
              class="form-input"
              placeholder="Digite a senha mestre..."
              autocomplete="current-password"
              aria-label="Senha mestre para confirmar exclusão"
            />
            <span class="form-error-msg" id="deleteVisitorMasterPwdError"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelDeleteVisitor">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmDeleteVisitor">${getIcon('trash', 14)} Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    const pwdInput = backdrop.querySelector('#deleteVisitorMasterPwd');
    const pwdError = backdrop.querySelector('#deleteVisitorMasterPwdError');
    const btnConfirm = backdrop.querySelector('#btnConfirmDeleteVisitor');

    backdrop.querySelector('#btnCancelDeleteVisitor').onclick = close;

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
      // Allow Enter to confirm
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
        await deleteVisitor(visitor.id);
        showSuccess(`Participante "${visitor.name}" excluído com sucesso!`);
        await renderRegisteredVisitors();
      } catch (err) {
        showToast('GF-SYSTEM-SYS-002', 'error');
      }
    };
  }

  // Render registered visitors list
  function renderVisitorList(visitors) {
    if (!visitorsList) return;

    if (visitors.length === 0) {
      const queryActive = visitorSearchInput && visitorSearchInput.value.trim();
      visitorsList.innerHTML = queryActive
        ? `<div class="search-no-results"><strong>Nenhum resultado encontrado</strong>Nenhum participante corresponde a "${escapeHtml(visitorSearchInput.value.trim())}".</div>`
        : '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum visitante cadastrado neste evento ainda.</p>';
      return;
    }

    visitorsList.innerHTML = visitors.map(v => {
      const typeBadge = v.is_child
        ? `<span class="badge badge-child">Criança (Resp: #${v.guardian_qr_code})</span>`
        : `<span class="badge badge-adult">Adulto ${v.has_phone ? '• ' + v.phone : '• Sem telefone'}</span>`;

      const infoParts = [];
      if (v.gender) infoParts.push(escapeHtml(v.gender));
      if (v.age !== null && v.age !== undefined && v.age !== '') infoParts.push(`${v.age} anos`);
      const extraInfo = infoParts.length > 0 ? `<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">• ${infoParts.join(', ')}</span>` : '';

      return `
        <div class="data-item data-item--clickable" data-qr="${v.qr_code}" title="Clique para ver todo o grupo familiar">
          <div class="data-item-main">
            <div class="data-item-title">
              <strong>#${v.qr_code}</strong> — ${escapeHtml(v.name)}
            </div>
            <div class="data-item-meta">
              ${typeBadge}
              ${extraInfo}
              <span class="data-item-family-hint">${getIcon('users', 12)} Ver família</span>
            </div>
          </div>
          <div class="data-item-actions">
            <button type="button" class="btn-icon" data-action="edit-visitor" data-id="${v.id}" title="Editar participante" aria-label="Editar participante">
              ${getIcon('pencil', 16)}
            </button>
            <button type="button" class="btn-icon btn-icon-danger" data-action="delete-visitor" data-id="${v.id}" title="Excluir participante" aria-label="Excluir participante">
              ${getIcon('trash', 16)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function applyVisitorSearch() {
    const query = visitorSearchInput ? visitorSearchInput.value.trim() : '';
    if (!query) {
      renderVisitorList(cachedVisitors);
      return;
    }
    const filtered = filterVisitorsByFamilyGroup(cachedVisitors, query);
    renderVisitorList(filtered);
  }

  // Listener de busca com debounce
  if (visitorSearchInput) {
    visitorSearchInput.addEventListener('input', () => {
      clearTimeout(visitorSearchDebounce);
      visitorSearchDebounce = setTimeout(applyVisitorSearch, 300);
    });
  }

  async function renderRegisteredVisitors() {
    const session = getSession();
    if (!visitorsList) return;

    if (!session.eventId) {
      visitorsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Selecione um evento para visualizar os visitantes cadastrados.</p>';
      if (visitorCountBadge) visitorCountBadge.textContent = '0';
      cachedVisitors = [];
      return;
    }

    const visitors = await getVisitorsByEventId(session.eventId);
    cachedVisitors = visitors;
    if (visitorCountBadge) visitorCountBadge.textContent = String(visitors.length);

    // Limpa busca ao trocar contexto
    if (visitorSearchInput) visitorSearchInput.value = '';

    renderVisitorList(visitors);
  }

  // Export refresh function for session changes
  window.refreshVisitorView = renderRegisteredVisitors;
  renderRegisteredVisitors();
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
