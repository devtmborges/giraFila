# Controllers / Services / Handlers

> **[FILL IN]:** This file documents the controller/service/handler layer of `[PROJECT_NAME]`. Agents read this before modifying business logic, API handlers, or service classes.

---

## 1. Layer Overview

> **[FILL IN]:** Describe the pattern used (e.g., MVC controllers, service classes, domain handlers, use cases). Explain how requests flow from the API route to the persistence layer.

```
[Request] → [Route Handler / Controller]
          → [Service / Use Case]
          → [Repository / ORM]
          → [Database]
```

## 2. Module Breakdown

> **[FILL IN]:** For each feature module, document:
>
> - **Module name and path**
> - **Responsibilities**
> - **Key methods / endpoints**
> - **Dependencies**

### [Module A] (`[src/modules/module-a/]`)

| Method / Endpoint | Action | Notes |
|---|---|---|
| `POST /api/[resource]` | Create a new `[resource]` | Requires auth |
| `GET /api/[resource]/:id` | Fetch a single `[resource]` | RLS/scope enforced |

## 3. Shared Utilities & Middleware

> **[FILL IN]:** List shared utilities used across controllers/services.
>
> - `lib/auth.[ext]` — Authentication helpers
> - `lib/errors/error-handler.[ext]` — Error catalog lookup
> - `lib/[other]` — `[purpose]`

## 4. Error Handling Pattern

> **[FILL IN]:** Describe the standard pattern for throwing and catching errors in service layers. Reference `HARNESS/Architecture/ErrorGovernance.md`.