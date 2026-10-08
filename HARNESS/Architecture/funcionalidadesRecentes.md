# Current Version Features

> Documentação das funcionalidades incluídas na versão atual do GiraFila.

- **Current Version:** v0.8.0-multi-adult-family
- **Last Updated:** 2026-10-08

---

## Feature Overview

### Módulo: Menu Secreto com Autenticação Mestre & Limpeza Hierárquica de Dados (v0.8.1)
- **Gatilho de Ativação Oculto**:
  - Acionado pelo clique de 5 vezes na aba "Dashboard" em um intervalo de até 10 segundos (janela deslizante no `js/app.js`).
  - Protegido por solicitação prévia de **Senha Mestre** validada com Web Crypto API (`js/utils/masterPassword.js`).
- **Modal do Menu Secreto (`#secretMenuBackdrop`)**:
  - Modal estilizado com tema de segurança/administração e alerta de irreversibilidade.
  - Quatro toggles independentes com contagem em tempo real de registros presentes no banco:
    - Atendimentos (`#cleanToggleAttendances`)
    - Visitantes (`#cleanToggleVisitors`)
    - Serviços (`#cleanToggleServices`)
    - Eventos (`#cleanToggleEvents`)
  - Seleção em cascata automática garantindo integridade relacional:
    - Marcar Eventos seleciona automaticamente Serviços, Visitantes e Atendimentos.
    - Marcar Serviços ou Visitantes seleciona automaticamente Atendimentos.
    - Desmarcar Atendimentos desmarca Serviços, Visitantes e Eventos.
- **Sequência Hierárquica Antiórfãos de Exclusão**:
  - Exclusão rigorosa na ordem: 1º Atendimentos, 2º Visitantes (um grupo familiar por vez: crianças primeiro, depois dependentes vinculados, depois adultos responsáveis), 3º Serviços, 4º Eventos.
  - Expurgo físico de `audit_logs` e execução obrigatória de `VACUUM` no SQLite, garantindo zero retenção por tags e compactação imediata do arquivo `girafila.db`.
  - Suporte total dual-mode: SQLite LAN via `api.php?entity=clean` e fallback local IndexedDB via `purgeEntities()`.
- **Menu Secreto como Hub Administrativo & Modais Exclusivos**:
  - Menu Secreto estruturado como hub limpo com cards de ação: **Exportação de Dados** e **Limpeza de Dados**.
  - Operação de exclusão desacoplada em modal exclusivo com os 4 toggles, contadores reais e alerta de irreversibilidade.
  - Botão `#dashBtnExport` removido do cabeçalho aberto do Dashboard (`index.html`).
  - Navegação bidirecional: botões **"Voltar"** tanto no modal de exportação quanto no modal de limpeza retornam diretamente ao Menu Secreto.
  - Janela do contador do Menu Secreto ajustada para 10 segundos (5 cliques na aba Dashboard).
- **Novos Códigos de Erro no Catálogo SSOT**: `GF-CLEAN-VAL-001`, `GF-CLEAN-SYS-001`.


### Módulo: Grupo Familiar com Múltiplos Adultos & Ajustes de UI na Recepção (v0.8.0)
- **Toggle de Grupo Familiar (`#visitorIsFamily`)**:
  - Novo toggle na tela de Recepção, posicionado abaixo do toggle de criança (`#visitorIsChild`).
  - **Exclusividade mútua**: ativar um toggle desativa o outro automaticamente.
  - Estados possíveis: Criança | Grupo Familiar (adulto co-responsável) | Adulto solo.
- **Campo de vinculação entre adultos (`#visitorFamilyContainer` / `#visitorFamilyQr`)**:
  - Exibido apenas quando o toggle Grupo Familiar está ativo.
  - Posicionado acima do campo de telefone.
  - Rótulo: "Vincular a outro adulto?".
  - Validação em tempo real (debounce 300ms): verifica existência no evento, impede auto-referência e bloqueia ticket de criança.
  - Persiste o ticket do outro adulto em `guardian_qr_code` do novo registro, reutilizando o campo existente.
- **Toggle "Não possui telefone" (`#visitorNoPhone`)**:
  - Substituiu o checkbox inline no label por um componente toggle switch (`.toggle-switch`) padronizado.
  - Movido para baixo do campo de telefone, tanto na tela principal quanto no modal de edição.
- **Resolução de Grupo Familiar por BFS Bidirecional**:
  - `familyModal.js` e `familySearch.js` atualizado para resolver grupos com múltiplos adultos co-vinculados via BFS sobre `guardian_qr_code`.
  - Badge diferenciado: adulto com `guardian_qr_code` exibe "Adulto (Co-Responsável)" no modal.
  - "Vinculado ao Ticket: #X" exibido como pill de detalhe para adultos co-responsáveis.
- **Restrição de Exclusão Expandida**:
  - Bloqueia exclusão de qualquer participante (criança ou adulto) cujo ticket seja referenciado por `guardian_qr_code` de outro membro (error `GF-VISIT-REG-005`).
  - Aplica-se tanto no frontend (IndexedDB) quanto na API PHP.
- **Expurgo Físico Real de Registros no Banco de Dados (girafila.db & IndexedDB)**:
  - Eliminação da retenção de registros excluídos via "tag" ou log de auditoria no banco (`audit_logs`).
  - Ao excluir um participante, atendimento, serviço ou evento, todos os registros relacionados em `audit_logs` são expurgados física e definitivamente.
  - Ativação de `PRAGMA secure_delete = ON` no SQLite para sobrescrever bytes de registros deletados com zeros no arquivo de disco.
  - Execução automática de `VACUUM` após cada exclusão bem-sucedida no SQLite (`api.php`), liberando as páginas livres e compactando fisicamente o arquivo `girafila.db`.
  - Tratamento idêntico no armazenamento local (IndexedDB), com remoção por cursor de entradas de auditoria referentes ao ID excluído.
- **Novos Códigos de Erro**: `GF-VISIT-VAL-007`, `GF-VISIT-REG-006`. Atualização semântica de `GF-VISIT-REG-005`.

### Módulo: Visualização de Grupo Familiar & Histórico de Atendimentos (v0.7.0)
- **Cards Interativos e Clicáveis**:
  - Na tela de **Recepção/Visitantes** (`#registeredVisitorsList`): Cards `.data-item--clickable` com indicação visual (`.data-item-family-hint`), permitindo abrir a visão familiar completa sem interferir nos botões de edição e exclusão.
  - Na tela de **Atendimento**:
    - `#attendanceParticipantCard`: O card de prévia dinâmica exibido ao digitar ou escanear o ticket passa a ser interativo e clicável, permitindo ao operador conferir a família do participante em atendimento.
    - `#recentAttendancesList`: Cards de histórico recente no posto passam a ser clicáveis para rápida consulta do grupo familiar.
- **Modal de Grupo Familiar (`familyModal.js`)**:
  - Resumo de métricas da família: Total de membros, contagem de adultos, contagem de crianças e total de atendimentos realizados pelo grupo no evento.
  - Cartões detalhados por membro com diferenciação visual entre **Adulto Responsável** e **Criança / Dependente**.
  - Histórico transparente de atendimentos no evento por participante (postos frequentados e horários).
  - Ação operacional rápida no modo de atendimento: botão "Atender Ticket #..." para carregar o participante diretamente no fluxo de atendimento com um único clique.
  - **Fechamento Ergonômico**: O modal fecha automaticamente ao clicar fora da área do diálogo (no backdrop), ao pressionar a tecla `ESC` ou ao clicar nos botões de fechar.
- **Governança de Erros**: Registro e uso dos códigos `GF-VISIT-REG-003`, `GF-VISIT-REG-004` e `GF-VISIT-REG-005`.

### Módulo: Segurança Operacional & Restrições de Exclusão (v0.7.0)
- **Bloqueio de Exclusão com Vínculos Ativos**:
  - Visitantes com atendimentos registrados no evento ativo não podem ser excluídos (`GF-VISIT-REG-004`).
  - Visitantes adultos que sejam responsáveis por crianças cadastradas no evento ativo não podem ser excluídos (`GF-VISIT-REG-005`).
  - Validações implementadas tanto no frontend (`visitorView.js`) quanto na API backend (`api.php`).
- **Autenticação via Senha Mestre para Exclusões**:
  - Exclusão de Visitantes (`confirmDeleteVisitor`), Eventos (`confirmDeleteEvent`) e Serviços (`confirmDeleteService`) passam a exigir a digitação da senha mestre configurada no sistema via `verifyPassword()`.
  - Campo inline de senha com auto-foco, suporte a tecla Enter para confirmação rápida e feedback visual com classes `.form-input--error`.
- **Interface e Ergonomia do Scanner de Câmera**:
  - Ocultação dos botões de escanear câmera (`#btnScanQr`, `#btnScanVisitorQr`, `#btnScanGuardianQr`) via estilo inline `display: none`, mantendo os elementos no DOM para rápida reativação futura e priorizando digitação do número de ticket.
- **Correção de Timezone Operacional**:
  - Implementação de `formatUtcDisplayDateTime` em `sanitizer.js` para renderizar timestamps operacionais (`created_at`) no fuso local do usuário sem offset indevido de +3h.

### Módulo: Contexto Operacional & Tags de Sessão (v0.6.0)
- **Tags Clicáveis de Contexto nas Telas**:
  - `#attendanceServiceTagBtn`: Exibida no cabeçalho do card de Atendimento mostrando o Posto/Serviço ativo.
  - `#visitorEventTagBtn`: Exibida no cabeçalho do card de Recepção/Visitantes mostrando o Evento ativo.
  - Estado visual `.is-empty` com destaque em cor de alerta (âmbar com borda tracejada) quando o contexto não estiver selecionado.
  - Sincronização reativa em tempo real com `updateSessionBar()`.
- **Modais Exclusivos de Contexto**:
  - Modal Exclusivo de Evento (`#eventContextModalBackdrop`): Acionado ao clicar nas tags de Evento (`#btnSelectEventContext` e `#visitorEventTagBtn`), permitindo troca ágil do evento com reset do serviço em caso de alteração.
  - Modal Exclusivo de Serviço (`#serviceContextModalBackdrop`): Acionado ao clicar nas tags de Serviço (`#btnSelectServiceContext` e `#attendanceServiceTagBtn`), exibindo o evento ativo como contexto e listando apenas serviços pertinentes.
  - Modal combinado original mantido no fluxo de inicialização/recarga forçada (`openSessionModal(forced)`).
- **Padronização de Nomenclatura**: Adequação de textos na tela de Recepção e KPIs de Atendimento para "Visitante" (em substituição a "Participante").

### Módulo: Painel Analítico / Dashboard (Tela 5) (v0.4.0)
- **Filtros Globais Reativos**: Barra superior com filtros de Evento (`#dashFilterEvent`), Serviço (`#dashFilterService`), Gênero (`#dashFilterGender`) e Público (`#dashFilterPublic`). Filtros não alimentados trazem totais gerais consolidados de toda a base.
- **Cascata Anti-Órfão**: Trocar o evento reseta automaticamente a seleção de serviço.
- **Badge Dinâmico de Filtro**: Mostra o resumo textual dos filtros ativos ou badge neutro indicando visão global.
- **KPIs Estratégicos**:
  - Total de Visitantes (dinâmico com contexto do serviço)
  - Atendimentos Realizados (respeitando filtros demográficos)
  - Taxa de Cobertura de público com contadores absolutos de atendidos
  - Média de Atendimentos por Participante atendido
  - Média de Crianças por Responsável com subtexto detalhado e fallback amigável
- **Proporção de Público**: Comparativo Crianças vs Adultos com contadores e barra empilhada proporcional.
- **Ranking de Serviços Mais Utilizados**: Pódio com medalhas (🥇, 🥈, 🥉), barras relativas e destaque ativo (`dash-rank-row--hl`).
- **Gráficos Demográficos**:
  - Gênero: Barras horizontais para Feminino, Masculino e Não Informado.
  - Faixas Etárias: 7 faixas etárias padrão com tratamento estrito para bebês (`age === 0`).
- **Fluxo de Atendimentos por Hora**: Gráfico SVG inline responsivo baseado no horário local.
- **Acessibilidade Digital**: Taxa e proporção de adultos com/sem telefone cadastrado.
- **Zero Dependências**: Gráficos construídos puramente em CSS e SVG sem bibliotecas externas pesadas.

### Módulo: UI Shell — Cabeçalho Compacto (v0.3.0)
- **Remoção do `.app-header`**: A barra branca superior foi eliminada, recuperando ~57px de espaço vertical — especialmente relevante em dispositivos móveis.
- **`session-bar` promovido a `<header>`**: A barra azul de contexto ativo passa a ser o único cabeçalho fixo (`top: 0`, `z-index: var(--z-header)`).
- **Indicadores de contexto viram botões interativos**:
  - `#btnSelectEventContext` — clique foca o dropdown de evento no modal de sessão.
  - `#btnSelectServiceContext` — clique foca o dropdown de serviço no modal de sessão.
- **Botão `📶 Rede Wi-Fi` incorporado** ao `session-actions` (lado direito da barra azul), eliminando a necessidade de um cabeçalho separado para acomodar esse atalho.
- **Layout responsivo preservado**: em telas < 640px os pill-buttons empilham verticalmente dentro de `.session-info`; o botão Wi-Fi permanece compacto à direita sem overflow horizontal.

### Módulo: Gestão de Eventos (Tela 2)
- `createEvent` — Cadastro de eventos com nome, data, local e descrição.
- `updateEvent` — Edição modal com validação e sincronização do contexto de sessão ativo.
- `deleteEvent` — Exclusão protegida: bloqueia remoção se houver serviços ou visitantes vinculados (`GF-EVENT-REG-001`).

### Módulo: Gestão de Serviços (Tela 3)
- `createService` — Cadastro com busca preditiva de eventos, seleção de público (crianças/adultos) e responsável.
- `updateService` — Edição modal completa (nome, evento vinculado, público, atendente e descrição).
- `deleteService` — Exclusão protegida: bloqueia remoção se houver atendimentos vinculados (`GF-SERV-REG-001`).

### Módulo: Cadastro de Participantes / Visitantes (Tela 1)
- `createVisitor` — Cadastro com validação de QR Code único por evento, campos obrigatórios de Gênero (`Masculino`/`Feminino`) e Idade (`0 a 120 anos`), e validação de vínculo responsável adulto/criança.
- `updateVisitor` — Edição modal de nome, gênero, idade e telefone. QR Code e `event_id` são imutáveis para integridade do ticket físico.
- `deleteVisitor` — Exclusão com confirmação e telemetria de auditoria (`logAudit`).

### Módulo: Atendimento Operacional (Tela 4)
- `createAttendance` — Confirmação de atendimento operacional com bloqueio antifraude contra duplicidade (`GF-ATTEND-REG-002`) e validação de público.
- `deleteAttendance` — Exclusão/cancelamento de atendimento registrado no posto com confirmação modal e telemetria (`logAudit`), liberando o participante para ser atendido novamente caso o atendimento anterior tenha sido gravado por equívoco.

---

## Known Limitations & Planned Improvements

- **Imutabilidade de Ticket**: O QR Code e vínculo de evento do visitante não podem ser editados após a criação para evitar descompasso com o ticket físico emitido. Caso necessário, o registro deve ser excluído e recadastrado.
- **Cascata Manual**: Não há exclusão em cascata automática; exclusões de eventos e serviços exigem remoção prévia das entidades dependentes para segurança dos dados.