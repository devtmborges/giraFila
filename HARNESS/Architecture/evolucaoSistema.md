# System Evolution — Version History

> **[FILL IN]:** This file documents the version history of `[PROJECT_NAME]`. Agents read this to understand what has changed across versions, avoid re-introducing resolved bugs, and maintain continuity across sessions.

---

## Version Log

Use the following format per version entry:

```
## v[X.Y.Z] — [YYYY-MM-DD] — [Release Name / Tag]

### Added
- [New feature or capability]

### Changed
- [Modified behavior or refactor]

### Fixed
- [Bug fixed]

### Removed
- [Deprecated feature removed]

### Notes
- [Any important migration notes, breaking changes, or context]
```

---

## v0.4.0 — 2026-10-01 — Painel Analítico & Dashboard Demográfico

### Added
- Tela 5: Painel Analítico (`dashboardView.js` e `#tabDashboard`) com indicadores consolidados e gráficos.
- Filtros globais reativos por Evento, Serviço, Gênero e Público (Crianças/Adultos) com suporte a visão geral desfiltrada.
- KPIs estratégicos: Total de Visitantes, Atendimentos Realizados, Taxa de Cobertura, Média de Atendimentos por Participante, Média de Crianças por Responsável e Acessibilidade Digital.
- Visualizações nativas: Proporção Crianças/Adultos, Ranking de Serviços com pódio e barras relativas, gráficos demográficos por gênero e faixas etárias, e fluxo de atendimento por hora em SVG.
- Suporte a queries flexíveis na API central LAN (`api.php`) e novos métodos agregadores em `storageService.js` (`getAllVisitors`, `getAllAttendances`, `getAttendancesByEventId`).
- Código de erro `GF-DASH-SYS-001` no catálogo centralizado de erros (`errors.js`).
- Documentação técnica completa do módulo em `HARNESS/Architecture/moduleDashboard.md`.

---

## v0.3.0 — 2026-10-01 — Cabeçalho Compacto & UX Otimizada

### Added
- Barra de contexto ativa (`session-bar`) como cabeçalho principal compacto fixo.
- Acesso direto ao seletor de evento e serviço através de botões integrados.
- Integração do botão de rede Wi-Fi na barra superior.

---

## v0.2.2 — 2026-10-01 — Dados Demográficos & Auditoria

### Added
- Campos de Gênero e Idade no cadastro/edição de visitantes.
- Telemetria de auditoria em mutações de dados (`auditService.js`).
- Possibilidade de exclusão de atendimentos operacionais com confirmação.