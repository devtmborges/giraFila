/**
 * GiraFila — Session Management & Context Selection Modal
 * Implements business rule: Mandatory Event + Service context per session
 */

import { getAllEvents, getServicesByEventId, getEventById, getServiceById } from '../services/storageService.js';
import { showToast } from '../services/errorHandler.js';
import { getIcon } from '../utils/icons.js';

let currentSession = {
  eventId: null,
  eventName: null,
  serviceId: null,
  serviceName: null
};

const listeners = [];

export function getSession() {
  return { ...currentSession };
}

export function onSessionChange(callback) {
  listeners.push(callback);
}

function notifyListeners() {
  listeners.forEach(cb => cb(getSession()));
}

export function updateSessionBar() {
  const eventDisplay = document.getElementById('sessionEventDisplay');
  const serviceDisplay = document.getElementById('sessionServiceDisplay');

  if (eventDisplay) {
    eventDisplay.textContent = currentSession.eventName ? currentSession.eventName : 'Nenhum Selecionado';
  }
  if (serviceDisplay) {
    serviceDisplay.textContent = currentSession.serviceName ? currentSession.serviceName : 'Nenhum Selecionado';
  }
}

export function clearSessionIfMatches(eventId, serviceId = null) {
  let changed = false;
  if (eventId && currentSession.eventId === Number(eventId)) {
    currentSession.eventId = null;
    currentSession.eventName = null;
    currentSession.serviceId = null;
    currentSession.serviceName = null;
    changed = true;
  } else if (serviceId && currentSession.serviceId === Number(serviceId)) {
    currentSession.serviceId = null;
    currentSession.serviceName = null;
    changed = true;
  }
  if (changed) {
    updateSessionBar();
    notifyListeners();
  }
}

export function updateSessionNames(eventId, newEventName, serviceId = null, newServiceName = null) {
  let changed = false;
  if (eventId && currentSession.eventId === Number(eventId) && newEventName) {
    currentSession.eventName = newEventName;
    changed = true;
  }
  if (serviceId && currentSession.serviceId === Number(serviceId) && newServiceName) {
    currentSession.serviceName = newServiceName;
    changed = true;
  }
  if (changed) {
    updateSessionBar();
    notifyListeners();
  }
}

/**
 * Opens modal for selecting the active event and service
 * @param {boolean} [forced=false]
 * @param {'event'|'service'|null} [focusField=null]
 */
export async function openSessionModal(forced = false, focusField = null) {
  const events = await getAllEvents();

  const backdrop = document.getElementById('sessionModalBackdrop');
  const selectEvent = document.getElementById('sessionSelectEvent');
  const selectService = document.getElementById('sessionSelectService');
  const btnClose = document.getElementById('sessionModalClose');
  const btnSave = document.getElementById('sessionModalSave');
  const sessionWarning = document.getElementById('sessionModalWarning');

  if (!backdrop || !selectEvent || !selectService) return;

  // Populate events dropdown
  selectEvent.innerHTML = '<option value="">-- Selecione o Evento --</option>';
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${ev.name} (${ev.date.substring(0, 10)})`;
    if (currentSession.eventId && Number(currentSession.eventId) === ev.id) {
      opt.selected = true;
    }
    selectEvent.appendChild(opt);
  });

  // Handler for loading services
  const loadServices = async (selectedEvId) => {
    selectService.innerHTML = '<option value="">-- Selecione o Serviço --</option>';
    if (!selectedEvId) {
      selectService.disabled = true;
      return;
    }

    const services = await getServicesByEventId(selectedEvId);
    if (services.length === 0) {
      selectService.innerHTML = '<option value="">Nenhum serviço cadastrado para este evento</option>';
      selectService.disabled = true;
    } else {
      selectService.disabled = false;
      services.forEach(srv => {
        const opt = document.createElement('option');
        opt.value = srv.id;
        const allowsCh = srv.allows_children !== undefined ? srv.allows_children : !srv.only_adults;
        const allowsAd = srv.allows_adults !== undefined ? srv.allows_adults : !srv.only_children;

        let suffix = '';
        if (allowsCh && !allowsAd) suffix = ' [Crianças]';
        else if (!allowsCh && allowsAd) suffix = ' [Adultos]';
        opt.textContent = `${srv.name}${suffix}`;
        if (currentSession.serviceId && Number(currentSession.serviceId) === srv.id) {
          opt.selected = true;
        }
        selectService.appendChild(opt);
      });
    }
  };

  selectEvent.onchange = () => {
    loadServices(selectEvent.value);
  };

  if (selectEvent.value) {
    await loadServices(selectEvent.value);
  } else {
    selectService.disabled = true;
  }

  if (events.length === 0) {
    sessionWarning.innerHTML = getIcon('alertTriangle', 18, 'text-warning') + ' <span>Não há nenhum evento cadastrado ainda. Vá até a aba <strong>Eventos</strong> para criar o primeiro evento.</span>';
    sessionWarning.style.display = 'flex';
    sessionWarning.style.alignItems = 'center';
    sessionWarning.style.gap = '8px';
  } else {
    sessionWarning.style.display = 'none';
  }

  // If forced, do not allow closing without selecting unless no events exist
  if (forced && events.length > 0) {
    btnClose.style.display = 'none';
  } else {
    btnClose.style.display = 'inline-flex';
  }

  backdrop.classList.add('active');

  if (focusField === 'event') {
    setTimeout(() => selectEvent && selectEvent.focus(), 60);
  } else if (focusField === 'service') {
    setTimeout(() => {
      if (selectService && !selectService.disabled) {
        selectService.focus();
      } else if (selectEvent) {
        selectEvent.focus();
      }
    }, 60);
  }

  const close = () => {
    backdrop.classList.remove('active');
  };

  btnClose.onclick = close;

  btnSave.onclick = async () => {
    const evId = selectEvent.value;
    const srvId = selectService.value;

    if (!evId) {
      showToast('GF-SESSION-VAL-001', 'warning', 'Selecione um evento para definir a sessão.');
      return;
    }

    const evRecord = await getEventById(evId);
    let srvRecord = null;
    if (srvId) {
      srvRecord = await getServiceById(srvId);
    }

    currentSession.eventId = evRecord ? evRecord.id : null;
    currentSession.eventName = evRecord ? evRecord.name : null;
    currentSession.serviceId = srvRecord ? srvRecord.id : null;
    currentSession.serviceName = srvRecord ? srvRecord.name : null;

    updateSessionBar();
    notifyListeners();
    close();
  };
}
