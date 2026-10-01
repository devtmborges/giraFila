# Security & Audit (Project-Specific)

> **[FILL IN]:** This file documents the project-specific security and audit implementations for `[PROJECT_NAME]`. Universal security principles are defined in `HARNESS/Security/SecurityGovernance.md` — this file documents *how* those principles are implemented here.

---

## 1. Authentication Implementation

> **[FILL IN]:** Describe the auth mechanism used.
>
> - **Strategy:** `[e.g., JWT, session cookie, OAuth2, API key]`
> - **Token storage:** `[e.g., httpOnly cookie, localStorage, memory]`
> - **Session expiry:** `[e.g., 24h, 7d, sliding window]`
> - **Middleware file:** `[path/to/auth-middleware]`

## 2. Permission / Role System

> **[FILL IN]:** Describe the permission model.
>
> - **Model:** `[e.g., RBAC, ABAC, feature flags]`
> - **Roles:** `[List roles and their permissions]`
> - **Enforcement point:** `[API route level, service level, UI conditional rendering]`

## 3. Audit Log Implementation

> **[FILL IN]:** Describe the audit log table/collection and how entries are created.
>
> - **Audit table / collection:** `[name]`
> - **Logged events:** `[CREATE, UPDATE, DELETE, LOGIN, EXPORT, ...]`
> - **Logger utility:** `[path/to/telemetry or audit-logger]`

## 4. Multi-Tenancy (if applicable)

> **[FILL IN]:** Describe the tenant isolation strategy.
>
> - **Isolation model:** `[e.g., row-level security, schema-per-tenant, database-per-tenant]`
> - **Scope field:** `[e.g., tenant_id, org_id]`
> - **Enforcement:** `[ORM middleware, RLS policy, query wrapper]`

## 5. Known Security Constraints & Gotchas

> **[FILL IN]:** Document any non-obvious security behaviors specific to this project.