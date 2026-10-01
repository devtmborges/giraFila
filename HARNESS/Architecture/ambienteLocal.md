# Local Environment Setup

> **[FILL IN]:** This file documents how to set up and run `[PROJECT_NAME]` locally. Agents and new developers read this before making any changes that require running the project.

---

## 1. Prerequisites

> **[FILL IN]:** List required tools and versions.
>
> - **Runtime:** `[e.g., Node.js >= 20, Python >= 3.12, Go >= 1.22]`
> - **Package manager:** `[e.g., pnpm 9, pip, cargo]`
> - **Database:** `[e.g., PostgreSQL 16, MySQL 8, SQLite]`
> - **Other:** `[e.g., Docker, Redis, ffmpeg]`

## 2. Installation

```bash
# [FILL IN: clone and install commands]
git clone [REPO_URL]
cd [PROJECT_DIR]
[PACKAGE_MANAGER] install
```

## 3. Environment Configuration

```bash
# [FILL IN: copy and configure .env]
cp .env.example .env
# Edit .env and fill in required values (see arquiteturaUnificada.md → Section 4)
```

## 4. Database Setup

```bash
# [FILL IN: migration and seed commands]
[PACKAGE_MANAGER] run db:migrate
[PACKAGE_MANAGER] run db:seed
```

## 5. Running the Development Server

```bash
# [FILL IN: dev server command]
[PACKAGE_MANAGER] run dev
# Server available at: [LOCAL_URL]
```

## 6. Common CLI Commands

> **[FILL IN]:** Document frequently used CLI commands.
>
> | Command | Purpose |
> |---|---|
> | `[cmd]` | `[purpose]` |
> | `[cmd]` | `[purpose]` |

## 7. Known Gotchas & Troubleshooting

> **[FILL IN]:** Document common issues encountered during local setup and their solutions.