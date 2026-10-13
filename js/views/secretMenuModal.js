/**
 * GiraFila — Secret Menu Modal
 * Triggered by 5 clicks on the Dashboard tab within 30 seconds.
 * Requires Master Password authentication before opening.
 * Provides data purge functionality with cascading toggles.
 * Aligned with HARNESS/Architecture/ErrorGovernance.md and SecurityGovernance.md
 */

import { verifyPassword } from '../utils/masterPassword.js';
import { getEntityCounts, purgeEntities } from '../services/storageService.js';
import { showToast, showSuccess } from '../services/errorHandler.js';
import { getIcon } from '../utils/icons.js';
import { resetSession } from './sessionModal.js';
import { openExportModal } from './dashboardView.js';
import { getAccessConfig, sanitizeWebUrl, validateWebUrl, saveAccessConfig } from '../utils/accessConfig.js';

// ---------------------------------------------------------------------------
// MASTER PASSWORD PROMPT
// ---------------------------------------------------------------------------

/**
 * Displays the master password prompt modal.
 * Resolves true if password is valid, false if cancelled.
 * @returns {Promise<boolean>}
 */
function promptMasterPassword() {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.style.zIndex = 'var(--z-modal-confirm)';

    backdrop.innerHTML = `
      <div class="modal-dialog" style="max-width:380px;">
        <div class="modal-header">
          <h2 class="card-title" style="display:flex;align-items:center;gap:8px;font-size:var(--font-size-base);">
            ${getIcon('lock', 16)}
            <span>Acesso Restrito</span>
          </h2>
        </div>
        <div class="modal-body">
          <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-bottom:var(--space-4);">
            Informe a senha mestre para acessar o menu de administração.
          </p>
          <div class="form-group" style="margin:0;">
            <label class="form-label required" for="secretMenuMasterPwd">
              ${getIcon('lock', 14)}
              Senha Mestre
            </label>
            <input
              type="password"
              id="secretMenuMasterPwd"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              aria-label="Senha mestre para acessar o menu secreto"
            />
            <span class="form-error-msg" id="secretMenuMasterPwdError"></span>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="secretMenuPwdCancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="secretMenuPwdConfirm">
            ${getIcon('check', 14)} Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const pwdInput  = backdrop.querySelector('#secretMenuMasterPwd');
    const pwdError  = backdrop.querySelector('#secretMenuMasterPwdError');
    const btnCancel = backdrop.querySelector('#secretMenuPwdCancel');
    const btnConfirm = backdrop.querySelector('#secretMenuPwdConfirm');

    const close = (result) => { backdrop.remove(); resolve(result); };

    btnCancel.onclick = () => close(false);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });

    const handleConfirm = async () => {
      const pwd = pwdInput.value;
      if (!pwd) {
        pwdError.textContent = 'Informe a senha mestre para continuar.';
        pwdInput.classList.add('form-input--error');
        pwdInput.focus();
        return;
      }

      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Verificando...';

      try {
        const isValid = await verifyPassword(pwd);
        if (!isValid) {
          showToast('GF-LOCK-VAL-001', 'error');
          pwdError.textContent = 'Senha mestre incorreta. Tente novamente.';
          pwdInput.classList.add('form-input--error');
          pwdInput.value = '';
          pwdInput.focus();
          btnConfirm.disabled = false;
          btnConfirm.innerHTML = `${getIcon('check', 14)} Confirmar`;
          return;
        }
        close(true);
      } catch (err) {
        showToast('GF-LOCK-SYS-001', 'error');
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `${getIcon('check', 14)} Confirmar`;
      }
    };

    btnConfirm.onclick = handleConfirm;
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
      if (pwdInput.classList.contains('form-input--error')) {
        pwdInput.classList.remove('form-input--error');
        pwdError.textContent = '';
      }
    });

    // Auto-focus after render
    setTimeout(() => pwdInput.focus(), 50);
  });
}

// ---------------------------------------------------------------------------
// SECRET MENU HUB (ADMINISTRATIVE ACTIONS)
// ---------------------------------------------------------------------------

/**
 * Opens the clean Secret Menu hub with administrative actions (Export, Clean Data).
 */
function openSecretMenuModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop active';
  backdrop.style.zIndex = 'var(--z-modal-primary)';
  backdrop.id = 'secretMenuBackdrop';

  backdrop.innerHTML = `
    <div class="modal-dialog" style="max-width:440px;">
      <div class="modal-header" style="background:var(--color-surface-hover);border-bottom:1px solid var(--color-border);border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
        <h2 class="card-title" style="display:flex;align-items:center;gap:8px;color:var(--color-text-main);font-size:var(--font-size-base);">
          ${getIcon('lock', 16)}
          <span>Menu Secreto — Administração</span>
        </h2>
        <button type="button" class="btn-icon" id="secretMenuClose" aria-label="Fechar menu secreto" style="margin-left:auto;">
          ${getIcon('close', 18)}
        </button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-3);">

        <!-- Ação 1: Exportação de Dados -->
        <div style="background:var(--color-surface);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-main);">Exportação de Dados</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Gerar planilha Excel (.xlsx) com dados filtrados</span>
          </div>
          <button type="button" class="btn btn-primary" id="secretMenuBtnExport" style="white-space:nowrap;">
            ${getIcon('download', 14)} Exportar .xlsx
          </button>
        </div>

        <!-- Ação 2: Limpeza de Dados -->
        <div style="background:var(--color-surface);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-main);">Limpeza de Dados</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Expurgo físico e definitivo de registros do banco</span>
          </div>
          <button type="button" class="btn btn-danger" id="secretMenuBtnOpenClean" style="white-space:nowrap;">
            ${getIcon('trash', 14)} Limpar Dados
          </button>
        </div>

        <!-- Ação 3: Endereço de Acesso -->
        <div style="background:var(--color-surface);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:var(--font-size-base);font-weight:var(--font-weight-medium);color:var(--color-text-main);">Endereço de Acesso</span>
            <span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Configurar se o acesso é por rede local ou endereço Web</span>
          </div>
          <button type="button" class="btn btn-secondary" id="secretMenuBtnAccessAddress" style="white-space:nowrap;">
            ${getIcon('globe', 14)} Configurar
          </button>
        </div>

      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="secretMenuCloseBtn">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();

  const btnExport = backdrop.querySelector('#secretMenuBtnExport');
  if (btnExport) {
    btnExport.onclick = () => {
      close();
      openExportModal(() => openSecretMenuModal());
    };
  }

  const btnOpenClean = backdrop.querySelector('#secretMenuBtnOpenClean');
  if (btnOpenClean) {
    btnOpenClean.onclick = () => {
      close();
      openCleanDataModal();
    };
  }

  const btnAccessAddress = backdrop.querySelector('#secretMenuBtnAccessAddress');
  if (btnAccessAddress) {
    btnAccessAddress.onclick = () => {
      close();
      openAccessAddressModal();
    };
  }

  backdrop.querySelector('#secretMenuClose').onclick = close;
  backdrop.querySelector('#secretMenuCloseBtn').onclick = close;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });
}

// ---------------------------------------------------------------------------
// ACCESS ADDRESS MODAL (EXCLUSIVE MODAL)
// ---------------------------------------------------------------------------

/**
 * Opens the dedicated Access Address configuration modal.
 * Allows admin to choose between Local (LAN/Wi-Fi) and Web (virtual URL) modes.
 */
async function openAccessAddressModal() {
  const { mode: currentMode, webUrl: currentWebUrl } = await getAccessConfig();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop active';
  backdrop.style.zIndex = 'var(--z-modal-primary)';
  backdrop.id = 'accessAddressBackdrop';

  backdrop.innerHTML = `
    <div class="modal-dialog" style="max-width:480px;">
      <div class="modal-header" style="border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
        <h2 class="card-title" style="display:flex;align-items:center;gap:8px;font-size:var(--font-size-base);">
          ${getIcon('globe', 16)}
          <span>Endereço de Acesso</span>
        </h2>
        <button type="button" class="btn-icon" id="accessAddressClose" aria-label="Fechar modal de endereço de acesso" style="margin-left:auto;">
          ${getIcon('close', 18)}
        </button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4);">

        <!-- Segmented control: Local / Web -->
        <div>
          <p style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-secondary);margin:0 0 var(--space-2) 0;">
            Tipo de acesso:
          </p>
          <div id="accessModeControl" style="display:flex;background:var(--color-surface-hover);border-radius:var(--radius-md);padding:3px;gap:3px;">
            <button type="button" id="accessModeLocal"
              style="flex:1;padding:var(--space-2) var(--space-3);border-radius:calc(var(--radius-md) - 2px);border:none;cursor:pointer;font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);transition:all var(--transition-fast);display:flex;align-items:center;justify-content:center;gap:6px;">
              ${getIcon('wifi', 14)} Local (Rede Wi-Fi)
            </button>
            <button type="button" id="accessModeWeb"
              style="flex:1;padding:var(--space-2) var(--space-3);border-radius:calc(var(--radius-md) - 2px);border:none;cursor:pointer;font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);transition:all var(--transition-fast);display:flex;align-items:center;justify-content:center;gap:6px;">
              ${getIcon('globe', 14)} Web (Endereço Virtual)
            </button>
          </div>
        </div>

        <!-- Local mode content -->
        <div id="accessLocalContent">
          <div style="background:var(--color-primary-light);border:1.5px solid var(--color-primary);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
            <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--color-primary);text-transform:uppercase;margin-bottom:4px;">
              Endereço na Rede Local
            </div>
            <div id="accessLocalIpDisplay" style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);font-family:var(--font-family-mono);color:var(--color-primary);word-break:break-all;">
              Carregando...
            </div>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin:var(--space-2) 0 0 0;">
            Dispositivos na mesma rede Wi-Fi acessam pelo endereço acima.
          </p>
        </div>

        <!-- Web mode content -->
        <div id="accessWebContent" style="display:none;">
          <div class="form-group" style="margin:0;">
            <label class="form-label required" for="accessWebUrlInput">
              ${getIcon('globe', 14)}
              Endereço virtual da aplicação
            </label>
            <input
              type="url"
              id="accessWebUrlInput"
              class="form-input"
              placeholder="https://girafila.exemplo.com"
              autocomplete="off"
              aria-label="Endereço virtual da aplicação Web"
              value="${currentWebUrl.replace(/"/g, '&quot;')}"
            />
            <span class="form-error-msg" id="accessWebUrlError"></span>
          </div>
          <!-- Live preview -->
          <div id="accessWebPreviewBox" style="margin-top:var(--space-3);background:var(--color-primary-light);border:1.5px solid var(--color-primary);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;${currentWebUrl ? '' : 'display:none;'}">
            <div style="font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--color-primary);text-transform:uppercase;margin-bottom:4px;">
              Endereço Web Configurado
            </div>
            <div id="accessWebPreviewUrl" style="font-size:var(--font-size-base);font-weight:var(--font-weight-bold);font-family:var(--font-family-mono);color:var(--color-primary);word-break:break-all;">
              ${currentWebUrl}
            </div>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin:var(--space-2) 0 0 0;">
            Todos os dispositivos acessarão pelo endereço virtual acima, mesmo fora da rede local.
          </p>
        </div>

      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="accessAddressBack">Voltar</button>
        <button type="button" class="btn btn-primary" id="accessAddressSave">
          ${getIcon('check', 14)} Salvar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // --- Helpers ---
  const btnLocal       = backdrop.querySelector('#accessModeLocal');
  const btnWeb         = backdrop.querySelector('#accessModeWeb');
  const localContent   = backdrop.querySelector('#accessLocalContent');
  const webContent     = backdrop.querySelector('#accessWebContent');
  const webUrlInput    = backdrop.querySelector('#accessWebUrlInput');
  const webUrlError    = backdrop.querySelector('#accessWebUrlError');
  const previewBox     = backdrop.querySelector('#accessWebPreviewBox');
  const previewUrl     = backdrop.querySelector('#accessWebPreviewUrl');
  const localIpDisplay = backdrop.querySelector('#accessLocalIpDisplay');

  let activeMode = currentMode;

  // Fetch local IP to display in Local mode
  fetch('api.php?entity=info')
    .then(r => r.json())
    .then(data => {
      if (data && data.ip && localIpDisplay) {
        localIpDisplay.textContent = `http://${data.ip}:8080/`;
      }
    })
    .catch(() => {
      if (localIpDisplay) localIpDisplay.textContent = 'Não foi possível obter o IP local.';
    });

  const ACTIVE_STYLE   = 'background:var(--color-primary);color:#fff;box-shadow:var(--shadow-sm);';
  const INACTIVE_STYLE = 'background:transparent;color:var(--color-text-muted);';

  function applyModeStyles() {
    if (activeMode === 'local') {
      btnLocal.setAttribute('style', btnLocal.getAttribute('style').replace(/flex:1;/, 'flex:1;') + ACTIVE_STYLE);
      btnWeb.setAttribute('style', btnWeb.getAttribute('style').replace(/flex:1;/, 'flex:1;') + INACTIVE_STYLE);
      btnLocal.style.background = 'var(--color-primary)';
      btnLocal.style.color = '#fff';
      btnLocal.style.boxShadow = 'var(--shadow-sm)';
      btnWeb.style.background = 'transparent';
      btnWeb.style.color = 'var(--color-text-muted)';
      btnWeb.style.boxShadow = 'none';
      localContent.style.display = '';
      webContent.style.display = 'none';
    } else {
      btnWeb.style.background = 'var(--color-primary)';
      btnWeb.style.color = '#fff';
      btnWeb.style.boxShadow = 'var(--shadow-sm)';
      btnLocal.style.background = 'transparent';
      btnLocal.style.color = 'var(--color-text-muted)';
      btnLocal.style.boxShadow = 'none';
      localContent.style.display = 'none';
      webContent.style.display = '';
    }
  }

  applyModeStyles();

  btnLocal.onclick = () => { activeMode = 'local'; applyModeStyles(); };
  btnWeb.onclick   = () => { activeMode = 'web';   applyModeStyles(); setTimeout(() => webUrlInput && webUrlInput.focus(), 50); };

  // Live URL preview as user types
  if (webUrlInput) {
    webUrlInput.addEventListener('input', () => {
      webUrlError.textContent = '';
      webUrlInput.classList.remove('form-input--error');
      const val = webUrlInput.value.trim();
      if (val && validateWebUrl(val)) {
        previewUrl.textContent = val;
        previewBox.style.display = '';
      } else {
        previewBox.style.display = 'none';
      }
    });
  }

  const closeModal = () => backdrop.remove();
  const goBack     = () => { closeModal(); openSecretMenuModal(); };

  backdrop.querySelector('#accessAddressClose').onclick = closeModal;
  backdrop.querySelector('#accessAddressBack').onclick  = goBack;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
  });

  // Save
  backdrop.querySelector('#accessAddressSave').onclick = async () => {
    if (activeMode === 'web') {
      const rawUrl  = webUrlInput ? webUrlInput.value : '';
      const cleaned = sanitizeWebUrl(rawUrl);

      if (!cleaned) {
        showToast('GF-ACCESS-VAL-001', 'warning');
        webUrlError.textContent = 'Informe o endereço virtual da aplicação.';
        webUrlInput.classList.add('form-input--error');
        webUrlInput.focus();
        return;
      }

      if (!validateWebUrl(cleaned)) {
        showToast('GF-ACCESS-VAL-002', 'warning');
        webUrlError.textContent = 'Endereço inválido. Inclua http:// ou https://.';
        webUrlInput.classList.add('form-input--error');
        webUrlInput.focus();
        return;
      }

      await saveAccessConfig({ mode: 'web', webUrl: cleaned });
    } else {
      await saveAccessConfig({ mode: 'local', webUrl: '' });
    }

    // Notify the rest of the app that the config changed
    window.dispatchEvent(new CustomEvent('gf:accessConfigChanged'));

    closeModal();
    showSuccess('Configuração de acesso salva com sucesso!');
  };
}

// ---------------------------------------------------------------------------
// CLEAN DATA MODAL (EXCLUSIVE MODAL WITH TOGGLES)
// ---------------------------------------------------------------------------

/**
 * Opens the dedicated Clean Data modal with selective toggles.
 */
async function openCleanDataModal() {
  let counts = { events: 0, services: 0, visitors: 0, attendances: 0 };
  try {
    counts = await getEntityCounts();
  } catch (err) {
    console.warn('[GiraFila SecretMenu] Could not fetch entity counts:', err);
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop active';
  backdrop.style.zIndex = 'var(--z-modal-primary)';
  backdrop.id = 'cleanDataBackdrop';

  backdrop.innerHTML = `
    <div class="modal-dialog" style="max-width:480px;">
      <div class="modal-header" style="background:var(--color-danger-light,#fff0f0);border-bottom:2px solid var(--color-danger,#e53e3e);border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
        <h2 class="card-title" style="display:flex;align-items:center;gap:8px;color:var(--color-danger,#e53e3e);font-size:var(--font-size-base);">
          ${getIcon('alertTriangle', 16)}
          <span>Limpeza de Dados</span>
        </h2>
        <button type="button" class="btn-icon" id="cleanDataClose" aria-label="Fechar modal de limpeza" style="margin-left:auto;">
          ${getIcon('close', 18)}
        </button>
      </div>

      <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4);">

        <!-- Warning alert -->
        <div style="display:flex;gap:var(--space-3);padding:var(--space-3);background:var(--color-danger-light,#fff0f0);border:1px solid var(--color-danger,#e53e3e);border-radius:var(--radius-md);align-items:flex-start;">
          ${getIcon('alertTriangle', 18)}
          <p style="font-size:var(--font-size-sm);color:var(--color-danger,#e53e3e);margin:0;line-height:1.5;">
            <strong>Ação irreversível.</strong> Os registros selecionados abaixo serão permanentemente excluídos do banco de dados.
          </p>
        </div>

        <!-- Toggles -->
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          <p style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text-secondary);margin:0;">
            Selecione os registros a excluir:
          </p>

          <!-- Attendances -->
          <label class="export-toggle-row" for="cleanToggleAttendances" style="cursor:pointer;">
            <div class="export-toggle-info">
              <span class="export-toggle-label">Atendimentos</span>
              <span class="export-toggle-count" id="secretMenuCountAttendances">${counts.attendances} registros</span>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="cleanToggleAttendances">
              <span class="toggle-slider"></span>
            </div>
          </label>

          <!-- Visitors -->
          <label class="export-toggle-row" for="cleanToggleVisitors" style="cursor:pointer;">
            <div class="export-toggle-info">
              <span class="export-toggle-label">Visitantes</span>
              <span class="export-toggle-count" id="secretMenuCountVisitors">${counts.visitors} registros</span>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="cleanToggleVisitors">
              <span class="toggle-slider"></span>
            </div>
          </label>

          <!-- Services -->
          <label class="export-toggle-row" for="cleanToggleServices" style="cursor:pointer;">
            <div class="export-toggle-info">
              <span class="export-toggle-label">Serviços</span>
              <span class="export-toggle-count" id="secretMenuCountServices">${counts.services} registros</span>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="cleanToggleServices">
              <span class="toggle-slider"></span>
            </div>
          </label>

          <!-- Events -->
          <label class="export-toggle-row" for="cleanToggleEvents" style="cursor:pointer;">
            <div class="export-toggle-info">
              <span class="export-toggle-label">Eventos</span>
              <span class="export-toggle-count" id="secretMenuCountEvents">${counts.events} registros</span>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="cleanToggleEvents">
              <span class="toggle-slider"></span>
            </div>
          </label>
        </div>

        <!-- Validation error -->
        <span class="form-error-msg" id="secretMenuCleanError" style="display:none;"></span>

      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cleanDataCancel">Voltar</button>
        <button type="button" class="btn btn-danger" id="cleanDataExecute">
          ${getIcon('trash', 14)} Executar Limpeza
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeClean = () => backdrop.remove();

  // "Voltar" returns to the Secret Menu hub
  const goBack = () => {
    closeClean();
    openSecretMenuModal();
  };

  backdrop.querySelector('#cleanDataClose').onclick = closeClean;
  backdrop.querySelector('#cleanDataCancel').onclick = goBack;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeClean(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { closeClean(); document.removeEventListener('keydown', escHandler); }
  });

  // Cascade logic
  const toggleAttendances = backdrop.querySelector('#cleanToggleAttendances');
  const toggleVisitors    = backdrop.querySelector('#cleanToggleVisitors');
  const toggleServices    = backdrop.querySelector('#cleanToggleServices');
  const toggleEvents      = backdrop.querySelector('#cleanToggleEvents');
  const cleanError        = backdrop.querySelector('#secretMenuCleanError');

  function applyCascadeDown(changed) {
    if (changed === toggleEvents && toggleEvents.checked) {
      toggleServices.checked    = true;
      toggleVisitors.checked    = true;
      toggleAttendances.checked = true;
    }
    if ((changed === toggleServices || changed === toggleVisitors) && changed.checked) {
      toggleAttendances.checked = true;
    }
  }

  function applyCascadeUp(changed) {
    if (changed === toggleAttendances && !toggleAttendances.checked) {
      toggleVisitors.checked = false;
      toggleServices.checked = false;
      toggleEvents.checked   = false;
    }
    if ((changed === toggleVisitors || changed === toggleServices) && !changed.checked) {
      toggleEvents.checked = false;
    }
  }

  [toggleAttendances, toggleVisitors, toggleServices, toggleEvents].forEach(toggle => {
    toggle.addEventListener('change', () => {
      applyCascadeDown(toggle);
      applyCascadeUp(toggle);
      cleanError.style.display = 'none';
    });
  });

  // Execute clean
  backdrop.querySelector('#cleanDataExecute').onclick = () => {
    const selected = {
      attendances: toggleAttendances.checked,
      visitors:    toggleVisitors.checked,
      services:    toggleServices.checked,
      events:      toggleEvents.checked,
    };

    if (!Object.values(selected).some(Boolean)) {
      showToast('GF-CLEAN-VAL-001', 'warning');
      cleanError.textContent   = 'Selecione ao menos um tipo de registro para realizar a limpeza.';
      cleanError.style.display = 'block';
      return;
    }

    openCleanConfirmDialog(selected, closeClean);
  };
}

// ---------------------------------------------------------------------------
// CONFIRMATION DIALOG
// ---------------------------------------------------------------------------

function openCleanConfirmDialog(selected, onSuccess) {
  const labels = {
    attendances: 'Atendimentos',
    visitors:    'Visitantes',
    services:    'Serviços',
    events:      'Eventos',
  };

  const selectedLabels = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => `<strong>${labels[k]}</strong>`)
    .join(', ');

  const confirmBackdrop = document.createElement('div');
  confirmBackdrop.className = 'modal-backdrop active';
  confirmBackdrop.style.zIndex = 'var(--z-modal-confirm)';

  confirmBackdrop.innerHTML = `
    <div class="modal-dialog" style="max-width:380px;">
      <div class="modal-header">
        <h2 class="card-title" style="display:flex;align-items:center;gap:8px;color:var(--color-danger,#e53e3e);font-size:var(--font-size-base);">
          ${getIcon('alertTriangle', 16)}
          <span>Confirmar Limpeza</span>
        </h2>
      </div>
      <div class="modal-body">
        <p style="font-size:var(--font-size-sm);line-height:1.6;margin:0;">
          Você está prestes a excluir permanentemente: ${selectedLabels}.
          <br><br>
          <span style="color:var(--color-danger,#e53e3e);font-weight:600;">Esta ação não pode ser desfeita.</span>
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cleanConfirmCancel">Cancelar</button>
        <button type="button" class="btn btn-danger" id="cleanConfirmExecute">
          ${getIcon('trash', 14)} Confirmar e Excluir
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmBackdrop);

  const closeConfirm = () => confirmBackdrop.remove();

  confirmBackdrop.querySelector('#cleanConfirmCancel').onclick = closeConfirm;
  confirmBackdrop.addEventListener('click', (e) => { if (e.target === confirmBackdrop) closeConfirm(); });

  confirmBackdrop.querySelector('#cleanConfirmExecute').onclick = async () => {
    const btn = confirmBackdrop.querySelector('#cleanConfirmExecute');
    btn.disabled = true;
    btn.innerHTML = `${getIcon('refresh', 14)} Processando...`;

    try {
      await purgeEntities(selected);

      closeConfirm();
      onSuccess(); // closes the main Secret Menu modal

      // Reset session if events or services were purged
      if (selected.events) {
        resetSession(false);
      } else if (selected.services) {
        resetSession(true);
      }

      // Refresh all active views
      if (window.refreshAttendanceView) window.refreshAttendanceView();
      if (window.refreshVisitorView)    window.refreshVisitorView();
      if (window.refreshServiceView)    window.refreshServiceView();
      if (window.refreshEventView)      window.refreshEventView();
      if (window.refreshDashboardView)  window.refreshDashboardView();

      const purgedCount = Object.values(selected).filter(Boolean).length;
      showSuccess(`Limpeza concluída com sucesso! ${purgedCount} tipo(s) de registro expurgado(s).`);

    } catch (err) {
      console.error('[GiraFila SecretMenu] Purge error:', err);
      showToast('GF-CLEAN-SYS-001', 'error');
      btn.disabled = false;
      btn.innerHTML = `${getIcon('trash', 14)} Confirmar e Excluir`;
    }
  };
}

// ---------------------------------------------------------------------------
// EXPORTED ENTRY POINT
// ---------------------------------------------------------------------------

/**
 * Entry point: prompts master password then opens the Secret Menu.
 */
export async function openSecretMenu() {
  const authenticated = await promptMasterPassword();
  if (!authenticated) return;
  await openSecretMenuModal();
}
