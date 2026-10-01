# Engineering Pillars (Golden Rules):
- **YAGNI:** You Aren't Gonna Need It — don't build what isn't required now.
- **KISS:** Keep It Simple, Stupid — choose the simplest correct solution.
- **DRY:** Don't Repeat Yourself — single source of truth for every piece of logic.
- **No Over-Engineering:** Avoid premature abstractions and speculative generalization.
- **No Horizontal Scroll:** Data containers on mobile MUST stack gracefully, never overflow.
- **Mobile First:** Write default styles for mobile, scale up to desktop.

---

# FIX / HOTFIX — [Bug Description]

## Bug Report

> **[FILL IN]:**
>
> - **Severity:** `[Critical / High / Medium / Low]`
> - **Type:** `[FIX (planned) / HOTFIX (urgent, production-impacting)]`
> - **Reported by:** `[user / automated alert / QA]`
> - **Environment:** `[Production / Staging / Local]`

## Symptom

> **[FILL IN]:** Describe what the user sees or what the system does incorrectly.

## Root Cause (if known)

> **[FILL IN]:** Describe the technical root cause. If unknown, describe the investigation approach.
>
> - Suspected file: `[path]`
> - Suspected function/method: `[name]`
> - Related error code: `[CODE-001]`

## Fix Approach

> **[FILL IN]:** Describe the planned correction. Keep it minimal — fix only what's broken (YAGNI).

## Files to Modify

> **[FILL IN]:**
>
> - `[path/to/file.ext]` — `[what changes]`

## Regression Risk

> **[FILL IN]:** What other functionality could be affected by this fix? What must be re-tested?

## Acceptance Criteria

> **[FILL IN]:**
>
> - [ ] The reported bug no longer occurs.
> - [ ] `[Related functionality]` still works correctly.
> - [ ] Boy Scout Rule applied: hardcoded error strings in modified files refactored.
> - [ ] Error code registered in catalog if a new error path was introduced.

---

# MASTER AGENT DIRECTIVE

Refer to `AGENTS.md` in the project root directory for all operational instructions, coding standards, harness routing, test credentials, and session end protocols.

Do not bypass the directives established in `AGENTS.md` and the `HARNESS/` directory under any circumstances.
