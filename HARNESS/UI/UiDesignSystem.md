# UI/UX & Design System Guidelines

This document defines the strict UI/UX patterns, modal state management, z-index hierarchy, form validation standards, and responsive layout constraints for the `[PROJECT_NAME]` codebase.

> **[FILL IN]:** Code examples use React/JSX syntax. Adapt patterns to your frontend framework (Vue, Angular, Svelte, native mobile, etc.). The underlying rules are framework-agnostic.

---

## 1. Z-INDEX HIERARCHY & STACKING CONTEXTS

To prevent frozen screens, unclickable backdrops, or sub-modals rendering behind active forms, strictly adhere to the following `z-index` assignment tiers:

| UI Component Layer | Recommended Z-Index Range | Description & Purpose |
| :--- | :--- | :--- |
| **Main Layout Headers / Sidebar** | Low (e.g., `30`–`40`) | Fixed navigation bars, logos, and mode selectors. |
| **Modal Backdrops** | Medium (e.g., `200`–`9999`) | Primary background overlay for forms and detail views. |
| **Primary Forms & Modals** | High (e.g., `9999`) | Main entity forms, detail modals, action panels. |
| **Sub-modals / Warning Alerts** | Higher (e.g., `10000`) | Discard warnings, confirmation dialogs, delete alerts. |
| **Global System Toasts / Snackbars** | Highest (e.g., `99999`) | Non-intrusive feedback notifications (must render above everything). |

- **Mandatory Rule:** All confirmation sub-modals (discard warnings, delete prompts) MUST use a z-index higher than the parent modal backdrop to guarantee they render on top.

> **[FILL IN]:** Set the exact z-index values for your project in a shared constants file (e.g., `lib/zIndex.ts`, `styles/variables.css`) and reference them here.

---

## 2. MODAL STATES: VIEW-ONLY VS EDIT MODE

### Rule 2.1: DOM Input Removal in Read-Only Mode

- When a modal opens in **Read-Only / View mode**, **REMOVE** interactive form elements (`<input>`, `<select>`, `<textarea>`, equivalent in your framework) from the DOM.
- Replace them with static display blocks (icon + label + value layout).
- **Reason:** Prevents users from inspecting elements to bypass `disabled` flags, declutters mobile screens, and improves scanability.

### Rule 2.2: Discard Warning & `isDirty` Tracking

- All modal forms MUST implement `isDirty` state tracking via the root form's `onChange` event (or equivalent framework pattern).
- **Rule:** The "Discard changes?" confirmation dialog MUST ONLY trigger if the user directly interacted with inputs (`isDirty === true`).
- Ignore programmatic updates, initial data loads, and async population via effects.

---

## 3. FORM VALIDATION & SUBMIT ARCHITECTURE

### Rule 3.1: Client-Side Validation without Native HTML5 `required`

- **DO NOT** use the native HTML `required` attribute on input fields (avoids unstyled browser default tooltips and inconsistent mobile UX).
- **Standard Pattern:**
  1. Maintain a `fieldErrors` state object keyed by field name.
  2. In `handleSubmit`, validate required fields manually. If invalid, set `fieldErrors[fieldName] = true` to apply a visible error state (e.g., red border).
  3. Display field errors via the global notification/toast system.
  4. Clear individual field error flags automatically as the user types (`onChange`).

### Rule 3.2: Entity Modals Handle Their Own API Calls

- Complex entity forms (e.g., create/edit forms with multiple sub-entities) MUST perform the API call **internally** rather than delegating submit logic to the parent page.
- **Reason:** Intercepts backend constraint errors and persists sub-entities without prematurely closing the modal or losing unsaved form data.

### Rule 3.3: Safe Form Submission

- **DO NOT** trigger form submits via `dispatchEvent(new Event('submit'))` — it bypasses framework `preventDefault()`, causing page reloads and cancelling active API requests.
- **Standard:** Use `formRef.requestSubmit()` or the framework-equivalent programmatic submit. Silence the `Enter` key on nested input fields that should not submit the form.

---

## 4. RESPONSIVE DESIGN & MOBILE-FIRST PRINCIPLES

### Rule 4.1: Mobile Ergonomics & Widescreen Adaptations

- **No Horizontal Scroll:** Tables and data containers on mobile viewports MUST stack gracefully into vertical card lists. Never allow horizontal overflow.
- **Collapsible Mobile Filters:** In list views, filter bars on mobile MUST be collapsed by default behind a full-width toggle button.
- **Mobile Buttons:** Replace text labels on primary action buttons with icon-only variants on mobile. Use progressive disclosure (`hidden` → visible at breakpoint).

### Rule 4.2: Typography Hierarchy

Maintain a consistent header/subtitle hierarchy across all primary views:

- **View Title:** Large, light weight, uppercase, wide letter-spacing.
- **View Subtitle:** Small, sentence case, muted color.

> **[FILL IN]:** Document the exact typography tokens (font size, weight, tracking) used in your design system.

---

## 5. ERROR MESSAGING & USER COMMUNICATION STANDARDS

### Rule 5.1: No Hardcoded Error Strings in UI Components

- **STRICT RULE:** Do **NOT** hardcode error message strings inside UI components, hooks, or notification triggers.
- All user-facing error text MUST be retrieved from the centralized Error Catalog using the unique Error Code.
- Refer to `HARNESS/Architecture/ErrorGovernance.md` for error code structure and registration rules.

### Rule 5.2: Notification Layering & Tone of Voice

- **Transient / Validation Errors:** Display via global toast/snackbar notifications (highest z-index layer).
- **Blocking / Critical Errors:** Display via confirmation dialogs or modal alerts (sub-modal z-index layer).
- **Tone of Voice:** All user messages MUST be empathetic, actionable, and written in `[PRODUCT_LANGUAGE]`. Never expose raw technical exceptions, ORM error codes, or stack traces to the user.
  - ❌ *Incorrect:* `Error 500: Database unique constraint failed on field email.`
  - ✅ *Correct:* `We couldn't complete this action: the email address is already registered.`

### Rule 5.3: Error Code Visibility for Support & Debugging

- Every error toast or modal alert MUST subtly display the associated Error Code (e.g., `[Code: APP-AUTH-VAL-001]`) in a footnote or secondary text area of the notification.
- **Purpose:** Allows users to report the exact error code to support, enabling immediate root-cause lookup in the Error Catalog.

---

## 6. [PROJECT-SPECIFIC DESIGN SYSTEM TOKENS]

> **[FILL IN]:** Document your project's specific design system here. Examples:
>
> - **Centralized style token file:** `lib/styles.[ts|py|dart]` (token names and values)
> - **Color palette:** Primary, secondary, accent, error, warning, success colors
> - **Spacing scale:** Base unit and scale steps
> - **Component-specific patterns:** Any project-specific modal layouts, sidebar patterns, data table conventions
> - **Brand typography:** Font family, weights, and size scale
