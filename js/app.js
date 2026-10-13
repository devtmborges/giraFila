/**
 * GiraFila — Application Entry Point
 * Orchestrates views, tab switching, and session lifecycle
 */

import { initDb, getAllEvents } from './services/storageService.js';
import { openSessionModal, openEventModal, openServiceModal, updateSessionBar, onSessionChange, getSession } from './views/sessionModal.js';
import { initVisitorView } from './views/visitorView.js';
import { initEventView } from './views/eventView.js';
import { initServiceView } from './views/serviceView.js';
import { initAttendanceView } from './views/attendanceView.js';
import { initDashboardView } from './views/dashboardView.js';
import { copyTextToClipboard } from './utils/clipboard.js';
import { showToast, showSuccess } from './services/errorHandler.js';
import { getIcon } from './utils/icons.js';
import { verifyPassword, updatePassword } from './utils/masterPassword.js';
import { openSecretMenu } from './views/secretMenuModal.js';
import { getAccessConfig, getActiveDisplayUrl } from './utils/accessConfig.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize IndexedDB schema
  try {
    await initDb();
  } catch (err) {
    console.error('[GiraFila] Failed to initialize database:', err);
  }

  // 2. Initialize Views
  initAttendanceView();
  initVisitorView();
  initServiceView();
  initEventView();
  initDashboardView();

  // 3. Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const viewPanels = document.querySelectorAll('.view-panel');

  const switchTab = (tabId) => {
    tabButtons.forEach(btn => {
      const target = btn.getAttribute('data-tab');
      if (target === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Refresh views on tab change
    if (tabId === 'tabAttendance' && window.refreshAttendanceView) window.refreshAttendanceView();
    if (tabId === 'tabVisitor'    && window.refreshVisitorView)    window.refreshVisitorView();
    if (tabId === 'tabService'    && window.refreshServiceView)    window.refreshServiceView();
    if (tabId === 'tabEvent'      && window.refreshEventView)      window.refreshEventView();
    if (tabId === 'tabDashboard'  && window.refreshDashboardView)  window.refreshDashboardView();
  };

  // Secret Menu Trigger: 5 clicks on Dashboard tab within 10 seconds
  let dashboardClicks = [];
  const DASHBOARD_SECRET_CLICKS = 5;
  const DASHBOARD_SECRET_WINDOW_MS = 10000;

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);

      if (tabId === 'tabDashboard') {
        const now = Date.now();
        dashboardClicks = dashboardClicks.filter(timestamp => now - timestamp < DASHBOARD_SECRET_WINDOW_MS);
        dashboardClicks.push(now);

        if (dashboardClicks.length >= DASHBOARD_SECRET_CLICKS) {
          dashboardClicks = [];
          openSecretMenu();
        }
      }
    });
  });

  // Default initial screen is Attendance
  switchTab('tabAttendance');

  // 4. Session Change Listener
  onSessionChange((session) => {
    if (window.refreshAttendanceView) window.refreshAttendanceView();
    if (window.refreshVisitorView)    window.refreshVisitorView();
    if (window.refreshServiceView)    window.refreshServiceView();
    if (window.refreshEventView)      window.refreshEventView();
    if (window.refreshDashboardView)  window.refreshDashboardView();
  });

  // 5. Context Selection Buttons (session-bar) — use dedicated modals
  const btnSelectEventContext = document.getElementById('btnSelectEventContext');
  if (btnSelectEventContext) {
    btnSelectEventContext.addEventListener('click', () => openEventModal());
  }

  const btnSelectServiceContext = document.getElementById('btnSelectServiceContext');
  if (btnSelectServiceContext) {
    btnSelectServiceContext.addEventListener('click', () => openServiceModal());
  }

  // 5b. Context tag buttons inside the view cards — use dedicated modals
  const attendanceServiceTagBtn = document.getElementById('attendanceServiceTagBtn');
  if (attendanceServiceTagBtn) {
    attendanceServiceTagBtn.addEventListener('click', () => openServiceModal());
  }

  const visitorEventTagBtn = document.getElementById('visitorEventTagBtn');
  if (visitorEventTagBtn) {
    visitorEventTagBtn.addEventListener('click', () => openEventModal());
  }



  // 6. LAN / Access Info Modal
  const btnLanInfo       = document.getElementById('btnLanInfo');
  const lanBackdrop      = document.getElementById('lanModalBackdrop');
  const lanClose         = document.getElementById('lanModalClose');
  const btnCopyLanUrl    = document.getElementById('btnCopyLanUrl');
  const lanUrlDisplay    = document.getElementById('lanUrlDisplay');
  const lanModalTitle    = document.getElementById('lanModalTitleText');
  const lanModalSubtitle = document.getElementById('lanModalSubtitle');
  const lanUrlLabel      = document.getElementById('lanUrlLabel');
  const lanInstructions  = document.getElementById('lanInstructions');

  // Store the live local IP fetched from the server
  let cachedLocalIp = '';

  // Fetch live LAN IP from server once
  fetch('api.php?entity=info')
    .then(r => r.json())
    .then(data => {
      if (data && data.ip) {
        cachedLocalIp = `http://${data.ip}:8080/`;
        refreshAccessBarAndModal();
      }
    })
    .catch(() => {});

  /**
   * Updates the header button and the LAN modal content
   * to match the current access configuration (Local or Web).
   */
  async function refreshAccessBarAndModal() {
    const { mode, webUrl } = await getAccessConfig();
    const isWebMode = mode === 'web' && webUrl;

    // --- Header button ---
    if (btnLanInfo) {
      if (isWebMode) {
        btnLanInfo.innerHTML = `
          <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>Acesso Web</span>`;
      } else {
        btnLanInfo.innerHTML = `
          <svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h.01" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
            <path d="M5 12.859a10 10 0 0 1 14 0" />
            <path d="M1.5 9.288a15 15 0 0 1 21 0" />
          </svg>
          <span>Rede Wi-Fi</span>`;
      }
    }

    // --- Modal content ---
    if (isWebMode) {
      if (lanModalTitle)    lanModalTitle.textContent    = 'Acesso Web (Endereço Virtual)';
      if (lanModalSubtitle) lanModalSubtitle.textContent = 'Qualquer dispositivo com acesso à internet pode acessar o GiraFila pelo endereço Web configurado abaixo.';
      if (lanUrlLabel)      lanUrlLabel.textContent      = 'Endereço Web';
      if (lanUrlDisplay)    lanUrlDisplay.textContent    = webUrl;
      if (lanInstructions)  lanInstructions.innerHTML    = `
        <strong>Como usar:</strong>
        <ul style="margin-left: var(--space-4); margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
          <li>Abra o navegador em qualquer dispositivo.</li>
          <li>Digite o endereço acima e acesse o GiraFila.</li>
          <li>Não é necessário estar na mesma rede Wi-Fi.</li>
        </ul>`;
    } else {
      if (lanModalTitle)    lanModalTitle.textContent    = 'Conectar Dispositivos (Rede Wi-Fi)';
      if (lanModalSubtitle) lanModalSubtitle.innerHTML   = 'Qualquer smartphone, tablet ou computador conectado à mesma rede Wi-Fi desta máquina pode acessar o <strong>GiraFila</strong> e operar simultaneamente com os mesmos dados em tempo real!';
      if (lanUrlLabel)      lanUrlLabel.textContent      = 'Endereço na Rede Local';
      if (lanUrlDisplay)    lanUrlDisplay.textContent    = cachedLocalIp || 'Carregando...';
      if (lanInstructions)  lanInstructions.innerHTML    = `
        <strong>
          <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
            style="margin-right: 4px; vertical-align: -2px;" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Como usar em campo:
        </strong>
        <ul style="margin-left: var(--space-4); margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
          <li>Conecte o smartphone dos voluntários no mesmo Wi-Fi deste computador.</li>
          <li>Abra o navegador do celular (Chrome, Safari, etc.) e digite o endereço acima.</li>
          <li>Pronto! Cadastros na recepção e atendimentos nos postos são sincronizados na hora.</li>
        </ul>`;
    }
  }

  // Initial render based on saved config
  refreshAccessBarAndModal();

  // Listen for changes made in the Secret Menu modal
  window.addEventListener('gf:accessConfigChanged', () => { refreshAccessBarAndModal(); });

  if (btnLanInfo && lanBackdrop) {
    btnLanInfo.addEventListener('click', () => {
      lanBackdrop.classList.add('active');
    });

    if (lanClose) {
      lanClose.addEventListener('click', () => {
        lanBackdrop.classList.remove('active');
      });
    }

    lanBackdrop.addEventListener('click', (e) => {
      if (e.target === lanBackdrop) {
        lanBackdrop.classList.remove('active');
      }
    });

    const lanUrlBox = document.getElementById('lanUrlBox');

    const handleCopy = async () => {
      if (!lanUrlDisplay) return;
      const textToCopy = lanUrlDisplay.textContent.trim();
      if (!textToCopy) return;

      const success = await copyTextToClipboard(textToCopy, lanUrlDisplay);

      if (success) {
        if (btnCopyLanUrl) {
          const originalText = btnCopyLanUrl.innerHTML;
          btnCopyLanUrl.innerHTML = getIcon('check', 16) + ' <span>Endereço Copiado!</span>';
          btnCopyLanUrl.classList.add('btn-primary');
          btnCopyLanUrl.classList.remove('btn-secondary');
          setTimeout(() => {
            btnCopyLanUrl.innerHTML = originalText;
            btnCopyLanUrl.classList.remove('btn-primary');
            btnCopyLanUrl.classList.add('btn-secondary');
          }, 2000);
        }
        showSuccess('Endereço copiado para a área de transferência!');
      } else {
        showToast('GF-SYSTEM-SYS-003', 'warning');
      }
    };

    if (btnCopyLanUrl) {
      btnCopyLanUrl.addEventListener('click', handleCopy);
    }

    if (lanUrlDisplay) {
      lanUrlDisplay.addEventListener('click', handleCopy);
    }

    if (lanUrlBox) {
      lanUrlBox.addEventListener('click', handleCopy);
    }
  }

  // 7. Check Initial Session
  const events = await getAllEvents();
  if (events.length === 0) {
    // Switch to Events tab to help volunteer start quickly
    switchTab('tabEvent');
  } else {
    // Open session modal to pick active context
    openSessionModal(false);
  }

  updateSessionBar();

  // 8. Export Master Password Management
  const btnExportLock     = document.getElementById('btnExportLock');
  const changePwdModal    = document.getElementById('changePwdModal');
  const changePwdBtnCancel  = document.getElementById('changePwdBtnCancel');
  const changePwdBtnConfirm = document.getElementById('changePwdBtnConfirm');
  const changePwdCurrent    = document.getElementById('changePwdCurrent');
  const changePwdNew        = document.getElementById('changePwdNew');
  const changePwdConfirm    = document.getElementById('changePwdConfirm');

  const closeChangePwdModal = () => {
    if (changePwdModal) changePwdModal.classList.remove('active');
    if (changePwdCurrent) changePwdCurrent.value = '';
    if (changePwdNew) changePwdNew.value = '';
    if (changePwdConfirm) changePwdConfirm.value = '';
  };

  if (btnExportLock && changePwdModal) {
    btnExportLock.addEventListener('click', () => {
      if (changePwdCurrent) changePwdCurrent.value = '';
      if (changePwdNew) changePwdNew.value = '';
      if (changePwdConfirm) changePwdConfirm.value = '';
      changePwdModal.classList.add('active');
      if (changePwdCurrent) changePwdCurrent.focus();
    });
  }

  if (changePwdBtnCancel) {
    changePwdBtnCancel.addEventListener('click', closeChangePwdModal);
  }

  if (changePwdModal) {
    changePwdModal.addEventListener('click', (e) => {
      if (e.target === changePwdModal) closeChangePwdModal();
    });
  }

  const handleChangePwdConfirm = async () => {
    const current = changePwdCurrent ? changePwdCurrent.value : '';
    const newPwd  = changePwdNew ? changePwdNew.value : '';
    const confirm = changePwdConfirm ? changePwdConfirm.value : '';

    try {
      const isValid = await verifyPassword(current);
      if (!isValid) {
        showToast('GF-LOCK-VAL-001', 'error');
        if (changePwdCurrent) {
          changePwdCurrent.focus();
          changePwdCurrent.select();
        }
        return;
      }

      if (newPwd.length < 6) {
        showToast('GF-LOCK-VAL-002', 'error');
        if (changePwdNew) {
          changePwdNew.focus();
        }
        return;
      }

      if (newPwd !== confirm) {
        showToast('GF-LOCK-VAL-003', 'error');
        if (changePwdConfirm) {
          changePwdConfirm.focus();
        }
        return;
      }

      await updatePassword(newPwd);
      closeChangePwdModal();
      showSuccess('Senha mestre alterada com sucesso!');
    } catch (err) {
      console.error('[GiraFila Change Pwd] Erro ao alterar senha:', err);
      showToast(err.code || 'GF-LOCK-SYS-001', 'error');
    }
  };

  if (changePwdBtnConfirm) {
    changePwdBtnConfirm.addEventListener('click', handleChangePwdConfirm);
  }

  // Enter key support on password fields
  [changePwdCurrent, changePwdNew, changePwdConfirm].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleChangePwdConfirm();
        }
      });
    }
  });
});
