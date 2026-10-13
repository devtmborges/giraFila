/**
 * GiraFila — Screen 1: Visitor Registration View
 * Implements requirements from projectScope.md Tela 1
 */

import { getSession } from './sessionModal.js';
import { createVisitor, getVisitorByQrAndEvent, getVisitorsByEventId, updateVisitor, deleteVisitor, getVisitorById, getAttendancesByEventId, getServicesByEventId } from '../services/storageService.js';
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
  const toggleFamily = document.getElementById('visitorIsFamily');
  const phoneContainer = document.getElementById('visitorPhoneContainer');
  const inputPhone = document.getElementById('visitorPhone');
  const toggleNoPhone = document.getElementById('visitorNoPhone');
  const familyContainer = document.getElementById('visitorFamilyContainer');
  const inputFamilyQr = document.getElementById('visitorFamilyQr');
  const btnScanFamilyQr = document.getElementById('btnScanFamilyQr');
  const familyInfo = document.getElementById('visitorFamilyInfo');
  const guardianContainer = document.getElementById('visitorGuardianContainer');
  const inputGuardianQr = document.getElementById('visitorGuardianQr');
  const btnScanGuardianQr = document.getElementById('btnScanGuardianQr');
  const guardianInfo = document.getElementById('visitorGuardianInfo');
  const visitorsList = document.getElementById('registeredVisitorsList');
  const visitorCountBadge = document.getElementById('visitorCountBadge');
  const visitorSearchInput = document.getElementById('visitorSearchInput');
  const visitorFilterAge = document.getElementById('visitorFilterAge');
  const visitorFilterService = document.getElementById('visitorFilterService');
  const visitorTypePills = document.getElementById('visitorTypePills');
  const btnResetVisitorFilters = document.getElementById('btnResetVisitorFilters');

  if (!form) return;

  // Cache de dados para filtragem client-side
  let cachedVisitors = [];
  let cachedServices = [];
  let cachedAttendances = [];
  let visitorSearchDebounce = null;
  let activeAgeFilter = 'all';
  let activeServiceFilter = 'all';
  let activeTypeFilter = 'all';

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

  // Camera scan for family adult ticket
  if (btnScanFamilyQr) {
    btnScanFamilyQr.addEventListener('click', () => {
      openNativeCamera((detectedTicket) => {
        inputFamilyQr.value = detectedTicket;
        inputFamilyQr.dispatchEvent(new Event('input'));
      });
    });
  }

  // Clear field errors on input
  const inputs = [inputQrCode, inputName, inputGender, inputAge, inputPhone, inputGuardianQr, inputFamilyQr];
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

  // Toggle child vs adult dynamic display (three-state: child / family / solo adult)
  const updateVisibility = () => {
    const isChild = toggleChild.checked;
    const isFamily = toggleFamily.checked;

    if (isChild) {
      // Child mode: hide phone and family link; show guardian section
      phoneContainer.style.display = 'none';
      familyContainer.style.display = 'none';
      guardianContainer.style.display = 'flex';
      // Clear family state
      if (familyInfo) { familyInfo.textContent = ''; familyInfo.className = 'form-error-msg'; }
      if (inputFamilyQr) inputFamilyQr.value = '';
    } else if (isFamily) {
      // Family adult mode: show phone + family link; hide guardian section
      phoneContainer.style.display = 'flex';
      familyContainer.style.display = 'flex';
      guardianContainer.style.display = 'none';
      if (guardianInfo) { guardianInfo.textContent = ''; guardianInfo.className = 'form-error-msg'; }
      if (inputGuardianQr) inputGuardianQr.value = '';
    } else {
      // Solo adult mode: show phone only
      phoneContainer.style.display = 'flex';
      familyContainer.style.display = 'none';
      guardianContainer.style.display = 'none';
      if (guardianInfo) { guardianInfo.textContent = ''; guardianInfo.className = 'form-error-msg'; }
      if (familyInfo) { familyInfo.textContent = ''; familyInfo.className = 'form-error-msg'; }
      if (inputGuardianQr) inputGuardianQr.value = '';
      if (inputFamilyQr) inputFamilyQr.value = '';
    }
  };

  // Mutually exclusive toggles
  toggleChild.addEventListener('change', () => {
    if (toggleChild.checked && toggleFamily) toggleFamily.checked = false;
    updateVisibility();
  });
  if (toggleFamily) {
    toggleFamily.addEventListener('change', () => {
      if (toggleFamily.checked) toggleChild.checked = false;
      updateVisibility();
    });
  }
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

  // Real-time Guardian Validation (child mode)
  let guardianSearchTimeout = null;
  inputGuardianQr.addEventListener('input', () => {
    clearTimeout(guardianSearchTimeout);
    const session = getSession();
    const qrVal = parseQrTicketNumber(inputGuardianQr.value);

    guardianInfo.textContent = '';
    guardianInfo.className = 'form-error-msg';
    guardianInfo.style.color = '';

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

  // Real-time Family Adult Validation (family mode)
  let familySearchTimeout = null;
  if (inputFamilyQr) {
    inputFamilyQr.addEventListener('input', () => {
      clearTimeout(familySearchTimeout);
      const session = getSession();
      const qrVal = parseQrTicketNumber(inputFamilyQr.value);
      const currentQr = parseQrTicketNumber(inputQrCode.value);

      familyInfo.textContent = '';
      familyInfo.className = 'form-error-msg';
      familyInfo.style.color = '';

      if (!session.eventId) {
        familyInfo.textContent = 'Selecione um evento ativo antes de cadastrar.';
        familyInfo.classList.add('visible');
        return;
      }

      if (!qrVal) return;

      familySearchTimeout = setTimeout(async () => {
        // Self-reference check
        if (currentQr && qrVal === currentQr) {
          familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>O ticket não pode ser o mesmo do participante sendo cadastrado.</span>';
          familyInfo.className = 'form-error-msg visible';
          inputFamilyQr.classList.add('has-error');
          return;
        }
        const linked = await getVisitorByQrAndEvent(qrVal, session.eventId);
        if (!linked) {
          familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Nenhum adulto encontrado com este ticket no evento atual.</span>';
          familyInfo.className = 'form-error-msg visible';
          inputFamilyQr.classList.add('has-error');
        } else if (linked.is_child) {
          familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Vínculo inválido: o ticket pertence a uma criança.</span>';
          familyInfo.className = 'form-error-msg visible';
          inputFamilyQr.classList.add('has-error');
        } else {
          familyInfo.innerHTML = getIcon('check', 14) + ` <span>Adulto encontrado: ${escapeHtml(linked.name)}</span>`;
          familyInfo.className = 'form-error-msg visible';
          familyInfo.style.color = 'var(--color-accent)';
          inputFamilyQr.classList.remove('has-error');
        }
      }, 300);
    });
  }

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
    const isFamily = toggleFamily ? toggleFamily.checked : false;
    let phone = null;
    let hasPhone = false;
    let guardianQr = null;

    if (isChild) {
      // Child: requires guardian QR
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
    } else if (isFamily) {
      // Family adult: requires phone (or no-phone toggle) + valid family QR
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

      const familyQrVal = parseQrTicketNumber(inputFamilyQr.value);
      if (!familyQrVal) {
        if (inputFamilyQr) inputFamilyQr.classList.add('has-error');
        const err = document.getElementById('visitorFamilyQrError');
        if (err) err.classList.add('visible');
        showToast('GF-VISIT-VAL-007', 'error');
        hasError = true;
      } else if (familyQrVal === qrCode) {
        if (inputFamilyQr) inputFamilyQr.classList.add('has-error');
        showErrorModal('GF-VISIT-REG-006');
        return;
      } else {
        const linked = await getVisitorByQrAndEvent(familyQrVal, session.eventId);
        if (!linked || linked.is_child) {
          if (inputFamilyQr) inputFamilyQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-006');
          return;
        }
        guardianQr = familyQrVal;
      }
    } else {
      // Solo adult: phone optional per toggle
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
      if (toggleFamily) toggleFamily.checked = false;
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

    const session = getSession();
    const eventId = session.eventId || visitor.event_id;
    const initialIsChild = Boolean(visitor.is_child);
    const initialIsFamily = !initialIsChild && Boolean(visitor.guardian_qr_code);

    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" style="z-index: var(--z-modal-primary); max-width: 520px; width: 100%;">
        <div class="modal-header">
          <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('pencil', 18)}
            <span>Editar Participante</span>
          </h3>
          <button type="button" class="btn-icon" id="btnEditVisitorClose" aria-label="Fechar" style="border:none; background:transparent;">${getIcon('close', 18)}</button>
        </div>
        <form id="editVisitorModalForm">
          <div class="modal-body">
            <div style="display: flex; align-items: center; gap: 8px; padding: var(--space-2) var(--space-3); background: var(--color-surface-hover); border-radius: var(--radius-sm); font-size: var(--font-size-sm); margin-bottom: var(--space-3);">
              <strong>Ticket #${visitor.qr_code}</strong>
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

            <!-- Toggle Criança -->
            <div class="toggle-wrapper"
              style="background-color: var(--color-surface-hover); border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3); margin-top: var(--space-3);">
              <label class="toggle-label" for="editVisitorIsChild" style="cursor: pointer;">
                <strong>É menor de idade (Criança)?</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  Exige vínculo obrigatório com um adulto responsável
                </div>
              </label>
              <label class="toggle-switch">
                <input type="checkbox" id="editVisitorIsChild" ${initialIsChild ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Toggle Grupo Familiar -->
            <div class="toggle-wrapper"
              style="background-color: var(--color-surface-hover); border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3); margin-top: var(--space-2);">
              <label class="toggle-label" for="editVisitorIsFamily" style="cursor: pointer;">
                <strong>Grupo Familiar</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  Vincular este adulto a outro adulto já cadastrado na família
                </div>
              </label>
              <label class="toggle-switch">
                <input type="checkbox" id="editVisitorIsFamily" ${initialIsFamily ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Dynamic Family Adult Section (When Grupo Familiar = true) -->
            <div id="editVisitorFamilyContainer" class="form-group" style="${initialIsFamily ? '' : 'display: none;'} margin-top: var(--space-3);">
              <label class="form-label" for="editVisitorFamilyQr">
                <span>Vincular a outro adulto?</span>
                <button type="button" class="btn btn-secondary" id="btnScanEditFamilyQr"
                  style="display: none; min-height: 28px; padding: 2px 8px; font-size: var(--font-size-xs);">
                  ${getIcon('camera', 13)}
                  <span>Escanear</span>
                </button>
              </label>
              <input type="number" id="editVisitorFamilyQr" class="form-input"
                placeholder="Digite o número do ticket do outro adulto" min="1" max="9999" inputmode="numeric"
                value="${initialIsFamily ? (visitor.guardian_qr_code || '') : ''}">
              <span class="form-error-msg" id="editVisitorFamilyQrError">Informe o ticket do outro adulto para vincular a família.</span>
              <div id="editVisitorFamilyInfo" class="form-error-msg"></div>
            </div>

            <!-- Dynamic Phone Section (When Criança = false) -->
            <div id="editVisitorPhoneContainer" class="form-group" style="${initialIsChild ? 'display: none;' : ''} margin-top: var(--space-3);">
              <label class="form-label" for="editVisitorPhone">Telefone de Contato</label>
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
              <span class="form-error-msg" id="editVisitorPhoneError">Informe o telefone completo no formato (XX) XXXXX-XXXX.</span>
              <div class="toggle-wrapper"
                style="margin-top: var(--space-2); padding: var(--space-2) var(--space-3); background-color: var(--color-surface-hover); border-radius: var(--radius-sm);">
                <label class="toggle-label" for="editVisitorNoPhone" style="cursor: pointer;">
                  <strong>Não possui telefone</strong>
                  <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Marque caso o participante não possua número de contato</div>
                </label>
                <label class="toggle-switch">
                  <input type="checkbox" id="editVisitorNoPhone" ${!visitor.has_phone ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- Dynamic Guardian Section (When Criança = true) -->
            <div id="editVisitorGuardianContainer" class="form-group" style="${initialIsChild ? '' : 'display: none;'} margin-top: var(--space-3);">
              <label class="form-label" for="editVisitorGuardianQr">
                <span>Número do QR Code do Adulto Responsável</span>
                <button type="button" class="btn btn-secondary" id="btnScanEditGuardianQr"
                  style="display: none; min-height: 28px; padding: 2px 8px; font-size: var(--font-size-xs);">
                  ${getIcon('camera', 13)}
                  <span>Escanear</span>
                </button>
              </label>
              <input type="number" id="editVisitorGuardianQr" class="form-input"
                placeholder="Digite o número do ticket do adulto responsável" min="1" max="9999" inputmode="numeric"
                value="${initialIsChild ? (visitor.guardian_qr_code || '') : ''}">
              <span class="form-error-msg" id="editVisitorGuardianQrError">O QR Code do adulto responsável é obrigatório.</span>
              <div id="editVisitorGuardianInfo" class="form-error-msg"></div>
            </div>
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
    const toggleModalChild = backdrop.querySelector('#editVisitorIsChild');
    const toggleModalFamily = backdrop.querySelector('#editVisitorIsFamily');
    const phoneContainer = backdrop.querySelector('#editVisitorPhoneContainer');
    const inputModalPhone = backdrop.querySelector('#editVisitorPhone');
    const toggleModalNoPhone = backdrop.querySelector('#editVisitorNoPhone');
    const familyContainer = backdrop.querySelector('#editVisitorFamilyContainer');
    const inputModalFamilyQr = backdrop.querySelector('#editVisitorFamilyQr');
    const btnScanEditFamilyQr = backdrop.querySelector('#btnScanEditFamilyQr');
    const familyInfo = backdrop.querySelector('#editVisitorFamilyInfo');
    const guardianContainer = backdrop.querySelector('#editVisitorGuardianContainer');
    const inputModalGuardianQr = backdrop.querySelector('#editVisitorGuardianQr');
    const btnScanEditGuardianQr = backdrop.querySelector('#btnScanEditGuardianQr');
    const guardianInfo = backdrop.querySelector('#editVisitorGuardianInfo');

    // Camera scan buttons
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (btnScanEditGuardianQr) {
        btnScanEditGuardianQr.style.display = 'inline-flex';
        btnScanEditGuardianQr.addEventListener('click', () => {
          openNativeCamera((detectedTicket) => {
            inputModalGuardianQr.value = detectedTicket;
            inputModalGuardianQr.dispatchEvent(new Event('input'));
          });
        });
      }
      if (btnScanEditFamilyQr) {
        btnScanEditFamilyQr.style.display = 'inline-flex';
        btnScanEditFamilyQr.addEventListener('click', () => {
          openNativeCamera((detectedTicket) => {
            inputModalFamilyQr.value = detectedTicket;
            inputModalFamilyQr.dispatchEvent(new Event('input'));
          });
        });
      }
    }

    inputModalName.addEventListener('blur', () => {
      inputModalName.value = capitalizeWords(inputModalName.value);
    });

    inputModalPhone.addEventListener('input', (e) => {
      e.target.value = formatPhoneNumber(e.target.value);
    });

    toggleModalNoPhone.addEventListener('change', () => {
      if (toggleModalNoPhone.checked) {
        inputModalPhone.value = '';
        inputModalPhone.disabled = true;
        inputModalPhone.classList.remove('has-error');
        const err = backdrop.querySelector('#editVisitorPhoneError');
        if (err) err.classList.remove('visible');
      } else {
        inputModalPhone.disabled = false;
        inputModalPhone.focus();
      }
    });

    // Visibility toggling
    const updateModalVisibility = () => {
      const isChild = toggleModalChild.checked;
      const isFamily = toggleModalFamily.checked;

      if (isChild) {
        phoneContainer.style.display = 'none';
        familyContainer.style.display = 'none';
        guardianContainer.style.display = 'flex';
        if (familyInfo) { familyInfo.textContent = ''; familyInfo.className = 'form-error-msg'; }
        if (inputModalFamilyQr) inputModalFamilyQr.value = '';
      } else if (isFamily) {
        phoneContainer.style.display = 'flex';
        familyContainer.style.display = 'flex';
        guardianContainer.style.display = 'none';
        if (guardianInfo) { guardianInfo.textContent = ''; guardianInfo.className = 'form-error-msg'; }
        if (inputModalGuardianQr) inputModalGuardianQr.value = '';
      } else {
        phoneContainer.style.display = 'flex';
        familyContainer.style.display = 'none';
        guardianContainer.style.display = 'none';
        if (guardianInfo) { guardianInfo.textContent = ''; guardianInfo.className = 'form-error-msg'; }
        if (familyInfo) { familyInfo.textContent = ''; familyInfo.className = 'form-error-msg'; }
        if (inputModalGuardianQr) inputModalGuardianQr.value = '';
        if (inputModalFamilyQr) inputModalFamilyQr.value = '';
      }
    };

    toggleModalChild.addEventListener('change', () => {
      if (toggleModalChild.checked && toggleModalFamily) toggleModalFamily.checked = false;
      updateModalVisibility();
    });
    toggleModalFamily.addEventListener('change', () => {
      if (toggleModalFamily.checked && toggleModalChild) toggleModalChild.checked = false;
      updateModalVisibility();
    });

    // Real-time Guardian Validation (Child mode)
    let guardianTimeout = null;
    const validateGuardianTicket = () => {
      clearTimeout(guardianTimeout);
      const qrVal = parseQrTicketNumber(inputModalGuardianQr.value);
      guardianInfo.textContent = '';
      guardianInfo.className = 'form-error-msg';
      guardianInfo.style.color = '';
      inputModalGuardianQr.classList.remove('has-error');

      if (!qrVal) return;

      if (qrVal === Number(visitor.qr_code)) {
        guardianInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>O responsável não pode ser o próprio participante.</span>';
        guardianInfo.className = 'form-error-msg visible';
        inputModalGuardianQr.classList.add('has-error');
        return;
      }

      guardianTimeout = setTimeout(async () => {
        const guardian = await getVisitorByQrAndEvent(qrVal, eventId);
        if (!guardian) {
          guardianInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Nenhum participante encontrado com este QR no evento atual.</span>';
          guardianInfo.className = 'form-error-msg visible';
          inputModalGuardianQr.classList.add('has-error');
        } else if (guardian.is_child) {
          guardianInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>O ticket pertence a uma criança. O responsável deve ser um adulto.</span>';
          guardianInfo.className = 'form-error-msg visible';
          inputModalGuardianQr.classList.add('has-error');
        } else {
          guardianInfo.innerHTML = getIcon('check', 14) + ` <span>Adulto Responsável: ${escapeHtml(guardian.name)}</span>`;
          guardianInfo.className = 'form-error-msg visible';
          guardianInfo.style.color = 'var(--color-accent)';
          inputModalGuardianQr.classList.remove('has-error');
        }
      }, 300);
    };
    inputModalGuardianQr.addEventListener('input', validateGuardianTicket);

    // Real-time Family Adult Validation (Family mode)
    let familyTimeout = null;
    const validateFamilyTicket = () => {
      clearTimeout(familyTimeout);
      const qrVal = parseQrTicketNumber(inputModalFamilyQr.value);
      familyInfo.textContent = '';
      familyInfo.className = 'form-error-msg';
      familyInfo.style.color = '';
      inputModalFamilyQr.classList.remove('has-error');

      if (!qrVal) return;

      if (qrVal === Number(visitor.qr_code)) {
        familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>O ticket não pode ser o mesmo do participante sendo editado.</span>';
        familyInfo.className = 'form-error-msg visible';
        inputModalFamilyQr.classList.add('has-error');
        return;
      }

      familyTimeout = setTimeout(async () => {
        const linked = await getVisitorByQrAndEvent(qrVal, eventId);
        if (!linked) {
          familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Nenhum adulto encontrado com este ticket no evento atual.</span>';
          familyInfo.className = 'form-error-msg visible';
          inputModalFamilyQr.classList.add('has-error');
        } else if (linked.is_child) {
          familyInfo.innerHTML = getIcon('alertTriangle', 14) + ' <span>Vínculo inválido: o ticket pertence a uma criança.</span>';
          familyInfo.className = 'form-error-msg visible';
          inputModalFamilyQr.classList.add('has-error');
        } else {
          familyInfo.innerHTML = getIcon('check', 14) + ` <span>Adulto encontrado: ${escapeHtml(linked.name)}</span>`;
          familyInfo.className = 'form-error-msg visible';
          familyInfo.style.color = 'var(--color-accent)';
          inputModalFamilyQr.classList.remove('has-error');
        }
      }, 300);
    };
    inputModalFamilyQr.addEventListener('input', validateFamilyTicket);

    // Trigger initial lookup if editing pre-existing relationship
    if (initialIsChild && visitor.guardian_qr_code) {
      validateGuardianTicket();
    } else if (initialIsFamily && visitor.guardian_qr_code) {
      validateFamilyTicket();
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

      const newIsChild = toggleModalChild.checked;
      const newIsFamily = toggleModalFamily.checked;
      let newPhone = null;
      let newHasPhone = false;
      let newGuardianQr = null;

      // Integrity check: If converting an adult to child, ensure they are not guardian for others
      if (newIsChild && !visitor.is_child) {
        try {
          const currentEventVisitors = await getVisitorsByEventId(eventId);
          const isGuardianForOthers = currentEventVisitors.some(
            v => v.id !== visitor.id && Number(v.guardian_qr_code) === Number(visitor.qr_code)
          );
          if (isGuardianForOthers) {
            showErrorModal('GF-VISIT-REG-007');
            return;
          }
        } catch {
          // Fallback continue
        }
      }

      if (newIsChild) {
        newGuardianQr = parseQrTicketNumber(inputModalGuardianQr.value);
        if (!newGuardianQr) {
          inputModalGuardianQr.classList.add('has-error');
          showToast('GF-VISIT-VAL-003', 'error');
          return;
        }
        if (newGuardianQr === Number(visitor.qr_code)) {
          inputModalGuardianQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-006');
          return;
        }
        const guardian = await getVisitorByQrAndEvent(newGuardianQr, eventId);
        if (!guardian || guardian.is_child) {
          inputModalGuardianQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-002');
          return;
        }
      } else if (newIsFamily) {
        newHasPhone = !toggleModalNoPhone.checked;
        if (newHasPhone) {
          const digits = inputModalPhone.value.replace(/\D/g, '');
          if (digits.length < 10) {
            inputModalPhone.classList.add('has-error');
            showToast('GF-VISIT-VAL-002', 'error');
            return;
          }
          newPhone = inputModalPhone.value;
        }

        const familyQrVal = parseQrTicketNumber(inputModalFamilyQr.value);
        if (!familyQrVal) {
          inputModalFamilyQr.classList.add('has-error');
          showToast('GF-VISIT-VAL-007', 'error');
          return;
        }
        if (familyQrVal === Number(visitor.qr_code)) {
          inputModalFamilyQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-006');
          return;
        }
        const linked = await getVisitorByQrAndEvent(familyQrVal, eventId);
        if (!linked || linked.is_child) {
          inputModalFamilyQr.classList.add('has-error');
          showErrorModal('GF-VISIT-REG-006');
          return;
        }
        newGuardianQr = familyQrVal;
      } else {
        // Solo adult
        newHasPhone = !toggleModalNoPhone.checked;
        if (newHasPhone) {
          const digits = inputModalPhone.value.replace(/\D/g, '');
          if (digits.length < 10) {
            inputModalPhone.classList.add('has-error');
            showToast('GF-VISIT-VAL-002', 'error');
            return;
          }
          newPhone = inputModalPhone.value;
        }
        newGuardianQr = null;
      }

      try {
        await updateVisitor(visitor.id, {
          name: cleanName,
          gender: editGender,
          age: editAgeNum,
          is_child: newIsChild,
          phone: newPhone,
          has_phone: newHasPhone,
          guardian_qr_code: newGuardianQr
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

    // --- Constraint 2: linked members check (children or co-adult in family group) ---
    let allVisitors = [];
    try {
      allVisitors = await getVisitorsByEventId(eventId);
    } catch {
      showToast('GF-SYSTEM-SYS-001', 'error');
      return;
    }
    const hasLinkedMembers = allVisitors.some(
      v => Number(v.guardian_qr_code) === Number(visitor.qr_code)
    );
    if (hasLinkedMembers) {
      showToast('GF-VISIT-REG-005', 'warning');
      return;
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
  function renderVisitorList(visitors, hasActiveFilters = false) {
    if (!visitorsList) return;

    if (visitors.length === 0) {
      if (hasActiveFilters) {
        visitorsList.innerHTML = `
          <div class="search-no-results">
            <strong>Nenhum resultado encontrado</strong>
            <span>Nenhum participante corresponde aos filtros selecionados.</span>
            <div style="margin-top: var(--space-2);">
              <button type="button" class="btn btn-secondary" id="btnEmptyResetFilters" style="min-height: 30px; font-size: var(--font-size-xs); padding: 4px 12px;">
                Limpar Filtros
              </button>
            </div>
          </div>
        `;
        const btnEmptyReset = visitorsList.querySelector('#btnEmptyResetFilters');
        if (btnEmptyReset) {
          btnEmptyReset.onclick = resetAllFilters;
        }
      } else {
        visitorsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum visitante cadastrado neste evento ainda.</p>';
      }
      return;
    }

    visitorsList.innerHTML = visitors.map(v => {
      let typeBadge;
      if (v.is_child) {
        typeBadge = `<span class="badge badge-child">Criança (Resp: #${v.guardian_qr_code})</span>`;
      } else if (!v.is_child && v.guardian_qr_code) {
        typeBadge = `<span class="badge badge-adult">Adulto (Família: #${v.guardian_qr_code}) ${v.has_phone ? '• ' + v.phone : '• Sem telefone'}</span>`;
      } else {
        typeBadge = `<span class="badge badge-adult">Adulto ${v.has_phone ? '• ' + v.phone : '• Sem telefone'}</span>`;
      }

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

  function applyVisitorFilters() {
    let result = [...cachedVisitors];

    // 1. Filtro de pesquisa de texto / ticket
    const query = visitorSearchInput ? visitorSearchInput.value.trim() : '';
    if (query) {
      result = filterVisitorsByFamilyGroup(result, query);
    }

    // 2. Filtro de Faixa Etária
    if (activeAgeFilter !== 'all') {
      result = result.filter(v => {
        if (v.age === null || v.age === undefined || v.age === '') return false;
        const age = Number(v.age);
        if (isNaN(age)) return false;

        switch (activeAgeFilter) {
          case '0-6':
            return age >= 0 && age <= 6;
          case '7-12':
            return age >= 7 && age <= 12;
          case '13-17':
            return age >= 13 && age <= 17;
          case '18-59':
            return age >= 18 && age <= 59;
          case '60+':
            return age >= 60;
          default:
            return true;
        }
      });
    }

    // 3. Filtro de Serviços
    if (activeServiceFilter !== 'all') {
      const targetServiceId = Number(activeServiceFilter);
      const attendedQrCodes = new Set(
        cachedAttendances
          .filter(att => Number(att.service_id) === targetServiceId)
          .map(att => Number(att.visitor_qr_code))
      );
      result = result.filter(v => attendedQrCodes.has(Number(v.qr_code)));
    }

    // 4. Filtro de Toggle / Tipo
    if (activeTypeFilter !== 'all') {
      if (activeTypeFilter === 'children') {
        result = result.filter(v => Boolean(v.is_child));
      } else if (activeTypeFilter === 'family') {
        const guardianQrSet = new Set(
          cachedVisitors
            .filter(x => x.guardian_qr_code)
            .map(x => Number(x.guardian_qr_code))
        );
        result = result.filter(v => Boolean(v.guardian_qr_code) || guardianQrSet.has(Number(v.qr_code)));
      } else if (activeTypeFilter === 'adults') {
        result = result.filter(v => !v.is_child);
      }
    }

    const hasActiveFilters = query !== '' || activeAgeFilter !== 'all' || activeServiceFilter !== 'all' || activeTypeFilter !== 'all';
    if (btnResetVisitorFilters) {
      btnResetVisitorFilters.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }

    if (visitorCountBadge) {
      visitorCountBadge.textContent = hasActiveFilters
        ? `${result.length}/${cachedVisitors.length}`
        : String(cachedVisitors.length);
    }

    renderVisitorList(result, hasActiveFilters);
  }

  function populateServiceFilterOptions(services) {
    if (!visitorFilterService) return;
    const currentVal = visitorFilterService.value;
    visitorFilterService.innerHTML = '<option value="all">Todos os serviços</option>';
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      opt.textContent = s.name;
      visitorFilterService.appendChild(opt);
    });
    if (currentVal && services.some(s => String(s.id) === currentVal)) {
      visitorFilterService.value = currentVal;
      activeServiceFilter = currentVal;
    } else {
      visitorFilterService.value = 'all';
      activeServiceFilter = 'all';
    }
  }

  function resetAllFilters() {
    if (visitorSearchInput) visitorSearchInput.value = '';
    activeAgeFilter = 'all';
    if (visitorFilterAge) visitorFilterAge.value = 'all';
    activeServiceFilter = 'all';
    if (visitorFilterService) visitorFilterService.value = 'all';
    activeTypeFilter = 'all';
    if (visitorTypePills) {
      visitorTypePills.querySelectorAll('.visitor-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'all');
      });
    }
    applyVisitorFilters();
  }

  // Event Listeners dos Filtros
  if (visitorFilterAge) {
    visitorFilterAge.addEventListener('change', (e) => {
      activeAgeFilter = e.target.value;
      applyVisitorFilters();
    });
  }

  if (visitorFilterService) {
    visitorFilterService.addEventListener('change', (e) => {
      activeServiceFilter = e.target.value;
      applyVisitorFilters();
    });
  }

  if (visitorTypePills) {
    visitorTypePills.addEventListener('click', (e) => {
      const btn = e.target.closest('.visitor-pill-btn');
      if (!btn) return;
      const type = btn.dataset.type;
      if (!type) return;

      activeTypeFilter = type;
      visitorTypePills.querySelectorAll('.visitor-pill-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      applyVisitorFilters();
    });
  }

  if (btnResetVisitorFilters) {
    btnResetVisitorFilters.addEventListener('click', resetAllFilters);
  }

  // Listener de busca com debounce
  if (visitorSearchInput) {
    visitorSearchInput.addEventListener('input', () => {
      clearTimeout(visitorSearchDebounce);
      visitorSearchDebounce = setTimeout(applyVisitorFilters, 300);
    });
  }

  async function renderRegisteredVisitors() {
    const session = getSession();
    if (!visitorsList) return;

    if (!session.eventId) {
      visitorsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Selecione um evento para visualizar os visitantes cadastrados.</p>';
      if (visitorCountBadge) visitorCountBadge.textContent = '0';
      cachedVisitors = [];
      cachedServices = [];
      cachedAttendances = [];
      populateServiceFilterOptions([]);
      return;
    }

    try {
      const [visitors, services, attendances] = await Promise.all([
        getVisitorsByEventId(session.eventId),
        getServicesByEventId(session.eventId),
        getAttendancesByEventId(session.eventId)
      ]);
      cachedVisitors = visitors || [];
      cachedServices = services || [];
      cachedAttendances = attendances || [];
      populateServiceFilterOptions(cachedServices);
    } catch {
      cachedVisitors = await getVisitorsByEventId(session.eventId);
    }

    applyVisitorFilters();
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
