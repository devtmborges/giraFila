/**
 * GiraFila — Screen 4: Operational Attendance Registration
 * Implements requirements from projectScope.md Tela 4
 */

import { getSession, openSessionModal } from './sessionModal.js';
import {
  getVisitorByQrAndEvent,
  checkAttendanceExists,
  createAttendance,
  getServiceById,
  getAttendancesByServiceAndEvent,
  getVisitorsByEventId,
  getAttendanceById,
  deleteAttendance
} from '../services/storageService.js';
import { parseQrTicketNumber, formatUtcDisplayDateTime } from '../utils/sanitizer.js';
import { showToast, showSuccess, showErrorModal } from '../services/errorHandler.js';
import { startQrScanner, stopQrScanner } from '../utils/qrScanner.js';
import { filterVisitorsByFamilyGroup } from '../utils/familySearch.js';
import { getIcon } from '../utils/icons.js';
import { openFamilyModal } from './familyModal.js';

export function initAttendanceView() {
  const form = document.getElementById('attendanceForm');
  const inputQr = document.getElementById('attendanceQrCode');
  const btnScanQr = document.getElementById('btnScanQr');
  const scannerContainer = document.getElementById('scannerContainer');
  const scannerVideo = document.getElementById('scannerVideo');
  const btnCloseScanner = document.getElementById('btnCloseScanner');
  const participantCard = document.getElementById('attendanceParticipantCard');
  const participantName = document.getElementById('attendanceParticipantName');
  const participantMeta = document.getElementById('attendanceParticipantMeta');
  const recentAttendancesList = document.getElementById('recentAttendancesList');
  const attendanceCountBadge = document.getElementById('attendanceCountBadge');
  const attendanceSearchInput = document.getElementById('attendanceSearchInput');

  if (!form) return;

  // Cache de dados para filtragem client-side
  let cachedAttendances = [];
  let cachedVisitorMap = new Map();
  let cachedAllVisitors = [];
  let searchDebounce = null;
  let currentPreviewVisitor = null;

  // Clear errors on input
  inputQr.addEventListener('input', () => {
    inputQr.classList.remove('has-error');
    const err = document.getElementById('attendanceQrCodeError');
    if (err) err.classList.remove('visible');
    currentPreviewVisitor = null;
    participantCard.classList.remove('clickable');
    participantCard.style.display = 'none';
  });

  // Dynamic preview of visitor when typing QR code
  let previewTimeout = null;
  inputQr.addEventListener('input', () => {
    clearTimeout(previewTimeout);
    const session = getSession();
    const qrVal = parseQrTicketNumber(inputQr.value);

    if (!session.eventId || !session.serviceId || !qrVal) {
      currentPreviewVisitor = null;
      participantCard.classList.remove('clickable');
      participantCard.style.display = 'none';
      return;
    }

    previewTimeout = setTimeout(async () => {
      const visitor = await getVisitorByQrAndEvent(qrVal, session.eventId);
      if (visitor) {
        currentPreviewVisitor = visitor;
        participantName.textContent = `#${visitor.qr_code} — ${visitor.name}`;
        const extraDetails = [];
        if (visitor.gender) extraDetails.push(visitor.gender);
        if (visitor.age !== null && visitor.age !== undefined && visitor.age !== '') extraDetails.push(`${visitor.age} anos`);
        const extraText = extraDetails.length > 0 ? ` (${extraDetails.join(', ')})` : '';

        const metaText = visitor.is_child
          ? `Criança${extraText} (Responsável: #${visitor.guardian_qr_code})`
          : `Adulto${extraText} ${visitor.has_phone ? '• Tel: ' + visitor.phone : '• Sem telefone'}`;

        participantMeta.innerHTML = `
          <span>${escapeHtml(metaText)}</span>
          <span class="data-item-family-hint" style="margin-top: 4px;">${getIcon('users', 12)} Ver grupo familiar completo</span>
        `;
        participantCard.classList.add('clickable');
        participantCard.title = 'Clique para ver o grupo familiar completo e histórico de atendimentos';
        participantCard.style.display = 'flex';
      } else {
        currentPreviewVisitor = null;
        participantCard.classList.remove('clickable');
        participantCard.style.display = 'none';
      }
    }, 250);
  });

  // Clique no card de prévia para abrir o grupo familiar
  participantCard.addEventListener('click', () => {
    if (!currentPreviewVisitor) return;
    const session = getSession();
    if (!session.eventId) return;
    openFamilyModal({
      qrCode: currentPreviewVisitor.qr_code,
      eventId: session.eventId,
      currentServiceId: session.serviceId,
      onSelectTicket: (qr) => {
        inputQr.value = qr;
        inputQr.dispatchEvent(new Event('input'));
      }
    });
  });

  // Camera QR Scanner Toggle
  btnScanQr.addEventListener('click', async () => {
    const isScanning = scannerContainer.classList.contains('active');

    if (isScanning) {
      stopQrScanner();
      scannerContainer.classList.remove('active');
      btnScanQr.innerHTML = getIcon('camera', 14) + ' <span>Escanear Câmera</span>';
    } else {
      const isLive = await startQrScanner(scannerVideo, scannerContainer, (detectedTicket) => {
        inputQr.value = detectedTicket;
        scannerContainer.classList.remove('active');
        btnScanQr.innerHTML = getIcon('camera', 14) + ' <span>Escanear Câmera</span>';
        inputQr.dispatchEvent(new Event('input'));
        showSuccess(`Ticket #${detectedTicket} detectado com sucesso!`);
      });

      if (isLive) {
        btnScanQr.innerHTML = getIcon('square', 14) + ' <span>Parar Câmera</span>';
      } else {
        scannerContainer.classList.remove('active');
        btnScanQr.innerHTML = getIcon('camera', 14) + ' <span>Escanear Câmera</span>';
      }
    }
  });

  if (btnCloseScanner) {
    btnCloseScanner.addEventListener('click', () => {
      stopQrScanner();
      scannerContainer.classList.remove('active');
      btnScanQr.innerHTML = getIcon('camera', 14) + ' <span>Escanear Câmera</span>';
    });
  }

  // Attendance Submission & Anti-Fraud Duplication Check
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const session = getSession();

    if (!session.eventId || !session.serviceId) {
      showToast('GF-SESSION-VAL-001', 'error');
      openSessionModal(false);
      return;
    }

    const qrCode = parseQrTicketNumber(inputQr.value);
    if (!qrCode) {
      inputQr.classList.add('has-error');
      const err = document.getElementById('attendanceQrCodeError');
      if (err) err.classList.add('visible');
      showToast('GF-ATTEND-VAL-001', 'error');
      return;
    }

    // 1. Check if visitor is registered for current event
    const visitor = await getVisitorByQrAndEvent(qrCode, session.eventId);
    if (!visitor) {
      inputQr.classList.add('has-error');
      showErrorModal('GF-ATTEND-REG-001', `O Ticket #${qrCode} não foi encontrado no cadastro deste evento.`);
      return;
    }

    // 2. Check service audience inclusion
    const service = await getServiceById(session.serviceId);
    if (service) {
      const allowsChildren = service.allows_children !== undefined ? service.allows_children : !service.only_adults;
      const allowsAdults = service.allows_adults !== undefined ? service.allows_adults : !service.only_children;

      if (visitor.is_child && !allowsChildren) {
        inputQr.classList.add('has-error');
        showErrorModal('GF-ATTEND-REG-004', `O posto "${service.name}" não atende crianças. Público permitido: Adultos.`);
        return;
      }
      if (!visitor.is_child && !allowsAdults) {
        inputQr.classList.add('has-error');
        showErrorModal('GF-ATTEND-REG-003', `O posto "${service.name}" não atende adultos. Público permitido: Crianças.`);
        return;
      }
    }

    // 3. Check for previous attendance (Anti-Fraud: Prevent Duplication)
    const existing = await checkAttendanceExists(session.eventId, session.serviceId, qrCode);
    if (existing) {
      inputQr.classList.add('has-error');
      showErrorModal(
        'GF-ATTEND-REG-002',
        `Este participante (${visitor.name}) já foi atendido neste serviço hoje em: ${formatUtcDisplayDateTime(existing.created_at)}.`
      );
      return;
    }

    // 4. Confirm Attendance
    try {
      await createAttendance({
        event_id: session.eventId,
        service_id: session.serviceId,
        visitor_qr_code: qrCode
      });

      showSuccess(`Atendimento CONFIRMADO para ${visitor.name} (Ticket #${qrCode})!`, 4000);

      // Reset
      inputQr.value = '';
      currentPreviewVisitor = null;
      participantCard.classList.remove('clickable');
      participantCard.style.display = 'none';
      inputQr.focus();

      await renderRecentAttendances();
    } catch (err) {
      if (err.code === 'GF-ATTEND-REG-002') {
        showErrorModal('GF-ATTEND-REG-002');
      } else {
        showToast('GF-SYSTEM-SYS-001', 'error');
      }
    }
  });

  // Delegated action on recent attendances list (Delete or Family Modal)
  if (recentAttendancesList) {
    recentAttendancesList.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-attendance"]');
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const att = await getAttendanceById(id);
        if (att) {
          const session = getSession();
          const visitors = await getVisitorsByEventId(session.eventId);
          const visitor = visitors.find(v => v.qr_code === att.visitor_qr_code);
          const visitorName = visitor ? visitor.name : `Ticket #${att.visitor_qr_code}`;
          confirmDeleteAttendance(att, visitorName);
        }
        return;
      }

      // Clique no card de atendimento: Abrir modal do grupo familiar
      const card = e.target.closest('.data-item--clickable');
      if (card && card.dataset.qr) {
        const session = getSession();
        if (session.eventId) {
          openFamilyModal({
            qrCode: card.dataset.qr,
            eventId: session.eventId,
            currentServiceId: session.serviceId,
            onSelectTicket: (qr) => {
              inputQr.value = qr;
              inputQr.dispatchEvent(new Event('input'));
            }
          });
        }
      }
    });
  }

  function confirmDeleteAttendance(att, visitorName) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    backdrop.innerHTML = `
      <div class="modal-dialog confirm" role="alertdialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="card-title" style="color: var(--color-danger); display: flex; align-items: center; gap: 8px;">
            ${getIcon('trash', 18)}
            <span>Excluir Atendimento</span>
          </h3>
        </div>
        <div class="modal-body">
          <p style="font-size: var(--font-size-base);">Deseja realmente excluir o atendimento de <strong>${escapeHtml(visitorName)}</strong> (Ticket #${att.visitor_qr_code})?</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Esta ação cancelará o registro e permitirá que o participante seja atendido novamente neste posto.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelDeleteAttendance">Cancelar</button>
          <button type="button" class="btn btn-danger" id="btnConfirmDeleteAttendance">Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.querySelector('#btnCancelDeleteAttendance').onclick = close;

    backdrop.querySelector('#btnConfirmDeleteAttendance').onclick = async () => {
      close();
      try {
        await deleteAttendance(att.id);
        showSuccess(`Atendimento de ${visitorName} excluído com sucesso!`);
        await renderRecentAttendances();
      } catch (err) {
        showToast('GF-SYSTEM-SYS-002', 'error');
      }
    };
  }

  /**
   * Renderiza a lista de atendimentos aplicando o filtro de busca atual.
   * @param {Array} attendances - Atendimentos a renderizar (já filtrados ou completos).
   */
  function renderAttendanceList(attendances) {
    if (attendances.length === 0) {
      const queryActive = attendanceSearchInput && attendanceSearchInput.value.trim();
      recentAttendancesList.innerHTML = queryActive
        ? `<div class="search-no-results"><strong>Nenhum resultado encontrado</strong>Nenhum atendimento corresponde a "${escapeHtml(attendanceSearchInput.value.trim())}".</div>`
        : '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Nenhum atendimento realizado neste posto ainda.</p>';
      return;
    }

    recentAttendancesList.innerHTML = attendances.map(att => {
      const v = cachedVisitorMap.get(att.visitor_qr_code);
      const name = v ? v.name : 'Participante #' + att.visitor_qr_code;
      const typeBadge = v && v.is_child
        ? '<span class="badge badge-child">Criança</span>'
        : '<span class="badge badge-adult">Adulto</span>';

      const infoParts = [];
      if (v && v.gender) infoParts.push(escapeHtml(v.gender));
      if (v && v.age !== null && v.age !== undefined && v.age !== '') infoParts.push(`${v.age} anos`);
      const extraInfo = infoParts.length > 0 ? `<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">• ${infoParts.join(' • ')}</span>` : '';

      return `
        <div class="data-item data-item--clickable" data-qr="${att.visitor_qr_code}" title="Clique para ver o grupo familiar e histórico">
          <div class="data-item-main">
            <div class="data-item-title">
              <strong>#${att.visitor_qr_code}</strong> — ${escapeHtml(name)} ${typeBadge} ${extraInfo}
            </div>
            <div class="data-item-meta">
              <span>${getIcon('clock', 13)} ${formatUtcDisplayDateTime(att.created_at)}</span>
              <span class="badge badge-done">Atendido</span>
              <span class="data-item-family-hint">${getIcon('users', 12)} Ver família</span>
            </div>
          </div>
          <div class="data-item-actions">
            <button type="button" class="btn-icon btn-icon-danger" data-action="delete-attendance" data-id="${att.id}" title="Excluir atendimento" aria-label="Excluir atendimento">
              ${getIcon('trash', 16)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Aplica o filtro de busca sobre os dados em cache e re-renderiza.
   */
  function applyAttendanceSearch() {
    const query = attendanceSearchInput ? attendanceSearchInput.value.trim() : '';
    if (!query) {
      renderAttendanceList(cachedAttendances);
      return;
    }

    // Identifica os QR codes dos visitantes que correspondem ao grupo familiar
    const matchedVisitors = filterVisitorsByFamilyGroup(cachedAllVisitors, query);
    const matchedQrSet = new Set(matchedVisitors.map(v => v.qr_code));

    const filtered = cachedAttendances.filter(att => matchedQrSet.has(att.visitor_qr_code));
    renderAttendanceList(filtered);
  }

  // Listener de busca com debounce
  if (attendanceSearchInput) {
    attendanceSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(applyAttendanceSearch, 300);
    });
  }

  async function renderRecentAttendances() {
    if (!recentAttendancesList) return;
    const session = getSession();

    if (!session.eventId || !session.serviceId) {
      recentAttendancesList.innerHTML = '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: 1rem;">Selecione um evento e serviço para ver o histórico do posto.</p>';
      if (attendanceCountBadge) attendanceCountBadge.textContent = '0';
      cachedAttendances = [];
      cachedVisitorMap = new Map();
      cachedAllVisitors = [];
      return;
    }

    const attendances = await getAttendancesByServiceAndEvent(session.serviceId, session.eventId);
    const visitors = await getVisitorsByEventId(session.eventId);

    // Atualiza cache
    cachedAttendances = attendances;
    cachedAllVisitors = visitors;
    cachedVisitorMap = new Map(visitors.map(v => [v.qr_code, v]));

    if (attendanceCountBadge) attendanceCountBadge.textContent = String(attendances.length);

    // Limpa campo de busca ao recarregar (ex: troca de contexto)
    if (attendanceSearchInput) attendanceSearchInput.value = '';

    renderAttendanceList(attendances);
  }

  window.refreshAttendanceView = renderRecentAttendances;
  renderRecentAttendances();
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
