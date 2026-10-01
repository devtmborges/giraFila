# Engineering Pillars (Golden Rules):
- **YAGNI:** You Aren't Gonna Need It — don't build what isn't required now.
- **KISS:** Keep It Simple, Stupid — choose the simplest correct solution.
- **DRY:** Don't Repeat Yourself — single source of truth for every piece of logic.
- **No Over-Engineering:** Avoid premature abstractions and speculative generalization.
- **No Horizontal Scroll:** Data containers on mobile MUST stack gracefully, never overflow.
- **Mobile First:** Write default styles for mobile, scale up to desktop.

---

# AGENT TASK

## FEAT — Exportação de Dados para XLSX + Senha Mestre de Exportação

> **Tipo:** `FEAT` | **Versão Alvo:** `0.5.0-export` | **Data:** 2026-10-01

---

### Goal

Adicionar ao Dashboard um botão **"Exportar"** protegido por senha mestre que, após autenticação, abre um modal onde o usuário escolhe quais tabelas exportar (Visitantes e/ou Atendimentos), gerando um arquivo `.xlsx` multi-aba com os dados filtrados pelos filtros globais ativos.
Adicionalmente, disponibilizar um botão **lock** na `session-bar` (ao lado do botão Wi-Fi `#btnLanInfo`) para alterar a senha mestre.

---

### Context

- **Arquitetura:** SPA Vanilla JS (ESModules) + CSS — zero bundler, zero npm.
- **Persistência:** Dual-Layer (LAN API SQLite `api.php` + IndexedDB fallback).
- **Dados:** `rawData` já existe em `dashboardView.js` (`visitors`, `attendances`, `events`, `services`).
- **Biblioteca XLSX:** SheetJS v0.20.3 via CDN — `<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js">` — **requer internet**.
- **Senha mestre:** SHA-256(`'girafila'` + senha) via `window.crypto.subtle`. Armazenada em `localStorage['gf_export_pwd_hash']`. Inicialização silenciosa com hash padrão se chave ausente. **Nunca informar a senha padrão ao usuário.**
- **Filtros:** Exportar **dados já filtrados** pelos filtros globais ativos do Dashboard.
- **Nome do arquivo:** `GiraFila_dd-mm-aaaa_hhmm.xlsx` (ex: `GiraFila_01-10-2026_1800.xlsx`).

**Arquivos relacionados:**
- `js/views/dashboardView.js` — adicionar import, refs, listeners e handlers de exportação
- `js/app.js` — adicionar lógica do modal `#changePwdModal`
- `index.html` — CDN script + botão lock na session-bar + 3 modais + botão no dashboard
- `js/constants/errors.js` — 8 novos códigos de erro

---

### Arquitetura de Senha Mestre

**Fluxo de autenticação para exportar:**
```
[Botão #dashBtnExport] → #exportAuthModal (senha) → #exportModal (toggles) → Download .xlsx
```

**Fluxo de alteração de senha:**
```
[Botão #btnExportLock na session-bar] → #changePwdModal (senha atual + nova + confirmação)
```

**Hashing:** `SHA-256('girafila' + senha)` em hex via `window.crypto.subtle.digest('SHA-256', ...)`.
**Inicialização silenciosa:** Se `localStorage['gf_export_pwd_hash']` não existir, gravar o hash padrão automaticamente na primeira verificação, sem nenhuma mensagem ao usuário.

---

### Files to Create / Modify

| Op | Arquivo | Descrição |
|---|---|---|
| 🆕 | `js/utils/masterPassword.js` | `hashPassword()`, `verifyPassword()`, `updatePassword()` |
| 🆕 | `js/utils/xlsxExporter.js` | `exportToXlsx(filteredData, rawData, options)` via SheetJS |
| ✏️ | `index.html` | CDN `<script>`, botão `#btnExportLock`, modais `#exportAuthModal` / `#exportModal` / `#changePwdModal`, botão `#dashBtnExport` |
| ✏️ | `js/views/dashboardView.js` | Import dos utilitários, refs, `_openExportAuth()`, `_handleAuthConfirm()`, `_openExportModal()`, `_handleExportConfirm()` |
| ✏️ | `js/app.js` | Import `masterPassword.js`, handlers do `#changePwdModal` |
| ✏️ | `js/constants/errors.js` | 8 novos códigos `GF-EXPORT-*` e `GF-LOCK-*` |
| ✏️ | `css/components.css` | Estilos `.export-*`, `.btn-lock`, `.export-cdn-notice` |
| ✏️ | `HARNESS/Architecture/moduleDashboard.md` | Seção 7: Sub-Módulo Exportação |
| ✏️ | `HARNESS/Architecture/ProjectStructure.md` | Registrar `xlsxExporter.js` e `masterPassword.js` |

---

### New Error Codes (registrar em `js/constants/errors.js`)

| Código | Tipo | Mensagem ao Usuário |
|---|---|---|
| `GF-EXPORT-VAL-001` | VAL | Selecione ao menos uma opção (Visitantes ou Atendimentos) para exportar. |
| `GF-EXPORT-REG-001` | REG | Não há dados para exportar com os filtros ativos. Limpe os filtros ou registre dados primeiro. |
| `GF-EXPORT-SYS-001` | SYS | O recurso de exportação não está disponível. Verifique a conexão com a internet e recarregue a página. |
| `GF-EXPORT-SYS-002` | SYS | Não foi possível gerar o arquivo de exportação. Tente novamente. |
| `GF-LOCK-VAL-001` | VAL | Senha incorreta. Tente novamente. |
| `GF-LOCK-VAL-002` | VAL | A nova senha deve ter ao menos 6 caracteres. |
| `GF-LOCK-VAL-003` | VAL | A nova senha e a confirmação não coincidem. Verifique e tente novamente. |
| `GF-LOCK-SYS-001` | SYS | Não foi possível processar a senha. Seu navegador pode não suportar esta funcionalidade. |

---

### Colunas das Abas XLSX

**Aba "Visitantes"** (1 linha = 1 visitante filtrado):
`ID` · `Evento` · `Nº Ticket (QR)` · `Nome` · `Gênero` · `Idade` · `Público` · `Telefone` · `QR Responsável` · `Cadastrado em`

**Aba "Atendimentos"** (1 linha = 1 atendimento — sem agrupamento):
`ID` · `Evento` · `Serviço` · `Nº Ticket (QR)` · `Nome do Visitante` · `Gênero` · `Público` · `Atendido em`

Join de atendimentos com visitantes via chave composta: `event_id + '_' + qr_code` (alinhado com lógica existente do Dashboard).

---

### Constraints

- **Não modificar** funções existentes em `dashboardView.js` — apenas adicionar ao final ou como novos blocos.
- **Não modificar** a estrutura de modais já existentes no `index.html`.
- **Não usar npm** — projeto não possui bundler. SheetJS exclusivamente via CDN.
- **Não expor** a senha padrão em nenhuma mensagem, label, placeholder ou comentário visível ao usuário.
- **Não usar `required`** nativo do HTML5 nos inputs de senha — seguir padrão do projeto (`fieldErrors` manual + toast).
- **Respeitar z-index hierárquico** do `UiDesignSystem.md`: modais de exportação em `z-index: 9999`, sub-modais em `10000`, toasts em `99999`.

---

### Acceptance Criteria

| # | Cenário | Resultado Esperado |
|---|---|---|
| 1 | Clicar "Exportar" no Dashboard | Abre `#exportAuthModal` (campo de senha) |
| 2 | Digitar senha errada | Campo em vermelho + toast `GF-LOCK-VAL-001` |
| 3 | Digitar senha correta | Abre `#exportModal` com contagens dos dados filtrados |
| 4 | SheetJS CDN indisponível | Toast `GF-EXPORT-SYS-001` ao confirmar |
| 5 | Ambos toggles desativados + confirmar | Toast `GF-EXPORT-VAL-001` |
| 6 | Exportar apenas Visitantes | `.xlsx` com 1 aba "Visitantes" |
| 7 | Exportar apenas Atendimentos | `.xlsx` com 1 aba "Atendimentos" |
| 8 | Exportar ambas as abas | `.xlsx` com 2 abas na ordem: Visitantes → Atendimentos |
| 9 | Nome do arquivo gerado | Formato `GiraFila_01-10-2026_1800.xlsx` |
| 10 | Com filtro de evento ativo | Exportação contém apenas dados do evento filtrado |
| 11 | Aviso de internet no modal | Banner `.export-cdn-notice` visível em `#exportModal` |
| 12 | Botão `#btnExportLock` na session-bar | Abre `#changePwdModal` ao lado do botão Wi-Fi |
| 13 | Alterar senha com senha atual errada | Toast `GF-LOCK-VAL-001` |
| 14 | Alterar senha com nova senha < 6 chars | Toast `GF-LOCK-VAL-002` |
| 15 | Alterar senha com confirmação divergente | Toast `GF-LOCK-VAL-003` |
| 16 | Alterar senha com dados válidos | Toast de sucesso + nova senha funciona na próxima exportação |

---

# MASTER AGENT DIRECTIVE

Refer to `AGENTS.md` in the project root directory for all operational instructions, coding standards, harness routing, test credentials, and session end protocols.

Do not bypass the directives established in `AGENTS.md` and the `HARNESS/` directory under any circumstances.