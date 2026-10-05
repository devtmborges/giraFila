# Literal Time Persistence & Date Handling Guidelines

This document defines the strict, non-negotiable rules for date/time manipulation, persistence, and UI rendering across the `[PROJECT_NAME]` codebase.
Following these rules is mandatory to prevent timezone offset shifts, date-jumping in calendars, and audit discrepancies.

> **Note:** Code examples use JavaScript/TypeScript. The same principles apply in any language — adapt the syntax (e.g., Python's `datetime`, Java's `ZonedDateTime`, Go's `time.Time`) but always honor the underlying rule.

---

## 1. THE LITERAL TIME PERSISTENCE PROTOCOL

To ensure that dates and times entered by users are stored and rendered with 100% fidelity regardless of server or browser/client timezone, the system ignores local time offsets during persistence and display.

### Rule 1.1: Backend Ingestion — Force UTC Literal

- All date strings received in API handlers MUST be normalized to UTC **before** constructing a Date/datetime object and passing it to the persistence layer.
- **Reason:** Forcing UTC-literal normalization ensures the persistence layer stores the wall-clock literal time directly as UTC, without applying local server offsets.

```typescript
// CORRECT (TypeScript/JavaScript):
const literalDate = new Date(
  body.date.endsWith('Z') ? body.date : `${body.date}Z`
);

// INCORRECT — will apply local server offset:
const wrongDate = new Date(body.date);
```

```python
# CORRECT (Python):
from datetime import datetime, timezone
dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))

# INCORRECT — naive datetime, offset-dependent:
dt = datetime.fromisoformat(date_str)
```

### Rule 1.2: Frontend/Client Display — Force UTC Rendering

- All UI components rendering stored dates MUST force UTC when formatting for display.
- **Reason:** Forces the client to render the stored UTC value as a wall-clock literal, preventing the client from shifting the time by the local timezone offset.

```typescript
// CORRECT (JavaScript - Data de Evento literal):
const formatted = new Date(storedDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// INCORRECT — will shift by local timezone (pode mudar o dia do evento):
const wrong = new Date(storedDate).toLocaleDateString('pt-BR');
```

### Rule 1.3: Operational Timestamps (`created_at`) — Render in Local Time

- For timestamp fields recording the physical moment of an operation (e.g. `attendances.created_at`, `visitors.created_at`), store as standard UTC ISO-8601 (`new Date().toISOString()`), but format for UI display in the user's **local timezone** (without `{ timeZone: 'UTC' }`).
- **Reason:** Ensures the displayed hour and minute match the user's physical clock in the venue (e.g. UTC-3 in Brazil), eliminating unexpected +3h shifts while preserving precise UTC sorting and persistence.

```typescript
// CORRECT (JavaScript - Horário operacional de atendimento):
const display = `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

// INCORRECT — will force UTC/Greenwich time, displaying +3h ahead in Brazil:
const wrong = d.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
```

---

## 2. CALENDAR GROUPING & DATE COMPARISONS

### Rule 2.1: Substring Extraction for Daily Grouping

- In grid, calendar, or batch views, daily date comparisons MUST be performed via string extraction (first 10 characters of an ISO string: `YYYY-MM-DD`).
- **DO NOT** instantiate local Date/datetime objects to compare days, months, or years.

```typescript
// CORRECT:
const dateKey = storedDateString.substring(0, 10); // "2026-04-23"

// INCORRECT — shifted by local browser timezone:
const localDate = new Date(storedDateString);
const day = localDate.getDate();
```

```python
# CORRECT:
date_key = stored_date_string[:10]  # "2026-04-23"

# INCORRECT:
from datetime import datetime
local_date = datetime.fromisoformat(stored_date_string)  # timezone-dependent
```

### Rule 2.2: Time Input Initialization in Forms

- When initializing time fields in forms, use direct string extraction for default "now" fallback values.
- Always prioritize preserving raw literal values coming from the database.
- Never use `new Date()` or `datetime.now()` (local) to initialize stored time fields.

---

## 3. EFFECTIVE DATE UTILITIES (Domain-Specific)

> **[FILL IN]:** If your project has domain-specific "effective date" logic (e.g., a business close date, a billing competence date, a report period), document the utility functions and their filtering logic here.

Example structure:
- **Effective Date Utility:** `lib/dates/effectiveDate.[ext]`
- **Logic Order:** Priority cascade for manual override vs. system-generated date.
- **Monthly Competence Filter:** Logic for filtering records by month/quarter/year.
- **Date Range Normalization:** Normalize start times to `00:00:00` and end times to `23:59:59` UTC.

---

## 4. CHECKLIST FOR DATE-RELATED IMPLEMENTATIONS

- [ ] All POST/PUT API handlers normalize incoming ISO date strings to UTC before saving.
- [ ] All client-side date formatters force `{ timeZone: 'UTC' }` (or equivalent).
- [ ] Calendar, agenda, and grouping views compare dates via substring/slice, not local Date objects.
- [ ] No local `new Date()` / `datetime.now()` is used to initialize stored date/time fields in forms.
- [ ] Date range filters normalize start times to `00:00:00 UTC` and end times to `23:59:59 UTC`.

> **[FILL IN]:** Add project-specific checklist items for your domain's date-sensitive flows (e.g., `[ModuleName] close date filters use lib/dates/close-date.[ext]`).