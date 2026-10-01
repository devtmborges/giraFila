<!-- BEGIN:agent-router -->
# [PROJECT_NAME] — Master Agent Directives & Router

You are operating inside the **[PROJECT_NAME]** codebase ([STACK_SUMMARY]).
Your primary role is to execute precise, low-friction, high-quality development following strict system rules.

---

## 🧭 HARNESS DIRECTORY & CONTEXT ROUTING

Before starting any task, read the specific guide in the `HARNESS/` directory relevant to your scope:

1. **System Architecture & Data Modeling:**
   👉 Read `HARNESS/Architecture/ProjectStructure.md` at the beginning of each session (acts as the navigation index for all guides below):
   - Core: `visaoGeral.md` (business rules & context), `arquiteturaUnificada.md` (directory structure & routing), `modeloDeDados.md` (data model / schema), `controladores.md` (controllers / services / handlers)
   - Frontend: `frontEndArchitecture.md` (views & pages), `layoutENavigation.md` (shell, menus, navigation), `formulariosModais.md` (forms, modals & validation), `componentesDeDados.md` (data components), `coresETemas.md` (color system & themes), `responsividade.md` (responsive breakpoints)
   - Feature Modules: Add one file per primary feature module of your project (e.g., `moduleDashboard.md`, `moduleCheckout.md`, `moduleInbox.md`). Register each new file in `HARNESS/Architecture/ProjectStructure.md`.
   - Workflows & Security: `fluxosPrincipais.md` (main workflows), `segurancaEAuditoria.md` (security, permissions & audit)
   - Environment & History: `ambienteLocal.md` (local setup & CLI), `funcionalidadesRecentes.md` (current version features), `evolucaoSistema.md` (version history)
2. **Agent Workflow & Planning Protocol:**
   👉 Read `HARNESS/Architecture/agentWorkflow.md` (MANDATORY: pre-check required before drafting any implementation plan).
3. **Data Compression & Performance Optimization:**
   👉 Read `HARNESS/Optimization/TurboQuantOptimization.md`.
4. **Security, Governance & Access Control:**
   👉 Read `HARNESS/Security/SecurityGovernance.md` (MANDATORY: pre-check required before drafting any implementation plan).
5. **Data Access Patterns & Integrity:**
   👉 Read `HARNESS/Architecture/DatabaseAndRls.md` (when creating/modifying data queries or persistence logic).
6. **Time & Date Handling:**
   👉 Read `HARNESS/Architecture/TimeAndDates.md` (when manipulating dates, times, or timezone-sensitive logic).
7. **UI/UX & Design System Constraints:**
   👉 Read `HARNESS/UI/UiDesignSystem.md` (when building forms, modals, or views).
   👉 For quick-input / NLP / command palette systems, read `HARNESS/UI/flashInputDocumentation.md`.
8. **Error Governance & User Communication:**
   👉 Read `HARNESS/Architecture/ErrorGovernance.md` (MANDATORY: pre-check required before drafting any implementation plan).

---

## ⚡ CORE OPERATIONAL RULES

### 1. Planning & Execution Workflow
- **Plan First:** You MUST create a well-structured implementation plan BEFORE executing any code changes.
- **Mandatory Pre-Planning Checks:** Before drafting any implementation plan (`FEAT`, `FIX`, or `HOTFIX`), you MUST read and cross-check the proposed approach against:
  1. `HARNESS/Architecture/ErrorGovernance.md`: Map exception points, specify standardized error codes (`[PROJECT]-[MODULE]-[TYPE]-[NUMBER]`), plan inclusions in the Error Catalog, and apply the Boy Scout Rule for refactoring legacy strings in modified files.
  2. `HARNESS/Security/SecurityGovernance.md`: Validate Zero Trust policy, rate limiting, sanitization, and mandatory telemetry logging.
  Plans that do not include this dual validation are considered incomplete and must not be executed.
- **No Over-Engineering:** Follow **KISS**, **YAGNI**, **DRY**, and **SRP** principles. Do not reinvent the wheel.
- **If it ain't broke, don't fix it:** Do NOT refactor or change working code unless strictly requested.
- **Package Manager:** ALWAYS use `[PACKAGE_MANAGER]` (refer to `[LOCKFILE]`). Never switch package managers mid-project.
- **Language Policy:**
  - **AGENTS.md & Router Directives:** All content inside `AGENTS.md` MUST be written in US English (en-US).
  - **System & Product Deliverables:** All user interfaces, code comments, documentation, and system messages MUST be developed in `[PRODUCT_LANGUAGE]`.

### 2. Code Quality Principles
- **No Over-Engineering:** Avoid premature abstractions and speculative generalization (YAGNI).
- **Naming Conventions:** Read `HARNESS/Architecture/namingAndCodeStyle.md` for the canonical conventions of this project.

### 3. Data & Persistence
- **Schema Changes:** Create versioned migrations whenever the data schema is modified. Never apply manual changes directly to production.
- **Telemetry Check:** Every plan must evaluate if telemetry constants or audit displays require updates.

---

## 🔐 TEST CREDENTIALS

- **Local Environment (`[LOCAL_URL]`):**
  - **User:** `[LOCAL_USER]` | **Password:** `[LOCAL_PASSWORD]`
- **Production Environment (`[PROD_URL]`):**
  - **User:** `[PROD_USER]` | **Password:** `[PROD_PASSWORD]`

---

## 🔄 NAMING CONVENTIONS & CODE STYLE

See `HARNESS/Architecture/namingAndCodeStyle.md` for full details.

- Use `camelCase` by default for file creation, file naming, and identifiers (variables, functions, and utility modules).
- Restrict `PascalCase` strictly to classes, types/interfaces, components, and designated architecture documentation.

---

## 🔄 SESSION END PROTOCOL & COMMIT SUGGESTIONS

1. **Session Lifecycle:**
   - Wait until the user explicitly states the session is over or requests the commit message.
   - Do NOT output commit suggestions prematurely during active coding steps.
2. **End-of-Session Tasks:**
   - Verify if `HARNESS/Architecture/ProjectStructure.md` and `HARNESS/Optimization/TurboQuantOptimization.md` need updates based on the session's work.
   - Verify if `HARNESS/Architecture/ErrorGovernance.md` or the Error Catalog needs updates if new errors/exceptions were introduced in the session.
   - **Verify Default Access Provisioning:** Verify if any new screen, action, or permission introduced or modified during the session requires updating the default access group seed for new instance creation.
   - **Database Migration Scripts:** Whenever a schema migration is created during the session, supply the raw SQL (or equivalent) script required to apply it locally, alongside the commit comment.
   - Generate a Git Commit Comment in **[COMMIT_LANGUAGE]**.
   - **Commit Rules:** Do NOT use double quotes (`"`) or grave/acute accents for mentions; use ONLY single quotes (`'`).
<!-- END:agent-router -->