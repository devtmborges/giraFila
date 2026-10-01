# Data Components

> **[FILL IN]:** This file documents the reusable data-display components of `[PROJECT_NAME]`. Agents read this before modifying lists, tables, cards, search modals, or notification components.

---

## 1. Component Inventory

> **[FILL IN]:** List each data component, its path, and its responsibility.
>
> | Component | Path | Responsibility |
> |---|---|---|
> | `[DataTable]` | `[path]` | Sortable, paginated table for listing records |
> | `[RecordCard]` | `[path]` | Card layout for grid views |
> | `[SearchModal]` | `[path]` | Full-screen entity search with filters |
> | `[Toast]` | `[path]` | Global notification toasts |
> | `[OptionsMenu]` | `[path]` | Contextual action dropdown |

## 2. Props & Usage Conventions

> **[FILL IN]:** For each key component, document required and optional props, and provide a usage example.

### [DataTable]

```tsx
// [FILL IN: usage example]
<DataTable
  data={records}
  columns={columns}
  onSort={handleSort}
/>
```

## 3. Shared State & Context

> **[FILL IN]:** Document any global context or shared state consumed by these components (e.g., `ToastContext`, `ThemeContext`).