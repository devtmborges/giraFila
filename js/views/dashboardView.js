/**
 * GiraFila — Dashboard View (Painel Analítico)
 * Aligned with HARNESS/Architecture/moduleDashboard.md
 *
 * Responsibility: Aggregate data from all events/services and render
 * KPI cards, demographic charts and rankings with reactive global filters.
 * Zero external dependencies — all charts are rendered with SVG + CSS.
 */

import {
  getAllEvents,
  getAllServices,
  getAllVisitors,
  getAllAttendances,
  getServicesByEventId,
  getVisitorsByEventId,
  getAttendancesByEventId,
} from '../services/storageService.js';
import { showToast, showSuccess } from '../services/errorHandler.js';
import { exportToXlsx } from '../utils/xlsxExporter.js';
import { verifyPassword } from '../utils/masterPassword.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let rawData = { events: [], services: [], visitors: [], attendances: [] };
let activeFilters = { eventId: null, serviceId: null, gender: null, publicType: null };
let isLoading = false;
let exportBackCallback = null;

// ---------------------------------------------------------------------------
// DOM refs (resolved on init)
// ---------------------------------------------------------------------------
let refs = {};

// ---------------------------------------------------------------------------
// Public init
// ---------------------------------------------------------------------------
export function initDashboardView() {
  const section = document.getElementById('tabDashboard');
  if (!section) return;

  refs = {
    filterEvent:    document.getElementById('dashFilterEvent'),
    filterService:  document.getElementById('dashFilterService'),
    filterGender:   document.getElementById('dashFilterGender'),
    filterPublic:   document.getElementById('dashFilterPublic'),
    btnClear:       document.getElementById('dashBtnClearFilters'),
    btnRefresh:     document.getElementById('dashBtnRefresh'),
    filterBadge:         document.getElementById('dashFilterBadge'),
    lastUpdated:         document.getElementById('dashLastUpdated'),
    loadingOverlay:      document.getElementById('dashLoadingOverlay'),
    btnToggleFilters:    document.getElementById('dashBtnToggleFilters'),
    filtersContainer:    document.getElementById('dashFiltersContainer'),
    filterToggleText:    document.getElementById('dashFilterToggleText'),
    filterToggleChevron: document.getElementById('dashFilterChevron'),
    btnExport:               document.getElementById('dashBtnExport'),
    exportAuthModal:         document.getElementById('exportAuthModal'),
    exportAuthPwdInput:      document.getElementById('exportAuthPwdInput'),
    exportAuthBtnCancel:     document.getElementById('exportAuthBtnCancel'),
    exportAuthBtnConfirm:    document.getElementById('exportAuthBtnConfirm'),
    exportModal:             document.getElementById('exportModal'),
    exportModalBtnCancel:    document.getElementById('exportModalBtnCancel'),
    exportModalBtnConfirm:   document.getElementById('exportModalBtnConfirm'),
    exportToggleVisitors:    document.getElementById('exportToggleVisitors'),
    exportToggleAttendances: document.getElementById('exportToggleAttendances'),
    exportCountVisitors:     document.getElementById('exportCountVisitors'),
    exportCountAttendances:  document.getElementById('exportCountAttendances'),
    exportFilterBadge:       document.getElementById('exportFilterBadge'),
  };

  _bindFilterListeners();
  _bindExportListeners();

  // Expose global refresh hook for tab switch and session change
  window.refreshDashboardView = () => loadAndRender();
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------
async function loadAndRender() {
  if (isLoading) return;
  isLoading = true;
  _setLoading(true);

  try {
    const filterEventId = activeFilters.eventId;

    // Fetch raw data respecting current filter scope for performance
    const [events, services, visitors, attendances] = await Promise.all([
      getAllEvents(),
      getAllServices(),
      filterEventId ? getVisitorsByEventId(filterEventId)   : getAllVisitors(),
      filterEventId ? getAttendancesByEventId(filterEventId) : getAllAttendances(),
    ]);

    rawData = { events, services, visitors, attendances };

    _renderAll();

    // Update last-updated timestamp (local time)
    if (refs.lastUpdated) {
      refs.lastUpdated.textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit',
      });
    }
  } catch (err) {
    console.error('[GiraFila Dashboard] Erro ao carregar dados:', err);
    showToast('GF-DASH-SYS-001', 'error');
  } finally {
    isLoading = false;
    _setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Filter Logic
// ---------------------------------------------------------------------------
function _bindFilterListeners() {
  if (refs.filterEvent) {
    refs.filterEvent.addEventListener('change', async () => {
      const val = refs.filterEvent.value;
      activeFilters.eventId = val ? Number(val) : null;
      // Cascade: reset service filter (orphan prevention)
      activeFilters.serviceId = null;
      if (refs.filterService) refs.filterService.value = '';
      await loadAndRender();
      _updateFilterBadge();
    });
  }

  if (refs.filterService) {
    refs.filterService.addEventListener('change', () => {
      const val = refs.filterService.value;
      activeFilters.serviceId = val ? Number(val) : null;
      _renderAll();
      _updateFilterBadge();
    });
  }

  if (refs.filterGender) {
    refs.filterGender.addEventListener('change', () => {
      activeFilters.gender = refs.filterGender.value || null;
      _renderAll();
      _updateFilterBadge();
    });
  }

  if (refs.filterPublic) {
    refs.filterPublic.addEventListener('change', () => {
      activeFilters.publicType = refs.filterPublic.value || null;
      _renderAll();
      _updateFilterBadge();
    });
  }

  if (refs.btnClear) {
    refs.btnClear.addEventListener('click', () => {
      activeFilters = { eventId: null, serviceId: null, gender: null, publicType: null };
      if (refs.filterEvent)   refs.filterEvent.value   = '';
      if (refs.filterService) refs.filterService.value = '';
      if (refs.filterGender)  refs.filterGender.value  = '';
      if (refs.filterPublic)  refs.filterPublic.value  = '';
      loadAndRender();
      _updateFilterBadge();
    });
  }

  if (refs.btnRefresh) {
    refs.btnRefresh.addEventListener('click', () => loadAndRender());
  }

  const _toggleFilters = () => {
    if (!refs.filtersContainer) return;
    const isCollapsed = refs.filtersContainer.classList.toggle('is-collapsed');
    if (refs.btnToggleFilters) {
      refs.btnToggleFilters.setAttribute('aria-expanded', String(!isCollapsed));
    }
    if (refs.filterToggleText) {
      refs.filterToggleText.textContent = isCollapsed ? 'Exibir Filtros' : 'Ocultar Filtros';
    }
    if (refs.filterToggleChevron) {
      refs.filterToggleChevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  };

  if (refs.btnToggleFilters) {
    refs.btnToggleFilters.addEventListener('click', _toggleFilters);
  }

  if (refs.filterBadge) {
    refs.filterBadge.addEventListener('click', () => {
      if (window.innerWidth <= 640) {
        _toggleFilters();
      }
    });
  }
}

function _populateEventFilter(events) {
  if (!refs.filterEvent) return;
  const currentVal = refs.filterEvent.value;
  refs.filterEvent.innerHTML = '<option value="">Todos os Eventos</option>';
  events.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.name;
    if (String(e.id) === currentVal) opt.selected = true;
    refs.filterEvent.appendChild(opt);
  });
}

function _populateServiceFilter(services) {
  if (!refs.filterService) return;
  const currentVal = refs.filterService.value;
  const filtered = activeFilters.eventId
    ? services.filter(s => s.event_id === activeFilters.eventId)
    : services;
  refs.filterService.innerHTML = '<option value="">Todos os Serviços</option>';
  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (String(s.id) === currentVal) opt.selected = true;
    refs.filterService.appendChild(opt);
  });
}

function _updateFilterBadge() {
  if (!refs.filterBadge) return;
  const parts = [];
  if (activeFilters.eventId) {
    const ev = rawData.events.find(e => e.id === activeFilters.eventId);
    if (ev) parts.push(ev.name);
  }
  if (activeFilters.serviceId) {
    const svc = rawData.services.find(s => s.id === activeFilters.serviceId);
    if (svc) parts.push(svc.name);
  }
  if (activeFilters.gender)              parts.push(activeFilters.gender);
  if (activeFilters.publicType === 'children') parts.push('Crianças');
  if (activeFilters.publicType === 'adults')   parts.push('Adultos');

  if (parts.length === 0) {
    refs.filterBadge.textContent = 'Exibindo totais gerais de todos os eventos';
    refs.filterBadge.className = 'dash-filter-badge dash-filter-badge--neutral';
  } else {
    refs.filterBadge.textContent = 'Filtro ativo: ' + parts.join(' • ');
    refs.filterBadge.className = 'dash-filter-badge dash-filter-badge--active';
  }
}

// ---------------------------------------------------------------------------
// Metrics Computation
// Pure function — runs entirely in-memory. Typical dataset < 3ms.
// Lacuna 1: multi-event join via composite key (event_id + qr_code)
// Lacuna 3: strict null-safe age check (age === 0 is valid)
// Lacuna 6: division-by-zero guarded with safe fallbacks
// ---------------------------------------------------------------------------
function computeMetrics() {
  const { events, services, visitors, attendances } = rawData;
  const f = activeFilters;

  // --- Apply visitor-level demographic filters ---
  let filteredVisitors = visitors;
  if (f.gender) {
    filteredVisitors = filteredVisitors.filter(v => v.gender === f.gender);
  }
  if (f.publicType === 'children') {
    filteredVisitors = filteredVisitors.filter(v => v.is_child);
  } else if (f.publicType === 'adults') {
    filteredVisitors = filteredVisitors.filter(v => !v.is_child);
  }

  // --- Apply attendance-level filters ---
  let filteredAttendances = attendances;
  if (f.serviceId) {
    filteredAttendances = filteredAttendances.filter(a => a.service_id === f.serviceId);
  }

  // Lacuna 1: safe multi-event join via composite key
  const visitorLookup = new Map();
  filteredVisitors.forEach(v => {
    visitorLookup.set(v.event_id + '_' + v.qr_code, v);
  });

  // Attendances whose visitor matches demographic filters
  const demographicAttendances = (f.gender || f.publicType)
    ? filteredAttendances.filter(a => visitorLookup.has(a.event_id + '_' + a.visitor_qr_code))
    : filteredAttendances;

  // KPI 1: Total Visitors
  const totalVisitors = filteredVisitors.length;

  // KPI 2: Total Attendances
  const totalAttendances = demographicAttendances.length;

  // KPI 3: Coverage Rate
  const attendedKeys = new Set(
    demographicAttendances.map(a => a.event_id + '_' + a.visitor_qr_code)
  );
  const uniqueAttended = attendedKeys.size;
  // Base for coverage: visitors in scope (ignoring demographic sub-filter for context)
  const baseVisitors = visitors.length || 0;
  const coverageRate = baseVisitors > 0
    ? Math.round((uniqueAttended / baseVisitors) * 100)
    : 0;

  // KPI 4: Average attendances per attended visitor
  const avgAttendancesPerVisitor = uniqueAttended > 0
    ? (totalAttendances / uniqueAttended).toFixed(1)
    : '0.0';

  // KPI 5: Children per guardian (over family-scoped visitors)
  const familyVisitors = visitors.filter(v => !f.gender || v.gender === f.gender);
  const children  = familyVisitors.filter(v => v.is_child && v.guardian_qr_code);
  const guardianKeys = new Set(children.map(c => c.event_id + '_' + c.guardian_qr_code));
  const totalGuardians = guardianKeys.size;
  // Lacuna 6: guard division by zero
  const avgChildrenPerGuardian = totalGuardians > 0
    ? (children.length / totalGuardians).toFixed(1)
    : '0.0';

  // KPI 6: Phone accessibility (adults only, demographic filtered)
  const adults = filteredVisitors.filter(v => !v.is_child);
  const adultsWithPhone = adults.filter(v => v.has_phone).length;
  const phoneRate = adults.length > 0
    ? Math.round((adultsWithPhone / adults.length) * 100)
    : 0;

  // Demographic: gender
  const genderCounts = { Masculino: 0, Feminino: 0, 'Não Informado': 0 };
  filteredVisitors.forEach(v => {
    const g = (v.gender === 'Masculino' || v.gender === 'Feminino') ? v.gender : 'Não Informado';
    genderCounts[g]++;
  });

  // Demographic: age ranges (Lacuna 3: strict type-safe check for age === 0)
  const ageRanges = {
    '0 – 6 anos (1ª Infância)': 0,
    '7 – 12 anos (Criança)':    0,
    '13 – 17 anos (Adolescente)': 0,
    '18 – 29 anos (Jovem)':     0,
    '30 – 59 anos (Adulto)':    0,
    '60+ anos (Idoso)':         0,
    'Não Informada':            0,
  };
  filteredVisitors.forEach(v => {
    const hasAge = v.age !== null && v.age !== undefined && v.age !== '' && !isNaN(Number(v.age));
    if (!hasAge) { ageRanges['Não Informada']++; return; }
    const age = Number(v.age);
    if      (age <= 6)  ageRanges['0 – 6 anos (1ª Infância)']++;
    else if (age <= 12) ageRanges['7 – 12 anos (Criança)']++;
    else if (age <= 17) ageRanges['13 – 17 anos (Adolescente)']++;
    else if (age <= 29) ageRanges['18 – 29 anos (Jovem)']++;
    else if (age <= 59) ageRanges['30 – 59 anos (Adulto)']++;
    else                ageRanges['60+ anos (Idoso)']++;
  });

  // Service ranking
  const serviceCountMap = {};
  demographicAttendances.forEach(a => {
    serviceCountMap[a.service_id] = (serviceCountMap[a.service_id] || 0) + 1;
  });
  const servicesInScope = activeFilters.eventId
    ? services.filter(s => s.event_id === activeFilters.eventId)
    : services;
  const serviceRanking = servicesInScope
    .map(s => ({
      id: s.id,
      name: s.name,
      count: serviceCountMap[s.id] || 0,
      highlighted: activeFilters.serviceId === s.id,
    }))
    .sort((a, b) => b.count - a.count);

  // Hourly flow — Lacuna 5: use local hour to avoid UTC offset skew
  const hourMap = {};
  demographicAttendances.forEach(a => {
    if (!a.created_at) return;
    const h = new Date(a.created_at).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const allHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
  // Show only hours with data or bordering hours for context
  const dataHours = new Set(Object.keys(hourMap).map(Number));
  const hourlyData = allHours.filter(({ hour }) =>
    dataHours.has(hour) || dataHours.has(hour - 1) || dataHours.has(hour + 1)
  );
  const effectiveHourly = hourlyData.length >= 2 ? hourlyData : allHours.filter(d => d.count > 0);

  return {
    totalVisitors,
    totalAttendances,
    coverageRate,
    uniqueAttended,
    baseVisitors,
    avgAttendancesPerVisitor,
    avgChildrenPerGuardian,
    totalChildren:    filteredVisitors.filter(v => v.is_child).length,
    totalAdults:      filteredVisitors.filter(v => !v.is_child).length,
    totalGuardians,
    phoneRate,
    adultsWithPhone,
    totalAdultsForPhone: adults.length,
    genderCounts,
    ageRanges,
    serviceRanking,
    effectiveHourly,
    isServiceFiltered: !!activeFilters.serviceId,
    isPublicFiltered:  !!activeFilters.publicType,
  };
}

// ---------------------------------------------------------------------------
// Render orchestrator
// ---------------------------------------------------------------------------
function _renderAll() {
  _populateEventFilter(rawData.events);
  _populateServiceFilter(rawData.services);
  _updateFilterBadge();

  const m = computeMetrics();

  _renderKpis(m);
  _renderPublicProportionCard(m);
  _renderServiceRanking(m);
  _renderGenderChart(m);
  _renderAgeChart(m);
  _renderHourlyChart(m);
  _renderPhoneCard(m);
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------
function _renderKpis(m) {
  _setText('dashKpiVisitors', m.totalVisitors.toLocaleString('pt-BR'));
  _setText('dashKpiAttendances', m.totalAttendances.toLocaleString('pt-BR'));

  _setText('dashKpiCoverage', m.coverageRate + '%');
  _setText('dashKpiCoverageSub', m.uniqueAttended + ' de ' + m.baseVisitors + ' participantes');

  _setText('dashKpiAvgAttendances', m.avgAttendancesPerVisitor);

  _setText('dashKpiGuardian', m.avgChildrenPerGuardian);
  if (m.isPublicFiltered && m.totalGuardians === 0) {
    _setText('dashKpiGuardianSub', '(Filtro: apenas adultos)');
  } else {
    _setText('dashKpiGuardianSub', m.totalChildren + ' crianças • ' + m.totalGuardians + ' responsáveis');
  }
}

// ---------------------------------------------------------------------------
// Public Proportion Card (Children vs Adults)
// ---------------------------------------------------------------------------
function _renderPublicProportionCard(m) {
  const total = m.totalVisitors || 1;
  const childPct = Math.round((m.totalChildren / total) * 100);
  const adultPct = 100 - childPct;

  _setText('dashChildCount', m.totalChildren.toLocaleString('pt-BR'));
  _setText('dashAdultCount', m.totalAdults.toLocaleString('pt-BR'));
  _setText('dashChildPct',   childPct + '%');
  _setText('dashAdultPct',   adultPct + '%');

  const bar = document.getElementById('dashPublicBar');
  if (bar) {
    bar.innerHTML =
      '<div class="dash-pub-seg dash-pub-seg--children" style="width:' + childPct + '%" title="Crianças: ' + childPct + '%"></div>' +
      '<div class="dash-pub-seg dash-pub-seg--adults"   style="width:' + adultPct + '%" title="Adultos: ' + adultPct + '%"></div>';
  }
}

// ---------------------------------------------------------------------------
// Service Ranking
// ---------------------------------------------------------------------------
function _renderServiceRanking(m) {
  const container = document.getElementById('dashServiceRanking');
  if (!container) return;

  const visibleServices = m.serviceRanking.filter(s => s.count > 0);
  if (visibleServices.length === 0) {
    container.innerHTML = '<p class="dash-empty">Nenhum atendimento registrado no escopo selecionado.</p>';
    return;
  }

  const maxCount = visibleServices[0].count || 1;

  container.innerHTML = visibleServices.map((s, i) => {
    const pct    = m.totalAttendances > 0 ? Math.round((s.count / m.totalAttendances) * 100) : 0;
    const barPct = Math.round((s.count / maxCount) * 100);
    const rankNum = i + 1;
    const rankClass = rankNum <= 3 ? ` rank-${rankNum}` : '';
    const badge  = `<span class="dash-rank-badge${rankClass}">${rankNum}º</span>`;
    const hl     = s.highlighted ? ' dash-rank-row--hl' : '';
    return '<div class="dash-rank-row' + hl + '">' +
      '<div class="dash-rank-medal">' + badge + '</div>' +
      '<div class="dash-rank-info">' +
        '<span class="dash-rank-name">' + _esc(s.name) + '</span>' +
        '<div class="dash-rank-track"><div class="dash-rank-fill" style="width:' + barPct + '%"></div></div>' +
      '</div>' +
      '<div class="dash-rank-stats">' +
        '<span class="dash-rank-count">' + s.count + '</span>' +
        '<span class="dash-rank-pct">' + pct + '%</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ---------------------------------------------------------------------------
// Gender Chart (horizontal bars)
// ---------------------------------------------------------------------------
function _renderGenderChart(m) {
  const container = document.getElementById('dashGenderChart');
  if (!container) return;

  const total = m.totalVisitors || 1;
  const rows = [
    { label: 'Feminino',      count: m.genderCounts['Feminino'],      color: '#ec4899' },
    { label: 'Masculino',     count: m.genderCounts['Masculino'],     color: '#3b82f6' },
    { label: 'Não Informado', count: m.genderCounts['Não Informado'], color: '#94a3b8' },
  ];

  container.innerHTML = rows.map(r => {
    const pct = Math.round((r.count / total) * 100);
    return '<div class="dash-demo-row">' +
      '<span class="dash-demo-label">' + r.label + '</span>' +
      '<div class="dash-demo-track"><div class="dash-demo-fill" style="width:' + pct + '%;background:' + r.color + '"></div></div>' +
      '<span class="dash-demo-count">' + r.count + '</span>' +
      '<span class="dash-demo-pct">' + pct + '%</span>' +
    '</div>';
  }).join('');
}

// ---------------------------------------------------------------------------
// Age Range Chart
// ---------------------------------------------------------------------------
function _renderAgeChart(m) {
  const container = document.getElementById('dashAgeChart');
  if (!container) return;

  const total  = m.totalVisitors || 1;
  const colors = ['#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#1062d8', '#0f9d58', '#94a3b8'];
  const entries = Object.entries(m.ageRanges);
  const maxVal  = Math.max(...entries.map(([, v]) => v), 1);

  container.innerHTML = entries.map(([label, count], i) => {
    const pct    = Math.round((count / total) * 100);
    const barPct = Math.round((count / maxVal) * 100);
    return '<div class="dash-demo-row">' +
      '<span class="dash-demo-label dash-demo-label--sm">' + label + '</span>' +
      '<div class="dash-demo-track"><div class="dash-demo-fill" style="width:' + barPct + '%;background:' + colors[i % colors.length] + '"></div></div>' +
      '<span class="dash-demo-count">' + count + '</span>' +
      '<span class="dash-demo-pct">' + pct + '%</span>' +
    '</div>';
  }).join('');
}

// ---------------------------------------------------------------------------
// Hourly Flow Chart (SVG — Lacuna 5: local hour parse)
// ---------------------------------------------------------------------------
function _renderHourlyChart(m) {
  const container = document.getElementById('dashHourlyChart');
  if (!container) return;

  const data = m.effectiveHourly.filter(d => d.count > 0);
  if (data.length === 0) {
    container.innerHTML = '<p class="dash-empty">Nenhum atendimento com horário registrado no escopo atual.</p>';
    return;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const svgW = 100; const svgH = 60;
  const padL = 5; const padR = 2; const padT = 4; const padB = 14;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const step  = plotW / data.length;
  const barW  = Math.max(step * 0.65, 0.8);

  const bars = data.map((d, i) => {
    const x  = padL + step * i + (step - barW) / 2;
    const h  = (d.count / maxCount) * plotH;
    const y  = padT + plotH - h;
    const peak = d.count === maxCount;
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (peak ? '#f2994a' : '#1062d8') + '" rx="0.5" opacity="' + (peak ? 1 : 0.75) + '">' +
      '<title>' + d.hour + 'h: ' + d.count + ' atendimentos</title></rect>' +
      '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (svgH - 2).toFixed(1) + '" font-size="3.2" text-anchor="middle" fill="#64748b">' + d.hour + 'h</text>';
  }).join('');

  const axisY = padT + plotH;
  container.innerHTML =
    '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;overflow:visible" role="img" aria-label="Fluxo de atendimentos por hora">' +
      '<text x="' + (padL - 1) + '" y="' + (padT + 3) + '" font-size="2.8" text-anchor="end" fill="#94a3b8">' + maxCount + '</text>' +
      '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + axisY + '" stroke="#e2e8f0" stroke-width="0.3"/>' +
      '<line x1="' + padL + '" y1="' + axisY + '" x2="' + (svgW - padR) + '" y2="' + axisY + '" stroke="#e2e8f0" stroke-width="0.3"/>' +
      bars +
    '</svg>';
}

// ---------------------------------------------------------------------------
// Phone Accessibility Card
// ---------------------------------------------------------------------------
function _renderPhoneCard(m) {
  _setText('dashPhoneWithCount',    m.adultsWithPhone.toLocaleString('pt-BR'));
  _setText('dashPhoneWithoutCount', (m.totalAdultsForPhone - m.adultsWithPhone).toLocaleString('pt-BR'));
  _setText('dashPhoneRate', m.phoneRate + '%');

  const bar = document.getElementById('dashPhoneBar');
  if (bar) {
    const withPct    = m.phoneRate;
    const withoutPct = 100 - withPct;
    bar.innerHTML =
      '<div class="dash-pub-seg dash-pub-seg--with-phone" style="width:' + withPct + '%" title="Com telefone: ' + withPct + '%"></div>' +
      '<div class="dash-pub-seg dash-pub-seg--no-phone"   style="width:' + withoutPct + '%" title="Sem telefone: ' + withoutPct + '%"></div>';
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _setLoading(on) {
  if (refs.loadingOverlay) refs.loadingOverlay.style.display = on ? 'flex' : 'none';
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Export & Authentication Sub-Module
// ---------------------------------------------------------------------------
function _bindExportListeners() {
  if (refs.btnExport) {
    refs.btnExport.addEventListener('click', () => _openExportAuth());
  }

  if (refs.exportAuthBtnCancel) {
    refs.exportAuthBtnCancel.addEventListener('click', () => _closeExportAuth());
  }

  if (refs.exportAuthBtnConfirm) {
    refs.exportAuthBtnConfirm.addEventListener('click', () => _handleAuthConfirm());
  }

  if (refs.exportAuthPwdInput) {
    refs.exportAuthPwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _handleAuthConfirm();
      }
    });
  }

  if (refs.exportAuthModal) {
    refs.exportAuthModal.addEventListener('click', (e) => {
      if (e.target === refs.exportAuthModal) _closeExportAuth();
    });
  }

  if (refs.exportModalBtnCancel) {
    refs.exportModalBtnCancel.addEventListener('click', () => {
      _closeExportModal();
      if (exportBackCallback) {
        const cb = exportBackCallback;
        exportBackCallback = null;
        cb();
      }
    });
  }

  if (refs.exportModalBtnConfirm) {
    refs.exportModalBtnConfirm.addEventListener('click', () => _handleExportConfirm());
  }

  if (refs.exportModal) {
    refs.exportModal.addEventListener('click', (e) => {
      if (e.target === refs.exportModal) _closeExportModal();
    });
  }
}

function _openExportAuth() {
  if (!refs.exportAuthModal) return;
  if (refs.exportAuthPwdInput) {
    refs.exportAuthPwdInput.value = '';
  }
  refs.exportAuthModal.classList.add('active');
  if (refs.exportAuthPwdInput) {
    refs.exportAuthPwdInput.focus();
  }
}

function _closeExportAuth() {
  if (!refs.exportAuthModal) return;
  refs.exportAuthModal.classList.remove('active');
  if (refs.exportAuthPwdInput) {
    refs.exportAuthPwdInput.value = '';
  }
}

async function _handleAuthConfirm() {
  const pwdInput = refs.exportAuthPwdInput;
  const password = pwdInput ? pwdInput.value : '';

  try {
    const isValid = await verifyPassword(password);
    if (!isValid) {
      showToast('GF-LOCK-VAL-001', 'error');
      if (pwdInput) {
        pwdInput.focus();
        pwdInput.select();
      }
      return;
    }
    _closeExportAuth();
    _openExportModal();
  } catch (err) {
    console.error('[GiraFila Export Auth] Erro ao validar senha:', err);
    showToast(err.code || 'GF-LOCK-SYS-001', 'error');
  }
}

function _getFilteredData() {
  const { visitors, attendances } = rawData;
  const f = activeFilters;

  // Visitantes filtrados demograficamente
  let filteredVisitors = visitors;
  if (f.gender) {
    filteredVisitors = filteredVisitors.filter(v => v.gender === f.gender);
  }
  if (f.publicType === 'children') {
    filteredVisitors = filteredVisitors.filter(v => v.is_child);
  } else if (f.publicType === 'adults') {
    filteredVisitors = filteredVisitors.filter(v => !v.is_child);
  }

  // Atendimentos filtrados por serviço
  let filteredAttendances = attendances;
  if (f.serviceId) {
    filteredAttendances = filteredAttendances.filter(a => a.service_id === f.serviceId);
  }

  // Join demográfico em atendimentos
  if (f.gender || f.publicType) {
    const visitorLookup = new Set(
      filteredVisitors.map(v => v.event_id + '_' + v.qr_code)
    );
    filteredAttendances = filteredAttendances.filter(a =>
      visitorLookup.has(a.event_id + '_' + a.visitor_qr_code)
    );
  }

  return {
    visitors: filteredVisitors,
    attendances: filteredAttendances,
  };
}

export async function openExportModal(onBack = null) {
  exportBackCallback = onBack;
  if (rawData.events.length === 0 && rawData.visitors.length === 0) {
    await loadAndRender();
  }
  _openExportModal();
}

function _openExportModal() {
  if (!refs.exportModal) return;

  const filtered = _getFilteredData();
  const vCount = (filtered.visitors || []).length;
  const aCount = (filtered.attendances || []).length;

  if (refs.exportCountVisitors) {
    refs.exportCountVisitors.textContent = `${vCount} ${vCount === 1 ? 'registro' : 'registros'}`;
  }
  if (refs.exportCountAttendances) {
    refs.exportCountAttendances.textContent = `${aCount} ${aCount === 1 ? 'registro' : 'registros'}`;
  }

  if (refs.exportFilterBadge) {
    const badgeText = refs.filterBadge ? refs.filterBadge.textContent.trim() : '';
    refs.exportFilterBadge.textContent = badgeText || 'Exibindo totais gerais de todos os eventos';
  }

  if (refs.exportToggleVisitors) refs.exportToggleVisitors.checked = true;
  if (refs.exportToggleAttendances) refs.exportToggleAttendances.checked = true;

  refs.exportModal.classList.add('active');
}

function _closeExportModal() {
  if (!refs.exportModal) return;
  refs.exportModal.classList.remove('active');
}

function _handleExportConfirm() {
  const includeVisitors = refs.exportToggleVisitors ? refs.exportToggleVisitors.checked : false;
  const includeAttendances = refs.exportToggleAttendances ? refs.exportToggleAttendances.checked : false;

  try {
    const filteredData = _getFilteredData();
    exportToXlsx(filteredData, rawData, { includeVisitors, includeAttendances });
    _closeExportModal();
    showSuccess('Planilha exportada com sucesso!');
  } catch (err) {
    console.error('[GiraFila Export] Erro durante exportação:', err);
    if (err && err.code) {
      showToast(err.code, 'error');
    } else {
      showToast('GF-EXPORT-SYS-002', 'error');
    }
  }
}

