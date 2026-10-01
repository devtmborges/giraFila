# Quick-Input / NLP / Command Palette Documentation

> **[FILL IN]:** This file documents any quick-input, natural language processing (NLP), or command palette system in `[PROJECT_NAME]`. If your project does not have such a system, you may leave this stub empty or delete it.
>
> This file should be the **Single Source of Truth (SSOT)** for the quick-input system — triggers, parsing logic, error codes, and extension guide.

---

## 1. System Overview

> **[FILL IN]:** Describe the quick-input / command palette system.
>
> - **What it does:** Allows users to `[create entities / run commands / search records]` via typed natural language or structured commands without navigating forms.
> - **Where it lives:** `[Component path]` — accessible via `[keyboard shortcut / UI element]`.
> - **Backend handler:** `[API route or service]`

### High-Level Flow

```
User types command → [InputComponent]
    → [API endpoint / service]
        → Parse command (regex / NLP / AST)
        → Validate & sanitize
        → Persist or execute
        → Return structured feedback
    → Visual feedback (created entities, confirmation)
```

---

## 2. Command Catalog

> **[FILL IN]:** Document each supported command/trigger.

### Command: `[trigger phrase]`

- **Regex / Pattern:** `[FILL IN: regex or pattern]`
- **Creates / Executes:** `[FILL IN: what action it performs]`
- **Required fields:** `[FILL IN]`
- **Error Codes:** `[FILL IN: error codes from ErrorGovernance.md]`

**Accepted variants:**

| Input Example | Result |
|---|---|
| `[example input]` | `[expected result]` |

---

## 3. Security & Integrity Rules

> **[FILL IN]:** Document security measures applied to command parsing.
>
> - **Input sanitization:** Strip HTML/script tags before processing.
> - **Trigger validation:** Reject free text with no recognized trigger (return appropriate error code).
> - **Stateless regexes:** Ensure regex patterns do not use global flags (e.g., `/g`) to prevent `lastIndex` drift in concurrent environments.

---

## 4. Error Code Catalog (Quick-Input)

> **[FILL IN]:** List error codes specific to this system.
>
> | Code | Trigger | Condition |
> |---|---|---|
> | `[PROJECT]-SYSTEM-VAL-001` | Any | Free text with no recognized trigger |
> | `[PROJECT]-[MODULE]-VAL-001` | `[trigger]` | Required field empty after sanitization |

---

## 5. Extension Guide — Adding a New Command

> **[FILL IN]:** Document the steps to add a new trigger without breaking existing ones.
>
> 1. Define the new regex pattern in `[SSOT constants file]`.
> 2. Add the new branch in `[parser handler]` — **before** the fallback error branch.
> 3. Register new error codes in the Error Catalog.
> 4. Update the UI hints component `[HintsComponent]` if visible suggestions exist.
> 5. Update this documentation file.
