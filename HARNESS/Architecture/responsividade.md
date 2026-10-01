# Responsive Design

> **[FILL IN]:** This file documents the responsive design breakpoints and per-viewport behavior for `[PROJECT_NAME]`.

---

## 1. Breakpoints

> **[FILL IN]:** Define the breakpoints used in this project.
>
> | Name | Min Width | Typical Target |
> |---|---|---|
> | `xs` | `0px` | Small phones |
> | `sm` | `640px` | Large phones / landscape |
> | `md` | `768px` | Tablets |
> | `lg` | `1024px` | Laptops |
> | `xl` | `1280px` | Desktops |
> | `2xl` | `1536px` | Wide screens |

## 2. Mobile-First Rules

All code is written mobile-first. Default styles target the smallest viewport. Larger breakpoints override with `@media (min-width: ...)` or framework utility prefixes (e.g., `md:`, `lg:`).

## 3. Per-View Responsive Behavior

> **[FILL IN]:** Document any view-specific responsive adjustments.
>
> | View | Mobile Behavior | Desktop Behavior |
> |---|---|---|
> | `[ListView]` | Stacked cards, no table | Sortable table with fixed header |
> | `[DetailModal]` | Full-screen | Centered overlay, max-width 720px |

## 4. Touch & Pointer Considerations

> **[FILL IN]:** Document any touch-specific behaviors (e.g., minimum tap target size, `onPointerDown` usage, swipe gestures).