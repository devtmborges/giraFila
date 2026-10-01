# Layout & Navigation

> **[FILL IN]:** This file documents the layout shell and navigation system of `[PROJECT_NAME]`. Agents read this before modifying the app shell, sidebar, header, navigation bars, or mobile navigation.

---

## 1. Layout Shell Structure

> **[FILL IN]:** Describe the top-level layout wrapper.
>
> - **Root layout:** `[path/to/RootLayout]`
> - **Authenticated layout:** `[path/to/AppLayout]`
> - **Unauthenticated layout:** `[path/to/AuthLayout]`

## 2. Navigation Components

> **[FILL IN]:** List and describe each navigation component.
>
> | Component | Path | Responsibility |
> |---|---|---|
> | `[Sidebar]` | `[path]` | Persistent left-side navigation |
> | `[Header]` | `[path]` | Top bar with user profile and actions |
> | `[BottomNav]` | `[path]` | Mobile bottom navigation bar |

## 3. Active State & Route Matching

> **[FILL IN]:** Describe how active navigation items are determined (e.g., `usePathname()`, `router.currentRoute`, CSS class toggling).

## 4. Mobile Navigation Behavior

> **[FILL IN]:** Describe the mobile navigation pattern (e.g., hamburger menu, bottom tab bar, drawer) and the breakpoint at which it activates.

## 5. Z-Index & Stacking Context

> Reference: `HARNESS/UI/UiDesignSystem.md` — Section 1.
>
> **[FILL IN]:** Document the specific z-index values assigned to each layout layer in this project.