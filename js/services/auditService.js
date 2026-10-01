/**
 * GiraFila — Audit & Telemetry Logging Service
 * Aligned with HARNESS/Security/SecurityGovernance.md Section 6
 */

import { toLiteralUtcIso } from '../utils/sanitizer.js';

let dbInstance = null;

export function setAuditDbInstance(db) {
  dbInstance = db;
}

function generateTraceHash() {
  return 'tr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Logs a mutative action or critical event
 */
export async function logAudit({
  user_id = 'voluntario-local',
  entity,
  record_id,
  action,
  before = null,
  after = null,
  data = null
}) {
  const entry = {
    user_id,
    entity,
    record_id: String(record_id),
    action,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
    data: data ? JSON.parse(JSON.stringify(data)) : null,
    trace_hash: generateTraceHash(),
    timestamp: toLiteralUtcIso(new Date().toISOString())
  };

  try {
    // Attempt sending to LAN Central API if accessible
    fetch('api.php?entity=audit_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {});

    // Also persist in local IndexedDB if initialized
    if (dbInstance) {
      const tx = dbInstance.transaction('audit_logs', 'readwrite');
      const store = tx.objectStore('audit_logs');
      store.add(entry);
    }
  } catch {
    console.info('[GiraFila Audit]', entry);
  }
}
