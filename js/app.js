/**
 * GiraFila — Application Entry Point
 * Orchestrates views, tab switching, and session lifecycle
 */

import { initDb, getAllEvents } from './services/storageService.js';
import { openSessionModal, updateSessionBar, onSessionChange, getSession } from './views/sessionModal.js';
import { initVisitorView } from './views/visitorView.js';
import { initEventView } from './views/eventView.js';
import { initServiceView } from './views/serviceView.js';
import { initAttendanceView } from './views/attendanceView.js';
import { initDashboardView } from './views/dashboardView.js';
import { copyTextToClipboard } from './utils/clipboard.js';
import { showToast, showSuccess } from './services/errorHandler.js';

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

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 4. Session Change Listener
  onSessionChange((session) => {
    if (window.refreshAttendanceView) window.refreshAttendanceView();
    if (window.refreshVisitorView)    window.refreshVisitorView();
    if (window.refreshServiceView)    window.refreshServiceView();
    if (window.refreshEventView)      window.refreshEventView();
    if (window.refreshDashboardView)  window.refreshDashboardView();
  });

  // 5. Context Selection Buttons
  const btnSelectEventContext = document.getElementById('btnSelectEventContext');
  if (btnSelectEventContext) {
    btnSelectEventContext.addEventListener('click', () => {
      openSessionModal(false, 'event');
    });
  }

  const btnSelectServiceContext = document.getElementById('btnSelectServiceContext');
  if (btnSelectServiceContext) {
    btnSelectServiceContext.addEventListener('click', () => {
      openSessionModal(false, 'service');
    });
  }

  // 6. LAN Wi-Fi Info Modal
  const btnLanInfo = document.getElementById('btnLanInfo');
  const lanBackdrop = document.getElementById('lanModalBackdrop');
  const lanClose = document.getElementById('lanModalClose');
  const btnCopyLanUrl = document.getElementById('btnCopyLanUrl');
  const lanUrlDisplay = document.getElementById('lanUrlDisplay');

  // Dynamically update displayed LAN URL from server
  fetch('api.php?entity=info')
    .then(r => r.json())
    .then(data => {
      if (data && data.ip && lanUrlDisplay) {
        lanUrlDisplay.textContent = `http://${data.ip}:8080/`;
      }
    })
    .catch(() => {});

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
          btnCopyLanUrl.innerHTML = '✅ Endereço Copiado!';
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
});
