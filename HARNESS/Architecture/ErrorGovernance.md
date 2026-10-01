# Error Governance & User Communication Directives

This document defines the strict rules, workflow processes, error code naming conventions, and cataloging standards for exception handling and user error communication across the `[PROJECT_NAME]` codebase.

---

## 1. CORE PRINCIPLES

1. **Zero Hardcoded Error Strings:** Never hardcode error message strings inside UI components, API handlers, service layers, or notification triggers.
2. **Single Source of Truth (SSOT):** All user-facing error messages and technical context MUST reside in the centralized Error Catalog (`[PROJECT_ROOT]/constants/errors.[json|yaml|ts|py]`).
3. **User-Centric Language:** All user-facing error messages MUST be written in `[PRODUCT_LANGUAGE]`. Messages must be empathetic, clear, avoid technical jargon, and provide an actionable next step for the user.
4. **Error Code Attribution:** Every displayed error message MUST include its unique Error Code (e.g., `[Code: [PROJECT]-CLIENTS-VAL-001]`) to enable immediate support lookup.
5. **Definition of Done Constraint:** A `FEAT`, `FIX`, or `HOTFIX` is NOT considered complete unless all associated error codes and messages are registered in the Error Catalog.

---

## 2. ERROR CODE NOMENCLATURE & TAXONOMY

All error codes MUST follow the standardized format:

`[PROJECT]-[MODULE]-[TYPE]-[NUMBER]`

Replace `[PROJECT]` with your project prefix (e.g., `APP`, `API`, `SVC`).

### 2.1 Module Codes (`MODULE`)
Define your project's module codes here. Common examples:

- `AUTH`: Authentication, session, credentials, tokens.
- `USERS`: User management, profiles, roles.
- `DATA`: Core data entities and business records.
- `BILLING`: Payments, invoices, subscriptions.
- `AUDIT`: Telemetry, logs, audit trail.
- `SYSTEM`: Infrastructure, database, external APIs, uploads.

> **[FILL IN]:** Replace or extend this list with your project's actual module codes.

### 2.2 Error Type Codes (`TYPE`)
- `VAL`: Validation Errors (invalid inputs, missing fields, format mismatches).
- `REG`: Business Rule Errors (workflow constraints, state transition blocks).
- `SEC`: Security & Access Control Errors (forbidden actions, permission violations).
- `SYS`: Internal System Errors (DB timeouts, unexpected failures, 500s).

### 2.3 Sequential Number (`NUMBER`)
- A 3-digit zero-padded number starting at `001` per module/type combination.
- *Examples:* `APP-AUTH-VAL-001`, `APP-DATA-REG-002`, `APP-SYSTEM-SYS-005`.

---

## 3. DEVELOPMENT WORKFLOW (FEAT / FIX / HOTFIX)

When implementing any feature or fix, follow this 4-step error management process:

1. **Identify Exception Points:** During the planning phase, map out potential failure modes (e.g., duplicate entries, invalid state transitions, network failures).
2. **Check Error Catalog (`[PROJECT_ROOT]/constants/errors.[ext]`):**
   - If a matching error code already exists, reuse it.
   - If no matching error exists, create a new entry following the taxonomy in Section 2.
3. **Implement Exception Throwing/Handling:**
   - Throw exceptions or return API error responses using the assigned Error Code.
   - Use the system error utility (e.g., `lib/errors/error-handler.[ext]`) to resolve error codes to user messages.
4. **Update Technical Context:**
   - Document common causes and related code files in the error's `technicalContext` block to assist future debugging and AI agent sessions.

---

### 3.1 LEGACY & HARDCODED ERROR REFACTORING PROTOCOL

When encountering existing hardcoded error messages in legacy code (UI components, API handlers, service layers, or notification triggers):

1. **Opportunistic Refactoring (Boy Scout Rule):** Any time an agent or developer modifies a file or component during a `FEAT`, `FIX`, or `HOTFIX`, they MUST identify and refactor all existing hardcoded error strings within that modified scope.
2. **Refactoring Steps:**
   - Extract the hardcoded string from the component, route, or service.
   - Search the Error Catalog to check if an equivalent error code exists.
   - If none exists, assign a new Error Code following Section 2 and register it in the catalog.
   - Replace the hardcoded string with a call to the error handler utility or catalog key lookup.
   - Add the refactored file path to the `relatedFiles` array of the corresponding error code.
3. **Forbidden Behavior:** Never leave hardcoded error strings untouched in files modified during active development sessions.

---

## 4. ERROR CATALOG SCHEMA & STRUCTURE

The error catalog serves as both the runtime dictionary and the developer/agent troubleshooting glossary. Store it at `[PROJECT_ROOT]/constants/errors.[json|yaml|ts|py]`.

### 4.1 Recommended JSON Schema

```json
{
  "[PROJECT]-[MODULE]-[TYPE]-001": {
    "userMessage": "[User-facing message in your product language — empathetic, actionable, no technical jargon]",
    "technicalContext": {
      "summary": "[One-line technical description of the error condition]",
      "commonCauses": [
        "[Common cause 1]",
        "[Common cause 2]"
      ],
      "relatedFiles": [
        "[src/path/to/file-that-throws-this-error]",
        "[src/path/to/validator-or-handler]"
      ],
      "suggestedAction": "[What a developer or agent should do to resolve this]"
    }
  }
}
```

---

## 5. UI DISPLAY & NOTIFICATION RULES

1. **Toast / Snackbar Notifications:** Use for non-blocking validation errors (`VAL`) or soft warnings.
   - Append the error code: `[Code: [PROJECT]-MODULE-VAL-001]`.
2. **Modal / Dialog Alerts:** Use for blocking business rules (`REG`) or security failures (`SEC`).
   - Display the clear `userMessage` and show the error code in the dialog footer or secondary text.
3. **Telemetry Integration:** Critical errors (`SYS` or `SEC`) MUST automatically log the Error Code into the project's audit/telemetry system.

> **[FILL IN]:** Update the specific notification component names and z-index/layering values in `HARNESS/UI/UiDesignSystem.md` if your UI framework uses a different pattern.