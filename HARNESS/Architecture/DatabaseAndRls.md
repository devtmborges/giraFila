# Data Access Patterns & Integrity Guidelines

This document contains mandatory guidelines for all data access, ORM/query usage, and schema modifications within the `[PROJECT_NAME]` codebase.

> **[FILL IN]:** This document contains agnostic patterns and principles. Where code examples use a specific ORM or query language, adapt them to your project's stack. Language-specific gotchas for `[YOUR_ORM]` / `[YOUR_DATABASE]` should be appended to the relevant section.

---

## 1. BOUNDED CONTEXT & DUAL-SCHEMA SEPARATION

When a single database serves multiple logical domains (e.g., a public portal and a private application domain), maintain strict separation:

1. **Global / Public Domain (No tenant filtering):**
   - Access pattern: Use a shared, global client/connection instance.
   - Rule: Never inject tenant-scoping filters into queries on these models.

2. **Application Domain (Scoped / Filtered Access):**
   - Access pattern: Use a factory function that returns a client pre-configured with the current tenant/user scope.
   - Rule: Every model in this domain must include a scope field (e.g., `tenant_id`, `org_id`). Middleware or an interceptor automatically filters reads and writes.

---

## 2. ORM QUERY GOTCHAS & INTERCEPTOR RULES

### Gotcha #1: Unique-Key Lookups vs. Automatic Filter Injection

- **Problem:** Some ORMs require that the `where` payload of a unique-key lookup (e.g., `findUnique`, `get_by_pk`) exactly matches a declared unique constraint. If middleware automatically appends a scoping field (e.g., `tenant_id`) to every `where` clause, and the unique constraint doesn't include that field, the ORM may return `null` / `None` even when the record exists.
- **Mandatory Rule:** **ALWAYS use a generic first-match query** (e.g., `findFirst`, `filter().first()`, `SELECT ... LIMIT 1`) instead of strict unique-key lookups in scoped/filtered contexts.
- **Allowed Exception:** Models with an explicit compound unique constraint that includes the scope field (e.g., `@@unique([tenant_id, sequential_number])`).

### Gotcha #2: Interactive Transactions & Unique Constraint Failures

- **Problem:** If a first-match query returns `null` inside a transaction (due to a middleware filter or a missing relation) and triggers a fallback `.create()` on a 1:1 table, some databases (notably MySQL) throw a unique constraint error (`P2002` / `23000`). Once a single query fails inside a MySQL interactive transaction, the entire transaction is aborted and cannot recover in lower `catch` blocks.
- **Mandatory Rule:** Perform all diagnostic read queries (first-match lookups) **BEFORE** initializing the transaction block.

### Gotcha #3: Updating Scoped Models via ORM Extension

- **Problem:** Updating a record via the ORM `.update()` method can fail when the ORM middleware's scope injection breaks the engine because the `where` clause lacks the expected compound key.
- **Mandatory Rule:** Use raw SQL (or the ORM's raw-query escape hatch) for direct updates on models where the scope interceptor causes failures.

### Gotcha #4: Relational Fetching vs. Orphaned Records

- **Problem:** Historical or orphaned child records (e.g., address rows, alias rows) might lack the scope field or have legacy drift. A raw `.findMany()` / `filter()` through child models will be silenced by the scope middleware, returning `[]` / `None`.
- **Mandatory Rule:** Always use **Relational Fetching** from the parent entity (i.e., JOIN via the parent's include/eager-load) rather than querying the child model directly:

```
# CORRECT: Bypasses child scope drift via native SQL JOIN
parent = db.entity.find(id=entity_id, include=["children", "aliases"])

# INCORRECT: Children may be silently filtered out by scope middleware
children = db.alias.filter(entity_id=entity_id)
```

---

## 3. APPEND-ONLY PATTERN & MIGRATION SAFETY

### Append-Only / Demotion Pattern for Auditable Entities

When updating primary records that require full audit trails (e.g., primary names, canonical identifiers):

- **DO NOT** execute a direct `UPDATE` on the existing `is_primary = true` row.
- **Execution Steps:**
  1. Demote current primary row (`UPDATE` setting `is_primary = false`).
  2. Perform a top-level `.create()` for the new primary record (`is_primary = true`).
- **Reason:** Preserves full audit trail and avoids ORM extension errors on nested updates.

### Uniqueness & Data Sanitization

- Fields that enforce unique constraints should sanitize empty or whitespace-only strings to `null` / `None` before passing to the ORM:

```python
# Python example
sanitized_doc = doc.strip() or None

# JavaScript / TypeScript example
const sanitizedDoc = doc?.trim() || null;
```

- This prevents unique constraint errors (`P2002` / `23000`) on empty strings, allowing multiple records without a value on that field.

### Junction Tables & Schema Mapping

- When writing manual SQL migrations for many-to-many relations, always map to the physical database table name as declared in your schema (e.g., via `@@map()` or `db_table`).
- Misreferencing mapped table names in foreign keys causes silent constraint failures during migration execution.

---

## 4. SEQUENTIAL NUMBER & RACE CONDITION HANDLING

- Sequential / auto-increment numbers that must be unique per tenant or per scope (e.g., `invoice_number`, `ticket_number`) should be generated via a max aggregation query per scope, not via a global auto-increment column.
- **Race Condition Protection:** Wrap creation in a retry loop (up to `N` attempts) catching unique constraint errors to handle concurrent submissions seamlessly.

```
MAX_RETRIES = 5
for attempt in range(MAX_RETRIES):
    next_number = db.entity.aggregate(max("sequential_number"), where={scope_filter}) + 1
    try:
        db.entity.create({ ..., sequential_number: next_number })
        break
    except UniqueConstraintError:
        continue  # retry with refreshed max
```

> **[FILL IN]:** Adapt this pattern to your ORM and database. Append language/ORM-specific gotchas for `[YOUR_STACK]` at the bottom of this file.