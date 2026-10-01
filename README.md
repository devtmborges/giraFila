# HARNESS Framework — Agent Instruction System

A structured, language-agnostic system for organizing AI agent instructions, coding standards, and architectural knowledge for any software project.

---

## What Is HARNESS?

**HARNESS** is a directory-based knowledge system that lives alongside your source code. It provides AI coding agents (Gemini, Claude, GPT, Codex, etc.) with structured, contextual instructions segmented by responsibility — so agents always read only the guides relevant to the current task, not a monolithic document.

The name stands for: **H**ierarchical **A**gent **R**outing & **N**avigation for **E**ngineering **S**upport **S**ystems.

---

## Directory Structure

```
project-root/
├── AGENTS.md              ← Master router (always read first by any agent)
├── GEMINI.md              ← Redirect → AGENTS.md
├── CLAUDE.md              ← Redirect → AGENTS.md
├── CODEX.md               ← Redirect → AGENTS.md
├── GPT.md                 ← Redirect → AGENTS.md
├── README.md              ← This file
└── HARNESS/
    ├── Architecture/
    │   ├── ProjectStructure.md        ← Navigation index (read first each session)
    │   ├── agentWorkflow.md           ← Agent planning & execution protocol
    │   ├── namingAndCodeStyle.md      ← Naming conventions & code style
    │   ├── ErrorGovernance.md         ← Error taxonomy & catalog workflow
    │   ├── DatabaseAndRls.md          ← Data access patterns & integrity rules
    │   ├── TimeAndDates.md            ← Date/time handling protocol
    │   ├── visaoGeral.md              ← [FILL IN] Project overview & business rules
    │   ├── arquiteturaUnificada.md    ← [FILL IN] Technical architecture
    │   ├── modeloDeDados.md           ← [FILL IN] Data model / schema
    │   ├── controladores.md           ← [FILL IN] Controllers / services
    │   ├── frontEndArchitecture.md    ← [FILL IN] Frontend architecture
    │   ├── layoutENavigation.md       ← [FILL IN] Layout & navigation
    │   ├── componentesDeDados.md      ← [FILL IN] Data components
    │   ├── formulariosModais.md       ← [FILL IN] Forms & modals
    │   ├── coresETemas.md             ← [FILL IN] Color system & themes
    │   ├── responsividade.md          ← [FILL IN] Responsive design
    │   ├── fluxosPrincipais.md        ← [FILL IN] Main user flows
    │   ├── segurancaEAuditoria.md     ← [FILL IN] Security & audit (project-specific)
    │   ├── ambienteLocal.md           ← [FILL IN] Local environment setup
    │   ├── funcionalidadesRecentes.md ← [FILL IN] Current version features
    │   ├── evolucaoSistema.md         ← [FILL IN] Version history
    │   └── module[Name].md            ← [CREATE] One file per feature module (e.g., moduleDashboard.md)
    ├── Optimization/
    │   └── TurboQuantOptimization.md  ← Performance optimization methodology
    ├── Security/
    │   └── SecurityGovernance.md      ← Security & governance principles
    ├── UI/
    │   ├── UiDesignSystem.md          ← UI/UX patterns & design system
    │   └── flashInputDocumentation.md ← [FILL IN] Quick-input / NLP / command palette
    ├── agentTasks/
    │   ├── 00-SAMPLE.md               ← Task template (agent briefing format)
    │   ├── 00-FEAT-TEMPLATE.md        ← Feature task template
    │   ├── 00-FIX-TEMPLATE.md         ← Bug fix task template
    │   └── 00-TODO-TEMPLATE.md        ← To-do / backlog template
    └── backups/                       ← Optional: snapshot storage
```

---

## How to Use This Template

### Step 1 — Fill in `AGENTS.md`

Open `AGENTS.md` and replace all `[PLACEHOLDER]` values:

| Placeholder | Description |
|---|---|
| `[PROJECT_NAME]` | Your project name (e.g., "MyApp", "AcmeAPI") |
| `[STACK_SUMMARY]` | One-line tech stack (e.g., "FastAPI + PostgreSQL + React") |
| `[PACKAGE_MANAGER]` | Your package manager (e.g., `npm`, `pip`, `cargo`, `go mod`) |
| `[LOCKFILE]` | Your lock file (e.g., `package-lock.json`, `Cargo.lock`) |
| `[PRODUCT_LANGUAGE]` | Language for UI/docs (e.g., `English (en-US)`, `Portuguese (pt-BR)`) |
| `[COMMIT_LANGUAGE]` | Language for Git commits (e.g., `English`, `Portuguese (pt-BR)`) |
| `[LOCAL_URL]` | Local dev server URL |
| `[LOCAL_USER]` / `[LOCAL_PASSWORD]` | Local test credentials |
| `[PROD_URL]` | Production URL |
| `[PROD_USER]` / `[PROD_PASSWORD]` | Production test credentials |

### Step 2 — Fill in the `[FILL IN]` stubs

Open each stub file inside `HARNESS/Architecture/` and document your project's specifics. Each file contains clear instructions on what to document in that section.

Create one `module[Name].md` file per primary feature module of your project and add it to the Navigation Map in `ProjectStructure.md`.

### Step 3 — Configure the Error Catalog

Follow `HARNESS/Architecture/ErrorGovernance.md` to set up your project's error code taxonomy (replacing `[PROJECT]` with your project prefix).

### Step 4 — Use agentTasks/

When briefing an AI agent on a specific task:
1. Copy `00-FEAT-TEMPLATE.md` or `00-FIX-TEMPLATE.md` to a new file.
2. Fill in the task description, context, and constraints.
3. Share the file with the agent as task context.

---

## Which Files Are Pre-Filled vs. Stubs?

| File | Status |
|---|---|
| `AGENTS.md` | ⚙️ Pre-filled — update `[PLACEHOLDERS]` only |
| `HARNESS/Architecture/ErrorGovernance.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Architecture/DatabaseAndRls.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Architecture/TimeAndDates.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Architecture/agentWorkflow.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Architecture/namingAndCodeStyle.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Security/SecurityGovernance.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Optimization/TurboQuantOptimization.md` | ✅ Pre-filled — ready to use |
| `HARNESS/UI/UiDesignSystem.md` | ✅ Pre-filled — ready to use |
| `HARNESS/Architecture/ProjectStructure.md` | ⚙️ Pre-filled — update index as you fill stubs |
| All `[FILL IN]` stub files | 📝 Empty stubs — document your project here |

---

## Design Philosophy

- **Segmented, not monolithic:** Agents read only what's relevant. No 2,000-line single files.
- **Routing-stable:** File paths are fixed. Agents always know where to find each type of knowledge.
- **Stack-agnostic:** Works with any language, framework, or database.
- **Incremental:** Start with the pre-filled files. Fill stubs as your project evolves.
