/**
 * GiraFila — Family Group Modal View
 * Aligned with HARNESS/Architecture/ErrorGovernance.md, UiDesignSystem.md, and SecurityGovernance.md
 * 
 * Displays all visitors associated with a family group (anchor adult + linked children),
 * their demographic details, and all attendance records registered for the current event.
 */

import { getVisitorsByEventId, getAttendancesByEventId, getServicesByEventId } from '../services/storageService.js';
import { formatUtcDisplayDateTime } from '../utils/sanitizer.js';
import { getIcon } from '../utils/icons.js';
import { showToast } from '../services/errorHandler.js';

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens the Family Group Modal for a given visitor QR code and event.
 * 
 * @param {Object} options
 * @param {number|string} options.qrCode - QR Code of the clicked visitor.
 * @param {number|string} options.eventId - Active event ID.
 * @param {Function} [options.onSelectTicket] - Optional callback when user clicks "Atender este ticket".
 * @param {number|string} [options.currentServiceId] - Optional active service ID for context highlighting.
 */
export async function openFamilyModal({ qrCode, eventId, onSelectTicket = null, currentServiceId = null }) {
  if (!eventId) {
    showToast('GF-SESSION-VAL-001', 'error');
    return;
  }

  const numQr = Number(qrCode);
  if (!numQr) {
    showToast('GF-VISIT-VAL-004', 'error');
    return;
  }

  let allVisitors = [];
  try {
    allVisitors = await getVisitorsByEventId(eventId);
  } catch {
    showToast('GF-SYSTEM-SYS-001', 'error');
    return;
  }

  const targetVisitor = allVisitors.find(v => Number(v.qr_code) === numQr);
  if (!targetVisitor) {
    showToast('GF-VISIT-REG-003', 'warning');
    return;
  }

  // Determine Family Anchor QR:
  // For children, anchor is guardian_qr_code; for adults, it's their own qr_code.
  const anchorQr = (targetVisitor.is_child && targetVisitor.guardian_qr_code)
    ? Number(targetVisitor.guardian_qr_code)
    : Number(targetVisitor.qr_code);

  // Group members:
  // 1. Adults whose qr_code is the anchor
  // 2. Children whose guardian_qr_code is the anchor
  let familyMembers = allVisitors.filter(v => {
    if (!v.is_child) {
      return Number(v.qr_code) === anchorQr;
    }
    return Number(v.guardian_qr_code) === anchorQr;
  });

  // Fallback: If orphan child or anchor adult not in event, ensure targetVisitor is included
  if (familyMembers.length === 0) {
    familyMembers = [targetVisitor];
  }

  // Sort: Adult guardian first, then children ordered by age (descending) or ticket
  familyMembers.sort((a, b) => {
    if (!a.is_child && b.is_child) return -1;
    if (a.is_child && !b.is_child) return 1;
    if (a.age !== null && b.age !== null) return b.age - a.age;
    return Number(a.qr_code) - Number(b.qr_code);
  });

  const anchorAdult = familyMembers.find(m => !m.is_child && Number(m.qr_code) === anchorQr);

  // Load attendances and services for this event
  let attendances = [];
  let services = [];
  try {
    const [attRes, servRes] = await Promise.all([
      getAttendancesByEventId(eventId),
      getServicesByEventId(eventId)
    ]);
    attendances = attRes || [];
    services = servRes || [];
  } catch {
    // Non-blocking for modal display
    attendances = [];
    services = [];
  }

  const serviceMap = new Map(services.map(s => [s.id, s]));
  const attendanceMap = new Map();
  attendances.forEach(att => {
    const key = Number(att.visitor_qr_code);
    const list = attendanceMap.get(key) || [];
    list.push(att);
    attendanceMap.set(key, list);
  });

  const totalAdults = familyMembers.filter(m => !m.is_child).length;
  const totalChildren = familyMembers.filter(m => m.is_child).length;
  const familyAttendanceCount = familyMembers.reduce((sum, m) => sum + (attendanceMap.get(Number(m.qr_code))?.length || 0), 0);

  // Build Modal Elements
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop active';
  backdrop.id = 'familyGroupModalBackdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'familyModalTitle');
  backdrop.style.zIndex = 'var(--z-modal-primary)';

  const membersHtml = familyMembers.map(member => {
    const isTarget = Number(member.qr_code) === numQr;
    const isChild = Boolean(member.is_child);
    const memberAttendances = attendanceMap.get(Number(member.qr_code)) || [];
    const isAttendedInCurrentService = currentServiceId
      ? memberAttendances.some(a => Number(a.service_id) === Number(currentServiceId))
      : false;

    // Badges & details
    const roleBadge = isChild
      ? `<span class="badge badge-child">${getIcon('users', 12)} Criança / Dependente</span>`
      : `<span class="badge badge-adult">${getIcon('user', 12)} Adulto Responsável</span>`;

    const detailPills = [];
    if (member.gender) {
      detailPills.push(`<span><strong>Gênero:</strong> ${escapeHtml(member.gender)}</span>`);
    }
    if (member.age !== null && member.age !== undefined && member.age !== '') {
      detailPills.push(`<span><strong>Idade:</strong> ${member.age} anos</span>`);
    }
    if (!isChild) {
      detailPills.push(`<span><strong>Telefone:</strong> ${member.has_phone ? escapeHtml(member.phone) : 'Sem telefone'}</span>`);
    } else if (member.guardian_qr_code) {
      detailPills.push(`<span><strong>Responsável:</strong> Ticket #${member.guardian_qr_code}</span>`);
    }

    // Attendance trail
    let attendanceTrailHtml = '';
    if (memberAttendances.length === 0) {
      attendanceTrailHtml = `
        <div class="family-attendance-empty">
          <span>Nenhum atendimento registrado neste evento ainda.</span>
        </div>
      `;
    } else {
      attendanceTrailHtml = `
        <div class="family-attendance-list">
          ${memberAttendances.map(att => {
            const serv = serviceMap.get(Number(att.service_id));
            const servName = serv ? escapeHtml(serv.name) : `Serviço #${att.service_id}`;
            const timeStr = formatUtcDisplayDateTime(att.created_at);
            const isCurrentServ = currentServiceId && Number(att.service_id) === Number(currentServiceId);
            return `
              <div class="family-attendance-pill ${isCurrentServ ? 'family-attendance-pill--active' : ''}" title="Atendido em: ${timeStr}">
                ${getIcon('check', 13)}
                <strong>${servName}</strong>
                <span class="family-attendance-pill-time">${timeStr}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Operational quick-action button (in Attendance View)
    let actionBtnHtml = '';
    if (onSelectTicket) {
      if (isAttendedInCurrentService) {
        actionBtnHtml = `
          <div class="family-member-action">
            <span class="badge badge-done" style="font-size: var(--font-size-xs); padding: 4px 8px;">
              ${getIcon('check', 12)} Já atendido neste posto hoje
            </span>
          </div>
        `;
      } else {
        actionBtnHtml = `
          <div class="family-member-action">
            <button type="button" class="btn btn-secondary btn-sm btn-select-family-ticket" data-ticket="${member.qr_code}">
              ${getIcon('attendance', 14)}
              <span>Atender Ticket #${member.qr_code}</span>
            </button>
          </div>
        `;
      }
    }

    return `
      <div class="family-member-card ${isChild ? 'family-member-card--child' : 'family-member-card--adult'} ${isTarget ? 'family-member-card--selected' : ''}">
        <div class="family-member-header">
          <div class="family-member-title">
            <span class="family-ticket-tag">#${member.qr_code}</span>
            <span class="family-member-name">${escapeHtml(member.name)}</span>
            ${isTarget ? '<span class="badge badge-done" style="font-size: 11px;">Selecionado</span>' : ''}
          </div>
          ${roleBadge}
        </div>

        <div class="family-member-meta">
          ${detailPills.join(' • ')}
        </div>

        <div class="family-attendance-box">
          <div class="family-attendance-title">
            ${getIcon('attendance', 13)}
            <span>Atendimentos no Evento (${memberAttendances.length})</span>
          </div>
          ${attendanceTrailHtml}
        </div>

        ${actionBtnHtml}
      </div>
    `;
  }).join('');

  backdrop.innerHTML = `
    <div class="modal-dialog family-modal-dialog">
      <div class="modal-header">
        <div class="family-modal-header-text">
          <h2 class="card-title" id="familyModalTitle" style="display: flex; align-items: center; gap: 8px;">
            ${getIcon('users', 20)}
            <span>Grupo Familiar — Ticket #${anchorQr}</span>
          </h2>
          <p class="card-subtitle" style="margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted);">
            ${anchorAdult ? `Responsável da Família: <strong>${escapeHtml(anchorAdult.name)}</strong>` : 'Participantes vinculados a este grupo'}
          </p>
        </div>
        <button type="button" class="btn-icon" id="btnFamilyModalClose" aria-label="Fechar modal" style="border: none; background: transparent;">
          ${getIcon('close', 20)}
        </button>
      </div>

      <div class="modal-body family-modal-body">
        <!-- Family Summary Stats Bar -->
        <div class="family-summary-bar">
          <div class="family-stat-item">
            <span class="family-stat-label">Total Membros</span>
            <span class="family-stat-val">${familyMembers.length}</span>
          </div>
          <div class="family-stat-divider"></div>
          <div class="family-stat-item">
            <span class="family-stat-label">Adultos</span>
            <span class="family-stat-val">${totalAdults}</span>
          </div>
          <div class="family-stat-divider"></div>
          <div class="family-stat-item">
            <span class="family-stat-label">Crianças</span>
            <span class="family-stat-val">${totalChildren}</span>
          </div>
          <div class="family-stat-divider"></div>
          <div class="family-stat-item">
            <span class="family-stat-label">Total Atendimentos</span>
            <span class="family-stat-val family-stat-val--accent">${familyAttendanceCount}</span>
          </div>
        </div>

        <!-- Members Cards -->
        <div class="family-members-container">
          ${membersHtml}
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="btnFamilyModalFooterClose">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Close handler
  const close = () => {
    document.removeEventListener('keydown', handleKeyDown);
    backdrop.classList.remove('active');
    setTimeout(() => {
      backdrop.remove();
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };

  // 1. Close when clicking the "X" or "Fechar" button
  const btnClose = backdrop.querySelector('#btnFamilyModalClose');
  const btnFooterClose = backdrop.querySelector('#btnFamilyModalFooterClose');
  if (btnClose) btnClose.onclick = close;
  if (btnFooterClose) btnFooterClose.onclick = close;

  // 2. Close when clicking outside modal dialog (on the backdrop itself)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
    }
  });

  // 3. Close on Escape key
  document.addEventListener('keydown', handleKeyDown);

  // 4. Quick ticket selection handler (if callback provided)
  if (onSelectTicket) {
    const selectBtns = backdrop.querySelectorAll('.btn-select-family-ticket');
    selectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const ticket = btn.dataset.ticket;
        close();
        if (ticket) {
          onSelectTicket(ticket);
        }
      });
    });
  }
}
