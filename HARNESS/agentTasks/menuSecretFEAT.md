# Engineering Pillars (Golden Rules):
- **YAGNI:** You Aren't Gonna Need It — don't build what isn't required now.
- **KISS:** Keep It Simple, Stupid — choose the simplest correct solution.
- **DRY:** Don't Repeat Yourself — single source of truth for every piece of logic.
- **No Over-Engineering:** Avoid premature abstractions and speculative generalization.
- **No Horizontal Scroll:** Data containers on mobile MUST stack gracefully, never overflow.
- **Mobile First:** Write default styles for mobile, scale up to desktop.

---

# FEAT — Menu Secreto com Autenticação Mestre & Limpeza de Dados

## Goal

Disponibilizar um **Menu Secreto** acionado pelo clique de **5 vezes na aba "Dashboard" no intervalo de até 10 segundos**, protegido por solicitação obrigatória da **Senha Mestre**, exibindo um modal exclusivo para **Limpeza Física de Dados** com toggles seletivos para Atendimentos, Visitantes, Serviços e Eventos.

---

## Context & Background

Para fins de manutenção, testes de campo e preparação de novos eventos, a equipe precisa de um recurso rápido e seguro para zerar dados específicos do banco sem necessidade de acesso manual via terminal ou exclusão do arquivo `.db`. Como se trata de uma ação altamente destrutiva, ela deve permanecer oculta no fluxo comum de operação (via gatilho de 5 cliques) e protegida pela senha mestre do sistema.

- **Arquivos relacionados:**
  - `index.html` (shell da SPA e botão de aba `data-tab="tabDashboard"`)
  - `js/app.js` (orquestrador de navegação e listeners das abas)
  - `js/views/secretMenuModal.js` (novo módulo: modal de senha e modal do menu secreto)
  - `js/services/storageService.js` (camada de persistência dual LAN SQLite / IndexedDB)
  - `js/utils/masterPassword.js` (verificação criptográfica via Web Crypto API)
  - `api.php` (API central SQLite com endpoint de limpeza e VACUUM)
  - `js/constants/errors.js` (catálogo centralizado SSOT de erros)
- **Códigos de erro relacionados:**
  - `GF-LOCK-VAL-001` (Senha mestre incorreta)
  - `GF-CLEAN-VAL-001` (Nenhum toggle selecionado para limpeza)
  - `GF-CLEAN-SYS-001` (Falha técnica na limpeza de dados)
- **Endpoints relacionados:**
  - `POST api.php?entity=clean`

---

## Scope & Constraints

### In Scope:
1. **Gatilho de Ativação:**
   - Janela deslizante de 10 segundos monitorando cliques no botão da aba Dashboard (`.tab-btn[data-tab="tabDashboard"]`).
   - Ao registrar o 5º clique dentro da janela, o contador é resetado e o fluxo de autenticação é iniciado.
   - O contador é resetado após 10 segundos do primeiro clique sem que o usuário tenha clicado 5 vezes.
2. **Autenticação Prévia Obrigatória:**
   - Diálogo modal solicitando a **Senha Mestre**.
   - Validação criptográfica via `verifyPassword(pwd)` antes de liberar o acesso.
   - Feedback visual de erro inline e foco no input em caso de senha incorreta.
3. **Modal do Menu Secreto (Limpeza de Dados):**
   - Header temático de segurança/administração e botão de fechar.
   - Alerta visual destacado informando sobre a irreversibilidade da ação.
   - Quatro toggles com contadores em tempo real da quantidade de registros atuais no banco:
     - [ ] **Atendimentos** (`#cleanToggleAttendances`)
     - [ ] **Visitantes** (`#cleanToggleVisitors`)
     - [ ] **Serviços** (`#cleanToggleServices`)
     - [ ] **Eventos** (`#cleanToggleEvents`)
   - Regras de integridade relacional com seleção em cascata automática:
     - Marcar **Eventos** marca automaticamente **Serviços**, **Visitantes** e **Atendimentos**.
     - Marcar **Serviços** ou **Visitantes** marca automaticamente **Atendimentos**.
   - Botão de ação perigosa *"Executar Limpeza"* (`btn-danger`).
   - Modal secundário de confirmação final rápida antes de efetivar o expurgo.
4. **Sequência Hierárquica Obrigatória de Exclusão (Antiórfãos & Integridade):**
   - Para garantir que não hajam registros órfãos ou quebras de integridade relacional em casos de interrupções da tarefa, a execução respeitará rigidamente a ordem:
     - **1º Atendimentos**: Removidos primeiro para liberar qualquer vínculo dependente com participantes ou postos.
     - **2º Visitantes**: Excluídos **um grupo familiar por vez**, expurgando rigorosamente **primeiro as crianças e dependentes vinculados, e em seguida os adultos responsáveis**, respeitando a regra de negócio que impede apagar um adulto com tickets vinculados ao seu.
     - **3º Serviços**: Removidos após a garantia de que não restam atendimentos vinculados.
     - **4º Eventos**: Removidos por último, após seus serviços e participantes já terem sido limpos.
5. **Expurgo Físico Definitivo (Sem retenção por tags):**
   - No backend (`api.php`), exclusão física das tabelas na ordem correta, exclusão de todos os registros relacionados em `audit_logs` e execução obrigatória de `VACUUM`.
   - No frontend (`storageService.js`), limpeza dos object stores do IndexedDB e de seus logs de auditoria.
   - Redefinição da sessão ativa caso eventos ou serviços ativos sejam excluídos.
   - Atualização imediata de todas as telas operacionais.

### Out of Scope:
- Inclusão de outras ferramentas no menu secreto nesta etapa (diagnóstico de rede ou outros recursos permanecem para iterações futuras conforme diretriz do usuário).
- Alteração do comportamento de navegação das demais abas da aplicação.

### Must Not Break:
- A navegação normal para a aba Dashboard (1 clique continua abrindo o Dashboard normalmente).
- Integridade das chaves estrangeiras e persistência dual (SQLite LAN e IndexedDB local).
- Diretriz de exclusão física: nenhum dado excluído deve permanecer sob tags em `audit_logs` ou páginas não compactadas no SQLite.

---

## Implementation Notes

1. **Janela Deslizante de Cliques ([js/app.js](file:///c:/Users/User/Herd/GiraFila/js/app.js)):**
   ```javascript
   let dashboardClicks = [];
   const DASHBOARD_SECRET_CLICKS = 5;
   const DASHBOARD_SECRET_WINDOW_MS = 10000;
   ```
2. **Backend de Limpeza ([api.php](file:///c:/Users/User/Herd/GiraFila/api.php)):**
   - Rota `case 'clean':` recebendo payload JSON `{ attendances, visitors, services, events }`.
   - Sequência hierárquica estrita:
     1. `attendances`: `DELETE FROM attendances` + expurgo de `audit_logs`.
     2. `visitors`: Exclusão por grupos familiares — expurgo inicial de registros com `guardian_qr_code IS NOT NULL` (crianças e adultos co-responsáveis) seguido dos adultos responsáveis base (`guardian_qr_code IS NULL`), garantindo integridade e zero órfãos.
     3. `services`: `DELETE FROM services` + expurgo de `audit_logs`.
     4. `events`: `DELETE FROM events` + expurgo de `audit_logs`.
   - `$pdo->exec("VACUUM;");` executado ao final.
3. **Módulo de Visualização ([js/views/secretMenuModal.js](file:///c:/Users/User/Herd/GiraFila/js/views/secretMenuModal.js)):**
   - Segregação de responsabilidade (SRP), evitando inchar `app.js`.
   - Consulta assíncrona dos totais de registros atuais para feedback transparente ao operador nos toggles.

---

## Acceptance Criteria

- [x] Clicar 5 vezes na aba Dashboard em até 10 segundos dispara o prompt de senha mestre.
- [x] Cliques com intervalo superior a 10 segundos expiram e não acumulam.
- [x] Digitação de senha incorreta exibe erro `GF-LOCK-VAL-001` e impede a abertura do menu.
- [x] Digitação de senha correta abre o Modal do Menu Secreto com os 4 toggles de limpeza.
- [x] Cada toggle exibe o contador atual de registros presentes na base de dados.
- [x] Marcar o toggle de Eventos marca automaticamente Serviços, Visitantes e Atendimentos.
- [x] Tentar clicar em "Executar Limpeza" sem nenhum toggle selecionado dispara validação `GF-CLEAN-VAL-001`.
- [x] Confirmação de limpeza executa o expurgo físico completo no SQLite (`api.php`) e no IndexedDB.
- [x] A exclusão respeita estritamente a hierarquia antiórfãos: 1º Atendimentos, 2º Visitantes (crianças/dependentes antes de adultos por grupo familiar), 3º Serviços, 4º Eventos.
- [x] Tabela `audit_logs` é limpa para as entidades expurgadas, sem retenção de "tags" de deleção.
- [x] Comando `VACUUM` é executado com sucesso e o arquivo `girafila.db` é compactado.
- [x] Telas ativas e contadores de sessão são redefinidos e atualizados sem necessidade de recarregar a página (`F5`).
- [x] Todos os novos códigos de erro (`GF-CLEAN-VAL-001`, `GF-CLEAN-SYS-001`) registrados no Catálogo Central (`errors.js`).
- [x] Revisão de conformidade com `SecurityGovernance.md` e `ErrorGovernance.md` concluída.

---

## Fase 2 — Migração do Botão de Exportação para o Menu Secreto

### Goal:
Mover o botão de exportação de dados (`#dashBtnExport`), anteriormente localizado na barra de ações do Dashboard, para dentro do **Menu Secreto**. Como o acesso ao Menu Secreto já exige autenticação prévia pela Senha Mestre, a exportação fica naturalmente protegida e integrada à central administrativa.

### Scope & Architecture:
1. **Remoção no Dashboard ([index.html](file:///c:/Users/User/Herd/GiraFila/index.html)):**
   - Remover `#dashBtnExport` da barra de ações do Dashboard (`.dash-header-btns`).
   - Manter apenas `#dashBtnRefresh` no cabeçalho do Dashboard.
   - Modal de autenticação intermediário de exportação (`#exportAuthModal`) é tornado obsoleto ou desativado, pois a autenticação mestre já ocorre na entrada do Menu Secreto.
2. **Integração no Menu Secreto ([js/views/secretMenuModal.js](file:///c:/Users/User/Herd/GiraFila/js/views/secretMenuModal.js)):**
   - Adicionar uma seção dedicada à **Exportação de Dados** no corpo do modal do Menu Secreto, posicionada antes da zona perigosa de limpeza.
   - Exibir descrição clara da ação e botão estilizado *"Exportar Dados (.xlsx)"* (`#secretMenuBtnExport`).
   - Ao acionar `#secretMenuBtnExport`, invocar diretamente a abertura do modal de opções de exportação (`openExportModal()`), sem necessidade de redigitar a senha.
3. **Exposição da Abertura do Modal de Exportação ([js/views/dashboardView.js](file:///c:/Users/User/Herd/GiraFila/js/views/dashboardView.js)):**
   - Exportar a função `openExportModal()` para permitir sua chamada a partir de `secretMenuModal.js`.
   - Limpar o listener órfão de `#dashBtnExport` em `dashboardView.js`.

### Pre-Planning Validation:
1. **`HARNESS/Architecture/ErrorGovernance.md`:**
   - Reutilização dos códigos já registrados no catálogo SSOT:
     - `GF-EXPORT-VAL-001` (Nenhuma tabela selecionada)
     - `GF-EXPORT-REG-001` (Nenhum dado com filtros ativos)
     - `GF-EXPORT-SYS-001` (SheetJS indisponível / sem internet)
     - `GF-EXPORT-SYS-002` (Falha na geração do XLSX)
     - `GF-LOCK-VAL-001` (Senha mestre incorreta no acesso ao menu)
2. **`HARNESS/Security/SecurityGovernance.md`:**
   - Elevação do nível de segurança: a exportação de dados deixa de ser uma ação acessível na interface aberta do Dashboard e passa a exigir obrigatoriamente a senha mestre na abertura do Menu Secreto (Zero Trust & Least Privilege).

### Acceptance Criteria — Fase 2:
- [x] Botão `#dashBtnExport` removido do cabeçalho da tela do Dashboard em `index.html`.
- [x] Seção de Exportação de Dados adicionada ao modal do Menu Secreto em `secretMenuModal.js`.
- [x] Botão no Menu Secreto aciona o fluxo de exportação sem solicitar senha adicional (já autenticado).
- [x] Modal de opções de exportação (`#exportModal`) abre normalmente com as opções de Visitantes e Atendimentos e contadores filtrados.
- [x] Geração e download do arquivo `.xlsx` funcionam perfeitamente.
---

## Fase 3 — Modal Exclusivo de Limpeza de Dados (Alinhamento de UX com Exportação)

### Goal:
Tornar o layout do **Menu Secreto** limpo e modular. O modal principal atua como um hub administrativo exibindo as opções disponíveis (Exportação de Dados e Limpeza de Dados). Ao clicar em "Limpar Dados", abre-se um modal dedicado e exclusivo com os toggles e a ação destrutiva, replicando exatamente o padrão de uso da exportação.

### Scope:
1. **Modal Principal do Menu Secreto (`openSecretMenuModal()`):**
   - Design minimalista e elegante (Hub Administrativo).
   - Card 1: **Exportação de Dados** com botão `[ 📥 Exportar .xlsx ]` (`#secretMenuBtnExport`).
   - Card 2: **Limpeza de Dados** com botão `[ 🗑 Limpar Dados ]` (`#secretMenuBtnOpenClean`).
2. **Modal Exclusivo de Limpeza de Dados (`openCleanDataModal()`):**
   - Modal temático de segurança com alerta de irreversibilidade.
   - Quatro toggles hierárquicos com contagens em tempo real (Atendimentos, Visitantes, Serviços, Eventos).
   - Regras de cascata automática e validação `GF-CLEAN-VAL-001`.
   - Diálogo de confirmação final e execução do expurgo físico.

### Acceptance Criteria — Fase 3:
- [x] Menu Secreto principal exibe as opções como cards limpos sem os toggles misturados no corpo.
- [x] Clicar em "Limpar Dados" abre o modal exclusivo de limpeza de dados com os 4 toggles e contagens reais.
- [x] Clicar em "Exportar .xlsx" continua acionando o modal de exportação.
- [x] Regras de cascata, expurgo físico, hierarquia e confirmação permanecem 100% preservadas.

---

# MASTER AGENT DIRECTIVE

Refer to `AGENTS.md` in the project root directory for all operational instructions, coding standards, harness routing, test credentials, and session end protocols.

Do not bypass the directives established in `AGENTS.md` and the `HARNESS/` directory under any circumstances.