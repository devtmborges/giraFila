# Agent Workflow & Planning Protocol

This document defines the mandatory workflow for AI agents and developers when planning and executing any code change (`FEAT`, `FIX`, or `HOTFIX`) in the `[PROJECT_NAME]` codebase.

---

## 1. THE PLAN-FIRST PROTOCOL

### Rule 1.1: Always Plan Before Coding

- You MUST create a well-structured implementation plan BEFORE executing any code changes.
- Plans must be shared with the user and require explicit approval before execution begins.

### Rule 1.2: Mandatory Pre-Planning Checks

Before drafting any implementation plan, you MUST read and cross-check the proposed approach against:

1. **`HARNESS/Architecture/ErrorGovernance.md`:** Map all exception points, specify error codes (`[PROJECT]-[MODULE]-[TYPE]-[NUMBER]`), plan catalog additions, and apply the Boy Scout Rule for legacy strings in modified files.
2. **`HARNESS/Security/SecurityGovernance.md`:** Validate Zero Trust policy, rate limiting, sanitization, and mandatory telemetry logging.

Plans that do not include this dual validation are considered **incomplete** and must not be executed.

### Rule 1.3: Definition of Done

A task is considered **Done** only when ALL of the following are true:
- [ ] All code changes are implemented and tested.
- [ ] All new error codes are registered in the Error Catalog.
- [ ] All new security-sensitive code paths have been reviewed against `SecurityGovernance.md`.
- [ ] Telemetry/audit logging is confirmed for all mutative actions.
- [ ] `HARNESS/Architecture/ProjectStructure.md` has been updated if new files or modules were introduced.
- [ ] `HARNESS/Optimization/TurboQuantOptimization.md` changelog has been updated if a performance optimization was applied.

---

## 2. ENGINEERING PRINCIPLES (GOLDEN RULES)

These rules are absolute and apply to every line of code written in this project:

- **KISS** (Keep It Simple, Stupid): Choose the simplest solution that correctly solves the problem. Resist cleverness.
- **YAGNI** (You Aren't Gonna Need It): Do not build features, abstractions, or generalization that are not required right now.
- **DRY** (Don't Repeat Yourself): A single source of truth for every piece of logic. Duplication is a bug waiting to happen.
- **SRP** (Single Responsibility Principle): Each module, function, or class does exactly one thing.
- **No Over-Engineering:** Follow the above four. Do not reinvent the wheel.
- **If it ain't broke, don't fix it:** Do NOT refactor or change working code unless strictly requested.
- **Mobile First:** Design and write code for mobile viewports first, then scale to desktop.
- **No Horizontal Scroll:** Tables and data containers on mobile MUST stack gracefully; never overflow horizontally.

---

## 3. CHANGE CLASSIFICATION

| Type | When to Use |
|---|---|
| `FEAT` | A new user-facing capability or API endpoint |
| `FIX` | Correcting a known bug or misbehavior |
| `HOTFIX` | Emergency correction for a production-impacting critical issue |
| `REFACTOR` | Internal code improvement with no behavior change (only when explicitly requested) |
| `CHORE` | Non-code changes (docs, deps, CI) |

---

## 4. PLAN STRUCTURE (TEMPLATE)

When creating an implementation plan, include:

1. **Goal:** One-sentence summary of what this change accomplishes.
2. **Context:** Background, related files, and any constraints.
3. **Pre-Planning Check Results:** Findings from ErrorGovernance.md and SecurityGovernance.md checks.
4. **Proposed Changes:** File-by-file breakdown of what changes and why.
5. **New Error Codes:** List of new error codes to register (if any).
6. **Telemetry Impact:** Confirm whether audit/telemetry logs need updates.
7. **Verification Plan:** How you will confirm the change works correctly.
8. **Open Questions:** Any decision points requiring user input before execution.

---

## 5. BOY SCOUT RULE

> Leave the code cleaner than you found it — but only within the scope of the current change.

When modifying any file during a `FEAT`, `FIX`, or `HOTFIX`:
- Refactor any hardcoded error strings in that file (register them in the Error Catalog).
- Fix any obvious code style violations in modified lines only.
- Do NOT expand the scope of refactoring beyond the files directly involved in the current task.
