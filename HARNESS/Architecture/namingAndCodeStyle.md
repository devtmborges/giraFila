# Naming Conventions & Code Style

This document defines the canonical naming conventions and code style rules for the `[PROJECT_NAME]` codebase. All agents and developers MUST follow these rules consistently.

> **[FILL IN]:** This document provides universal defaults. Override or extend any section with project-specific conventions in the `[PROJECT-SPECIFIC OVERRIDES]` section at the bottom.

---

## 1. CASE CONVENTIONS

| Construct | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `userId`, `totalAmount` |
| Functions / methods | `camelCase` | `getUserById()`, `calculateTotal()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Classes | `PascalCase` | `UserService`, `PaymentProcessor` |
| Interfaces / Types | `PascalCase` | `UserProfile`, `ApiResponse` |
| React/UI Components | `PascalCase` | `UserCard`, `ModalDialog` |
| Files — utilities & modules | `camelCase` | `userService.ts`, `date-utils.py` |
| Files — components (UI) | `PascalCase` | `UserCard.tsx`, `ModalDialog.vue` |
| Files — architecture docs | `camelCase` (this project) | `agentWorkflow.md`, `visaoGeral.md` |
| Database tables | `snake_case` | `user_profiles`, `payment_events` |
| Database columns | `snake_case` | `created_at`, `tenant_id` |
| API routes / URLs | `kebab-case` | `/api/user-profiles`, `/auth/reset-password` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
| Git branches | `kebab-case` | `feat/user-auth`, `fix/login-redirect` |

---

## 2. FILE NAMING

- **Utility modules / services:** `camelCase` (e.g., `userService.ts`, `errorHandler.py`).
- **UI Components:** `PascalCase` (e.g., `UserCard.tsx`, `NavigationBar.vue`).
- **Test files:** Mirror the source file name with a `.test.` / `.spec.` suffix (e.g., `userService.test.ts`).
- **Migration files:** Use a timestamp prefix + descriptive name (e.g., `20260423_add_tenant_id_to_users.sql`).
- **HARNESS documentation files:** `camelCase` (e.g., `agentWorkflow.md`, `visaoGeral.md`).

---

## 3. FUNCTION & METHOD CONVENTIONS

- Functions should do **one thing** (SRP).
- Prefer **verb + noun** naming: `getUser`, `createOrder`, `validateEmail`.
- Boolean-returning functions should start with `is`, `has`, or `can`: `isActive`, `hasPermission`, `canEdit`.
- Event handlers should start with `handle` or `on`: `handleSubmit`, `onClickOutside`.

---

## 4. COMPONENT CONVENTIONS (FRONTEND)

- Prefer **Component Composition** over inheritance.
- Keep components focused: one concern per component.
- Props should use descriptive names — avoid single-letter or cryptic abbreviations.
- Events emitted by components should use `on` prefix: `onSave`, `onClose`.

---

## 5. IMPORT ORDER (RECOMMENDED)

Organize imports in the following order, separated by blank lines:

1. External / third-party packages
2. Internal project modules (`@/`, `~/`, relative `../`)
3. Types / interfaces only (if your language supports type-only imports)
4. Style files / assets (if applicable)

---

## 6. COMMENTS & DOCUMENTATION

- Write comments to explain **why**, not **what** (the code explains what).
- Use JSDoc / docstrings for all public functions, classes, and interfaces.
- TODOs must include a reason: `// TODO(username): Fix after API v2 migration`.
- Never leave commented-out code in committed files (use version control to recover it).

---

## 7. [PROJECT-SPECIFIC OVERRIDES]

> **[FILL IN]:** Document any conventions that deviate from the defaults above. Examples:
> - "We use `PascalCase` for all file names (not just components)" — e.g., some Go projects.
> - "Database columns use `camelCase`" — e.g., some MongoDB projects.
> - "API routes use `snake_case`" — e.g., some Python/Django projects.
> - "All Python files use `snake_case`" — override the general camelCase default.
