# [PROJECT_NAME] — HARNESS Documentation Index

This file is the **navigation index** for all guides inside the `HARNESS/` directory. Agents and developers MUST read this file first at the start of each session to understand the current project state and locate the relevant guide.

> **Pre-filled reference files (ready to use for any project):**
> - `HARNESS/Optimization/TurboQuantOptimization.md` — TurboQuant optimization methodology (Google DeepMind): Orthogonal Rotation, PolarQuant, QJL principles, global constants, and per-feature evaluation checklist.
> - `HARNESS/Architecture/ErrorGovernance.md` — Error taxonomy, SSOT catalog workflow, Boy Scout Rule.
> - `HARNESS/Architecture/DatabaseAndRls.md` — Data access patterns & integrity rules.
> - `HARNESS/Architecture/TimeAndDates.md` — Literal time persistence protocol.
> - `HARNESS/Security/SecurityGovernance.md` — Zero Trust, rate limiting, sanitization, audit logging.
> - `HARNESS/UI/UiDesignSystem.md` — Z-index hierarchy, modal states, form validation, mobile-first.

---

## Navigation Map (section → destination file)

| Topic | File |
|---|---|
| Project overview, business rules, domain context | `visaoGeral.md` |
| Technical architecture (directories, server, routing) | `arquiteturaUnificada.md` |
| Frontend views (`pages/` or `views/` or equivalent) | `frontEndArchitecture.md` |
| Layout & navigation (shell, sidebar, header, mobile nav) | `layoutENavigation.md` |
| Data model (schema, entities, KPIs) | `modeloDeDados.md` |
| Controllers / services / handlers | `controladores.md` |
| Data components (lists, tables, cards, search modals) | `componentesDeDados.md` |
| Forms & modals (validation, view-only, submit patterns) | `formulariosModais.md` |
| Primary feature modules (one file per module) | `moduleDashboard.md` (Painel Analítico) |
| Color system & themes | `coresETemas.md` |
| Main user flows (creation, editing, deletion) | `fluxosPrincipais.md` |
| Responsive design (breakpoints, viewport behavior) | `responsividade.md` |
| Security & audit (telemetry, guards, permissions — project-specific) | `segurancaEAuditoria.md` |
| Local environment setup (CLI, dependencies, gotchas) | `ambienteLocal.md` |
| Current version features | `funcionalidadesRecentes.md` |
| System evolution / version history | `evolucaoSistema.md` |
| Time & date handling protocol | `TimeAndDates.md` |
| Data access patterns & integrity | `DatabaseAndRls.md` |
| Error governance & catalog | `ErrorGovernance.md` |
| Agent workflow & planning protocol | `agentWorkflow.md` |
| Naming conventions & code style | `namingAndCodeStyle.md` |
| Quick-input / NLP / command palette system | `HARNESS/UI/flashInputDocumentation.md` |

---

## Directory Conventions

- **File naming**: `camelCase` for all guide files. Feature module files should use a consistent grouping prefix (e.g., `module*`): `moduleDashboard.md`, `moduleCheckout.md`. Register each new module file in the Navigation Map above.
- **Pre-existing files** keep their original names: `DatabaseAndRls.md`, `ErrorGovernance.md`, `TimeAndDates.md`, `agentWorkflow.md`, `namingAndCodeStyle.md`.
- **Stub files**: Files marked `[FILL IN]` contain only a template header. Fill them as your project documentation evolves.

---

## Repository Info

- **Repository**: GiraFila
- **Main Branch**: main
- **Current Version**: 0.7.0-family-modal
- **Last Updated**: 2026-10-05 — Cards de participantes clicáveis com modal de Grupo Familiar, correção de timezone operacional, restrições e senha mestre em exclusões (Visitantes, Eventos e Serviços), e botões de scanner ocultos.
- **Core Files**:
  - `index.html` — Shell da SPA e navegação principal
  - `css/variables.css` — Design tokens e camadas Z-Index
  - `css/base.css` — Layout mobile-first sem scroll horizontal
  - `css/components.css` — Componentes visuais, modais, toasts, formulários e estilos do dashboard
  - `js/constants/errors.js` — Catálogo centralizado de erros SSOT (GF-***-***-***)
  - `js/constants/zIndex.js` — Constantes de z-index
  - `js/services/storageService.js` — Persistência Dual-Layer (API LAN SQLite e fallback IndexedDB)
  - `js/services/auditService.js` — Telemetria e auditoria de mutações
  - `js/services/errorHandler.js` — Resolução de erros e exibição de alertas
  - `js/utils/sanitizer.js` — Sanitização XSS, máscaras e formatações
  - `js/utils/clipboard.js` — Cópia universal cross-platform (iOS, Android, Windows, Mac, Linux)
  - `js/utils/qrScanner.js` — Leitor de QR Code via câmera do dispositivo
  - `js/utils/icons.js` — Sistema centralizado de ícones vetoriais lineares (SVGs austeros)
  - `js/utils/masterPassword.js` — Gestão, hashing SHA-256 e persistência da senha mestre de exportação
  - `js/utils/xlsxExporter.js` — Geração e download client-side de planilhas Excel (.xlsx) multi-aba via SheetJS
  - `js/views/sessionModal.js` — Seleção de contexto por sessão (Evento + Serviço)
  - `js/views/familyModal.js` — Modal de Grupo Familiar: listagem de membros e histórico de atendimentos
  - `js/views/visitorView.js` — Tela 1: Cadastro de Visitantes
  - `js/views/eventView.js` — Tela 2: Gestão de Eventos
  - `js/views/serviceView.js` — Tela 3: Gestão de Serviços (busca preditiva de eventos)
  - `js/views/attendanceView.js` — Tela 4: Registro de Atendimento Operacional (Anti-fraude)
  - `js/views/dashboardView.js` — Tela 5: Painel Analítico & Gráficos Demográficos
  - `js/app.js` — Ponto de entrada e ciclo de vida da aplicação