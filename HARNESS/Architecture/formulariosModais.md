# Forms & Modals

> **[FILL IN]:** This file documents the forms and modal patterns of `[PROJECT_NAME]`. Agents read this before building or modifying any form, modal, or validation flow.
>
> **Core rules** for all form and modal implementations are defined in `HARNESS/UI/UiDesignSystem.md` (Sections 2, 3). This file documents *project-specific* implementations.

---

## 1. Modal Inventory

> **[FILL IN]:** List all modals in the project.
>
> | Modal | Path | Entity / Purpose |
> |---|---|---|
> | `[EntityFormModal]` | `[path]` | Create / edit `[Entity]` |
> | `[ConfirmDeleteModal]` | `[path]` | Generic delete confirmation |
> | `[EntityDetailModal]` | `[path]` | View-only detail for `[Entity]` |

## 2. Standard Form Pattern

> **[FILL IN]:** Document the standard pattern for entity create/edit forms in this project, including:
>
> - How `initialData` is passed (prop, context, query param?)
> - How `isDirty` is tracked
> - How validation errors are displayed
> - How the API call is performed (internally vs. via parent callback)
> - How the modal is closed on success

## 3. Validation Rules by Entity

> **[FILL IN]:** For each entity, document required fields and any custom validation rules.
>
> ### [Entity A]
> - `name`: Required, min 2 chars, max 191 chars
> - `email`: Required, valid email format
> - `[field]`: `[rule]`

## 4. View-Only Mode

> **[FILL IN]:** Document which modals support a view-only mode, how it is triggered (e.g., a `readOnly` prop), and which fields become static display blocks.