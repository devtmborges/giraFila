# Engineering Pillars (Golden Rules):
- **YAGNI:** You Aren't Gonna Need It — don't build what isn't required now.
- **KISS:** Keep It Simple, Stupid — choose the simplest correct solution.
- **DRY:** Don't Repeat Yourself — single source of truth for every piece of logic.
- **No Over-Engineering:** Avoid premature abstractions and speculative generalization.
- **No Horizontal Scroll:** Data containers on mobile MUST stack gracefully, never overflow.
- **Mobile First:** Write default styles for mobile, scale up to desktop.

---

# FEAT — [Feature Name]

## Goal

> **[FILL IN]:** One sentence describing the new capability to be built.

## Context & Background

> **[FILL IN]:** Why is this feature needed? Link to relevant HARNESS files, existing components, or API routes that this feature will interact with.
>
> - Related file: `[path]`
> - Related error codes: `[CODE-001]`, `[CODE-002]`
> - Related endpoints: `[POST /api/resource]`

## Scope & Constraints

> **[FILL IN]:** Define the explicit boundaries of this task.
>
> **In scope:**
> - `[What must be built]`
>
> **Out of scope (explicitly excluded from this task):**
> - `[What must NOT be touched]`
>
> **Must not break:**
> - `[Existing behavior that must be preserved]`

## Implementation Notes

> **[FILL IN]:** Any specific technical guidance, decisions already made, or approaches to follow.

## Acceptance Criteria

> **[FILL IN]:** How will you verify this feature is complete and correct?
>
> - [ ] `[Criterion 1]`
> - [ ] `[Criterion 2]`
> - [ ] All new error codes registered in the Error Catalog.
> - [ ] Security review completed against `SecurityGovernance.md`.
> - [ ] Telemetry/audit logging confirmed for all mutative actions.

---

# MASTER AGENT DIRECTIVE

Refer to `AGENTS.md` in the project root directory for all operational instructions, coding standards, harness routing, test credentials, and session end protocols.

Do not bypass the directives established in `AGENTS.md` and the `HARNESS/` directory under any circumstances.
