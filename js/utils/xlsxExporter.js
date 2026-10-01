/**
 * GiraFila — XLSX Exporter Utility
 * Generates and triggers download of a multi-sheet XLSX file.
 * Depends on SheetJS (window.XLSX) loaded via CDN in index.html.
 * Exports FILTERED data (visitors/attendances already filtered by Dashboard).
 * Aligned with HARNESS/Architecture/ErrorGovernance.md
 */

/**
 * Formats ISO-8601 UTC timestamp to local dd/mm/aaaa hh:mm
 * @param {string} isoString
 * @returns {string}
 */
function formatDateLocal(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('pt-BR');
  const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
}

/**
 * Builds the "Visitantes" sheet rows from filtered visitors.
 * @param {object[]} filteredVisitors
 * @param {object[]} events
 * @returns {object[]}
 */
function buildVisitorRows(filteredVisitors, events) {
  const eventMap = Object.fromEntries(events.map(e => [e.id, e.name]));
  return filteredVisitors.map(v => ({
    'ID':              v.id,
    'Evento':          eventMap[v.event_id] || v.event_id,
    'Nº Ticket (QR)':  v.qr_code,
    'Nome':            v.name,
    'Gênero':          v.gender || '—',
    'Idade':           v.age ?? '—',
    'Público':         v.is_child ? 'Criança' : 'Adulto',
    'Telefone':        v.has_phone ? (v.phone || '—') : '—',
    'QR Responsável':  v.guardian_qr_code || '—',
    'Cadastrado em':   formatDateLocal(v.created_at),
  }));
}

/**
 * Builds the "Atendimentos" sheet rows from filtered attendances.
 * Join uses composite key event_id + '_' + qr_code (aligned with dashboard logic).
 * @param {object[]} filteredAttendances
 * @param {object[]} allVisitors  — full rawData.visitors for join
 * @param {object[]} events
 * @param {object[]} services
 * @returns {object[]}
 */
function buildAttendanceRows(filteredAttendances, allVisitors, events, services) {
  const eventMap   = Object.fromEntries(events.map(e => [e.id, e.name]));
  const serviceMap = Object.fromEntries(services.map(s => [s.id, s.name]));
  const visitorMap = Object.fromEntries(
    allVisitors.map(v => [v.event_id + '_' + v.qr_code, v])
  );

  return filteredAttendances.map(a => {
    const visitor = visitorMap[a.event_id + '_' + a.visitor_qr_code] || {};
    return {
      'ID':                a.id,
      'Evento':            eventMap[a.event_id] || a.event_id,
      'Serviço':           serviceMap[a.service_id] || a.service_id,
      'Nº Ticket (QR)':    a.visitor_qr_code,
      'Nome do Visitante': visitor.name || '—',
      'Gênero':            visitor.gender || '—',
      'Público':           visitor.is_child ? 'Criança' : 'Adulto',
      'Atendido em':       formatDateLocal(a.created_at),
    };
  });
}

/**
 * Generates and triggers download of the XLSX file.
 *
 * @param {object} filteredData - { visitors: [], attendances: [] } — already filtered by Dashboard
 * @param {object} rawData      - { events: [], services: [], visitors: [] } — for join resolution
 * @param {object} options      - { includeVisitors: boolean, includeAttendances: boolean }
 * @throws {Error} GF-EXPORT-VAL-001 — no tab selected
 * @throws {Error} GF-EXPORT-REG-001 — no data after filters
 * @throws {Error} GF-EXPORT-SYS-001 — SheetJS not loaded
 * @throws {Error} GF-EXPORT-SYS-002 — XLSX.writeFile failure
 */
export function exportToXlsx(filteredData, rawData, options) {
  const { includeVisitors, includeAttendances } = options;

  if (!includeVisitors && !includeAttendances) {
    const err = new Error('GF-EXPORT-VAL-001');
    err.code = 'GF-EXPORT-VAL-001';
    throw err;
  }

  if (typeof window.XLSX === 'undefined') {
    const err = new Error('GF-EXPORT-SYS-001');
    err.code = 'GF-EXPORT-SYS-001';
    throw err;
  }

  const XLSX = window.XLSX;
  const wb   = XLSX.utils.book_new();
  let hasAnyData = false;

  if (includeVisitors) {
    const rows = buildVisitorRows(filteredData.visitors || [], rawData.events || []);
    if (rows.length > 0) hasAnyData = true;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Visitantes');
  }

  if (includeAttendances) {
    const rows = buildAttendanceRows(
      filteredData.attendances || [],
      rawData.visitors || [],
      rawData.events || [],
      rawData.services || []
    );
    if (rows.length > 0) hasAnyData = true;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Atendimentos');
  }

  if (!hasAnyData) {
    const err = new Error('GF-EXPORT-REG-001');
    err.code = 'GF-EXPORT-REG-001';
    throw err;
  }

  // Filename: GiraFila_dd-mm-aaaa_hhmm.xlsx
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const filename = `GiraFila_${day}-${month}-${year}_${hours}${minutes}.xlsx`;

  try {
    XLSX.writeFile(wb, filename);
    console.info('[GiraFila Export] Arquivo gerado:', filename);
  } catch (err) {
    console.error('[GiraFila Export] Falha ao gerar arquivo:', err);
    const exportErr = new Error('GF-EXPORT-SYS-002');
    exportErr.code = 'GF-EXPORT-SYS-002';
    throw exportErr;
  }
}
