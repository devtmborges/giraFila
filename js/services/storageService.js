/**
 * GiraFila — Storage Service (Dual Layer: LAN Central API with IndexedDB Fallback)
 * Aligned with HARNESS/Architecture/DatabaseAndRls.md and HARNESS/Architecture/TimeAndDates.md
 * Enables seamless synchronization across multiple devices connected via Wi-Fi/LAN.
 */

import { toLiteralUtcIso } from '../utils/sanitizer.js';
import { logAudit, setAuditDbInstance } from './auditService.js';

const DB_NAME = 'gira_fila_db';
const DB_VERSION = 1;

let db = null;
let useLanApi = null; // null = unprobed, true = use api.php, false = fallback to indexedDB

/**
 * Checks if the central LAN API is available on the hosting machine
 * @returns {Promise<boolean>}
 */
export async function isLanApiAvailable() {
  if (useLanApi !== null) return useLanApi;
  try {
    const res = await fetch('api.php?entity=info', { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      useLanApi = data && data.status === 'online';
      console.info('[GiraFila Storage] Central LAN SQLite API is ACTIVE on host:', data.ip || 'local');
      return useLanApi;
    }
  } catch {
    // If running file:// or static server without PHP
  }
  useLanApi = false;
  console.info('[GiraFila Storage] Central LAN API unavailable; using local browser IndexedDB.');
  return false;
}

/**
 * Initializes IndexedDB schema and object stores as fallback
 * @returns {Promise<IDBDatabase>}
 */
export function initDb() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains('events')) {
        const eventsStore = database.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventsStore.createIndex('name', 'name', { unique: false });
        eventsStore.createIndex('date', 'date', { unique: false });
      }

      if (!database.objectStoreNames.contains('services')) {
        const servicesStore = database.createObjectStore('services', { keyPath: 'id', autoIncrement: true });
        servicesStore.createIndex('event_id', 'event_id', { unique: false });
        servicesStore.createIndex('name', 'name', { unique: false });
      }

      if (!database.objectStoreNames.contains('visitors')) {
        const visitorsStore = database.createObjectStore('visitors', { keyPath: 'id', autoIncrement: true });
        visitorsStore.createIndex('event_id', 'event_id', { unique: false });
        visitorsStore.createIndex('qr_code', 'qr_code', { unique: false });
        visitorsStore.createIndex('event_qr', ['event_id', 'qr_code'], { unique: true });
        visitorsStore.createIndex('guardian_qr_code', 'guardian_qr_code', { unique: false });
      }

      if (!database.objectStoreNames.contains('attendances')) {
        const attendancesStore = database.createObjectStore('attendances', { keyPath: 'id', autoIncrement: true });
        attendancesStore.createIndex('event_id', 'event_id', { unique: false });
        attendancesStore.createIndex('service_id', 'service_id', { unique: false });
        attendancesStore.createIndex('visitor_qr_code', 'visitor_qr_code', { unique: false });
        attendancesStore.createIndex('event_service_visitor', ['event_id', 'service_id', 'visitor_qr_code'], { unique: true });
      }

      if (!database.objectStoreNames.contains('audit_logs')) {
        const auditStore = database.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        auditStore.createIndex('entity', 'entity', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      setAuditDbInstance(db);
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------

export async function createEvent({ name, date, location, description }) {
  const isLan = await isLanApiAvailable();
  const record = {
    name,
    date: toLiteralUtcIso(date),
    location,
    description: description || '',
    created_at: toLiteralUtcIso(new Date().toISOString())
  };

  if (isLan) {
    const res = await fetch('api.php?entity=events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('API_ERROR');
    const created = await res.json();
    logAudit({ entity: 'events', record_id: created.id, action: 'CREATE', after: created });
    return created;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const req = store.add(record);

    req.onsuccess = () => {
      const created = { id: req.result, ...record };
      logAudit({ entity: 'events', record_id: created.id, action: 'CREATE', after: created });
      resolve(created);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllEvents() {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch('api.php?entity=events');
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const req = store.getAll();

    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => b.id - a.id);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getEventById(id) {
  const events = await getAllEvents();
  return events.find(e => e.id === Number(id)) || null;
}

export async function updateEvent(id, { name, date, location, description }) {
  const isLan = await isLanApiAvailable();
  const before = await getEventById(id);
  const record = {
    name,
    date: toLiteralUtcIso(date),
    location,
    description: description || ''
  };

  if (isLan) {
    const res = await fetch(`api.php?entity=events&id=${Number(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('API_ERROR');
    const updated = await res.json();
    logAudit({ entity: 'events', record_id: id, action: 'UPDATE', before, after: updated });
    return updated;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const getReq = store.get(Number(id));

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) { reject(new Error('NOT_FOUND')); return; }
      const updated = { ...existing, ...record };
      const putReq = store.put(updated);
      putReq.onsuccess = () => {
        logAudit({ entity: 'events', record_id: id, action: 'UPDATE', before, after: updated });
        resolve(updated);
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteEvent(id) {
  const isLan = await isLanApiAvailable();
  const before = await getEventById(id);

  if (isLan) {
    const res = await fetch(`api.php?entity=events&id=${Number(id)}`, { method: 'DELETE' });
    if (res.status === 409) {
      const err = new Error('HAS_DEPENDENCIES');
      err.code = 'GF-EVENT-REG-001';
      throw err;
    }
    if (!res.ok) throw new Error('API_ERROR');
    logAudit({ entity: 'events', record_id: id, action: 'DELETE', before, after: null });
    return;
  }

  // IndexedDB: verify dependencies before deleting
  await initDb();
  const services = await getAllServices();
  const hasServices = services.some(s => s.event_id === Number(id));
  if (hasServices) {
    const err = new Error('HAS_DEPENDENCIES');
    err.code = 'GF-EVENT-REG-001';
    throw err;
  }

  const visitors = await getVisitorsByEventId(id);
  if (visitors.length > 0) {
    const err = new Error('HAS_DEPENDENCIES');
    err.code = 'GF-EVENT-REG-001';
    throw err;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const req = store.delete(Number(id));
    req.onsuccess = () => {
      logAudit({ entity: 'events', record_id: id, action: 'DELETE', before, after: null });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}


// ---------------------------------------------------------------------------
// SERVICES
// ---------------------------------------------------------------------------

export async function createService({ name, event_id, allows_children = true, allows_adults = true, only_children = false, only_adults = false, attendant_name, description = '' }) {
  const isLan = await isLanApiAvailable();
  const record = {
    name,
    event_id: Number(event_id),
    allows_children: Boolean(allows_children),
    allows_adults: Boolean(allows_adults),
    only_children: Boolean(only_children),
    only_adults: Boolean(only_adults),
    attendant_name,
    description: description || '',
    created_at: toLiteralUtcIso(new Date().toISOString())
  };

  if (isLan) {
    const res = await fetch('api.php?entity=services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('API_ERROR');
    const created = await res.json();
    logAudit({ entity: 'services', record_id: created.id, action: 'CREATE', after: created });
    return created;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readwrite');
    const store = tx.objectStore('services');
    const req = store.add(record);

    req.onsuccess = () => {
      const created = { id: req.result, ...record };
      logAudit({ entity: 'services', record_id: created.id, action: 'CREATE', after: created });
      resolve(created);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getServicesByEventId(eventId) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=services&event_id=${Number(eventId)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readonly');
    const store = tx.objectStore('services');
    const index = store.index('event_id');
    const req = index.getAll(Number(eventId));

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllServices() {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch('api.php?entity=services');
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readonly');
    const store = tx.objectStore('services');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getServiceById(id) {
  const services = await getAllServices();
  return services.find(s => s.id === Number(id)) || null;
}

export async function updateService(id, { name, event_id, allows_children, allows_adults, attendant_name, description }) {
  const isLan = await isLanApiAvailable();
  const before = await getServiceById(id);
  const only_children = Boolean(allows_children) && !Boolean(allows_adults);
  const only_adults = Boolean(allows_adults) && !Boolean(allows_children);
  const record = {
    name,
    event_id: Number(event_id),
    allows_children: Boolean(allows_children),
    allows_adults: Boolean(allows_adults),
    only_children,
    only_adults,
    attendant_name,
    description: description || ''
  };

  if (isLan) {
    const res = await fetch(`api.php?entity=services&id=${Number(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('API_ERROR');
    const updated = await res.json();
    logAudit({ entity: 'services', record_id: id, action: 'UPDATE', before, after: updated });
    return updated;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readwrite');
    const store = tx.objectStore('services');
    const getReq = store.get(Number(id));

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) { reject(new Error('NOT_FOUND')); return; }
      const updated = { ...existing, ...record };
      const putReq = store.put(updated);
      putReq.onsuccess = () => {
        logAudit({ entity: 'services', record_id: id, action: 'UPDATE', before, after: updated });
        resolve(updated);
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteService(id) {
  const isLan = await isLanApiAvailable();
  const before = await getServiceById(id);

  if (isLan) {
    const res = await fetch(`api.php?entity=services&id=${Number(id)}`, { method: 'DELETE' });
    if (res.status === 409) {
      const err = new Error('HAS_ATTENDANCES');
      err.code = 'GF-SERV-REG-001';
      throw err;
    }
    if (!res.ok) throw new Error('API_ERROR');
    logAudit({ entity: 'services', record_id: id, action: 'DELETE', before, after: null });
    return;
  }

  // IndexedDB: verify attendance dependencies before deleting
  await initDb();
  const allAttendances = await new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const index = store.index('service_id');
    const req = index.getAll(Number(id));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  if (allAttendances.length > 0) {
    const err = new Error('HAS_ATTENDANCES');
    err.code = 'GF-SERV-REG-001';
    throw err;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('services', 'readwrite');
    const store = tx.objectStore('services');
    const req = store.delete(Number(id));
    req.onsuccess = () => {
      logAudit({ entity: 'services', record_id: id, action: 'DELETE', before, after: null });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}


// ---------------------------------------------------------------------------
// VISITORS
// ---------------------------------------------------------------------------

export async function getVisitorByQrAndEvent(qrCode, eventId) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=visitors&event_id=${Number(eventId)}&qr_code=${Number(qrCode)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readonly');
    const store = tx.objectStore('visitors');
    const index = store.index('event_qr');
    const req = index.get([Number(eventId), Number(qrCode)]);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function createVisitor({ event_id, qr_code, name, gender, age, is_child, phone, has_phone, guardian_qr_code }) {
  const isLan = await isLanApiAvailable();
  const record = {
    event_id: Number(event_id),
    qr_code: Number(qr_code),
    name,
    gender: gender || null,
    age: age !== undefined && age !== null && age !== '' ? Number(age) : null,
    is_child: Boolean(is_child),
    phone: is_child ? null : (has_phone ? phone : null),
    has_phone: is_child ? false : Boolean(has_phone),
    guardian_qr_code: is_child ? Number(guardian_qr_code) : null,
    created_at: toLiteralUtcIso(new Date().toISOString())
  };

  if (isLan) {
    const res = await fetch('api.php?entity=visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.status === 409) {
      const err = new Error('QR_ALREADY_EXISTS');
      err.code = 'GF-VISIT-REG-001';
      throw err;
    }
    if (!res.ok) throw new Error('API_ERROR');
    const created = await res.json();
    logAudit({ entity: 'visitors', record_id: created.id, action: 'CREATE', after: created });
    return created;
  }

  await initDb();
  const existing = await getVisitorByQrAndEvent(qr_code, event_id);
  if (existing) {
    const err = new Error('QR_ALREADY_EXISTS');
    err.code = 'GF-VISIT-REG-001';
    throw err;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readwrite');
    const store = tx.objectStore('visitors');
    const req = store.add(record);

    req.onsuccess = () => {
      const created = { id: req.result, ...record };
      logAudit({ entity: 'visitors', record_id: created.id, action: 'CREATE', after: created });
      resolve(created);
    };

    req.onerror = () => {
      if (req.error && req.error.name === 'ConstraintError') {
        const customErr = new Error('QR_ALREADY_EXISTS');
        customErr.code = 'GF-VISIT-REG-001';
        reject(customErr);
      } else {
        reject(req.error);
      }
    };
  });
}

export async function getVisitorsByEventId(eventId) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=visitors&event_id=${Number(eventId)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readonly');
    const store = tx.objectStore('visitors');
    const index = store.index('event_id');
    const req = index.getAll(Number(eventId));

    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => b.id - a.id);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getVisitorById(id) {
  await initDb();
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=visitors&visitor_id=${Number(id)}`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readonly');
    const store = tx.objectStore('visitors');
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Updates visitor — name, gender, age, phone and has_phone are editable.
 * QR Code and event_id are immutable (physical ticket integrity).
 */
export async function updateVisitor(id, { name, gender, age, phone, has_phone }) {
  const isLan = await isLanApiAvailable();
  const before = await getVisitorById(id);
  const record = {
    name,
    gender: gender || null,
    age: age !== undefined && age !== null && age !== '' ? Number(age) : null,
    phone: has_phone ? phone : null,
    has_phone: Boolean(has_phone)
  };

  if (isLan) {
    const res = await fetch(`api.php?entity=visitors&id=${Number(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('API_ERROR');
    const updated = await res.json();
    logAudit({ entity: 'visitors', record_id: id, action: 'UPDATE', before, after: updated });
    return updated;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readwrite');
    const store = tx.objectStore('visitors');
    const getReq = store.get(Number(id));

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) { reject(new Error('NOT_FOUND')); return; }
      const updated = { ...existing, ...record };
      const putReq = store.put(updated);
      putReq.onsuccess = () => {
        logAudit({ entity: 'visitors', record_id: id, action: 'UPDATE', before, after: updated });
        resolve(updated);
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteVisitor(id) {
  const isLan = await isLanApiAvailable();
  const before = await getVisitorById(id);

  if (isLan) {
    const res = await fetch(`api.php?entity=visitors&id=${Number(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API_ERROR');
    logAudit({ entity: 'visitors', record_id: id, action: 'DELETE', before, after: null });
    return;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readwrite');
    const store = tx.objectStore('visitors');
    const req = store.delete(Number(id));
    req.onsuccess = () => {
      logAudit({ entity: 'visitors', record_id: id, action: 'DELETE', before, after: null });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}


// ---------------------------------------------------------------------------
// DASHBOARD — AGGREGATE GETTERS (read-only, no session context required)
// ---------------------------------------------------------------------------

/**
 * Returns all visitors across all events (dashboard totals).
 * Uses the LAN API when available; falls back to IndexedDB getAll.
 * @returns {Promise<Array>}
 */
export async function getAllVisitors() {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch('api.php?entity=visitors');
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('visitors', 'readonly');
    const store = tx.objectStore('visitors');
    const req = store.getAll();

    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => b.id - a.id);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all attendances across all events (dashboard totals).
 * Uses the LAN API when available; falls back to IndexedDB getAll.
 * @returns {Promise<Array>}
 */
export async function getAllAttendances() {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch('api.php?entity=attendances');
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const req = store.getAll();

    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => b.id - a.id);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all attendances for a given event (optionally filtered by service).
 * @param {number} eventId
 * @returns {Promise<Array>}
 */
export async function getAttendancesByEventId(eventId) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=attendances&event_id=${Number(eventId)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const index = store.index('event_id');
    const req = index.getAll(Number(eventId));

    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => b.id - a.id);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// ATTENDANCES
// ---------------------------------------------------------------------------

export async function checkAttendanceExists(eventId, serviceId, qrCode) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=attendances&event_id=${Number(eventId)}&service_id=${Number(serviceId)}&qr_code=${Number(qrCode)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const index = store.index('event_service_visitor');
    const req = index.get([Number(eventId), Number(serviceId), Number(qrCode)]);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function createAttendance({ event_id, service_id, visitor_qr_code }) {
  const isLan = await isLanApiAvailable();
  const record = {
    event_id: Number(event_id),
    service_id: Number(service_id),
    visitor_qr_code: Number(visitor_qr_code),
    created_at: toLiteralUtcIso(new Date().toISOString())
  };

  if (isLan) {
    const res = await fetch('api.php?entity=attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });

    if (res.status === 409) {
      const body = await res.json();
      const err = new Error('ATTENDANCE_DUPLICATED');
      err.code = 'GF-ATTEND-REG-002';
      err.existingAttendance = body.existingAttendance || null;
      throw err;
    }

    if (!res.ok) throw new Error('API_ERROR');
    const created = await res.json();
    logAudit({ entity: 'attendances', record_id: created.id, action: 'CONFIRM_ATTENDANCE', after: created });
    return created;
  }

  await initDb();
  const existing = await checkAttendanceExists(event_id, service_id, visitor_qr_code);
  if (existing) {
    const err = new Error('ATTENDANCE_DUPLICATED');
    err.code = 'GF-ATTEND-REG-002';
    err.existingAttendance = existing;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readwrite');
    const store = tx.objectStore('attendances');
    const req = store.add(record);

    req.onsuccess = () => {
      const created = { id: req.result, ...record };
      logAudit({ entity: 'attendances', record_id: created.id, action: 'CONFIRM_ATTENDANCE', after: created });
      resolve(created);
    };

    req.onerror = () => {
      if (req.error && req.error.name === 'ConstraintError') {
        const customErr = new Error('ATTENDANCE_DUPLICATED');
        customErr.code = 'GF-ATTEND-REG-002';
        reject(customErr);
      } else {
        reject(req.error);
      }
    };
  });
}

export async function getAttendancesByServiceAndEvent(serviceId, eventId) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=attendances&event_id=${Number(eventId)}&service_id=${Number(serviceId)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      const filtered = all.filter(a => a.event_id === Number(eventId) && a.service_id === Number(serviceId));
      filtered.sort((a, b) => b.id - a.id);
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAttendanceById(id) {
  const isLan = await isLanApiAvailable();
  if (isLan) {
    try {
      const res = await fetch(`api.php?entity=attendances&id=${Number(id)}`);
      if (res.ok) return await res.json();
    } catch {}
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readonly');
    const store = tx.objectStore('attendances');
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAttendance(id) {
  const isLan = await isLanApiAvailable();
  const before = await getAttendanceById(id);

  if (isLan) {
    const res = await fetch(`api.php?entity=attendances&id=${Number(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API_ERROR');
    logAudit({ entity: 'attendances', record_id: id, action: 'DELETE', before, after: null });
    return;
  }

  await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attendances', 'readwrite');
    const store = tx.objectStore('attendances');
    const req = store.delete(Number(id));
    req.onsuccess = () => {
      logAudit({ entity: 'attendances', record_id: id, action: 'DELETE', before, after: null });
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
