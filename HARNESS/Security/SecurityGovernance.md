# Security, Governance & Identity Guidelines

This document defines the security parameters and threat mitigation strategies for `[PROJECT_NAME]`.
Following the **KISS** and **YAGNI** principles, all implementations must avoid over-engineering, leveraging the existing security layers provided by your infrastructure and framework defaults.

---

## 1. RATE LIMITING & DDOS MITIGATION

To prevent resource exhaustion and brute-force attacks, strict rate limiting is applied per user/IP:

- **Threshold:** Maximum of **`[FILL IN: N]` requests per minute** per client IP / user account on sensitive API routes (authentication, mutations, file uploads).
- **Mechanism:** Use your platform's rate-limiting middleware or a lightweight in-process store (e.g., Redis, in-memory sliding window).
- **Behavior:** Requests exceeding the threshold MUST immediately return a `429 Too Many Requests` status with a standard JSON error body.

```json
{
  "error": "[PROJECT]-SYSTEM-SEC-001",
  "message": "Too many requests. Please try again in a moment."
}
```

---

## 2. SCRIPT INJECTION & INPUT SANITIZATION

All user inputs — across forms, API endpoints, CLI commands, and any quick-input systems — MUST be sanitized before processing or persistence:

- **XSS / Script Injection Prevention:** Strip HTML/script tags from all string inputs in API handlers and service layers before reaching the database.
- **Parameterized Queries:** Use your ORM's or database driver's parameterized query mechanism exclusively. Never concatenate raw user input into SQL or query strings.
- **Unique Field Sanitization:** Fields that enforce unique constraints (e.g., document numbers, canonical identifiers) MUST convert empty or whitespace-only strings to `null` / `None` before persistence — to avoid false unique constraint violations.

---

## 3. IDENTITY ORIGIN & REQUEST VERIFICATION

No request or data ingestion is allowed without explicit, verified origin identity:

- **Auth Token Verification:** API routes MUST validate the presence and authenticity of authentication tokens (JWT, session cookie, API key, or equivalent). Any request lacking valid credentials MUST be rejected with `401 Unauthorized`.
- **Scope / Permission Check:** After authentication, verify that the authenticated identity is authorized for the requested resource (`403 Forbidden` otherwise).
- **Webhook Signature Verification:** Inbound webhook payloads from external services MUST be verified via HMAC signature or equivalent before processing.

---

## 4. ZERO TRUST DEFAULT

- **Default Deny:** All users, services, and agents start with zero permissions. Access is explicitly granted, never assumed.
- **Least Privilege:** Each role, service account, or integration receives only the minimum permissions necessary for its function.
- **Trust No Input:** Validate and sanitize every incoming value regardless of source (internal service, trusted partner, admin UI).

---

## 5. ACCESS CONTROL LEVELS

Define your project's access control tiers here. Generic example:

| Level | Name | Description |
|---|---|---|
| 1 | Public | No authentication required |
| 2 | Authenticated | Valid session required |
| 3 | Authorized | Role/permission check required |
| 4 | Privileged | Admin or elevated role required |
| 5 | Restricted | Explicit allowlist only |

> **[FILL IN]:** Replace with your project's actual permission model (RBAC, ABAC, ACL, etc.).

---

## 6. AUDIT & TELEMETRY LOGGING

- All mutative actions (`CREATE`, `UPDATE`, `DELETE`) MUST record an entry in the project's audit log.
- **Minimum required fields per log entry:**
  - `user_id` — who performed the action
  - `entity` — which table / resource type was affected
  - `record_id` — which specific record
  - `before` — state before the mutation (snapshot or diff)
  - `after` — state after the mutation
  - `trace_hash` — unique trace ID for request correlation
  - `timestamp` — UTC ISO-8601 timestamp
- **Critical Errors:** Errors of type `SYS` or `SEC` (see `ErrorGovernance.md`) MUST automatically trigger an audit log entry in addition to returning the error response.
- **Temporal Accuracy:** Ensure UTC timestamps are stored consistently — apply the Literal Time Protocol from `HARNESS/Architecture/TimeAndDates.md`.

> **[FILL IN]:** Document your project-specific audit table/collection name and any additional fields required by your compliance requirements (e.g., GDPR, LGPD, HIPAA).