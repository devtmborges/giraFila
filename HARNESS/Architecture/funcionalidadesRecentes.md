# Current Version Features

> Documentação das funcionalidades incluídas na versão atual do GiraFila.

- **Current Version:** v0.7.0-family-modal
- **Last Updated:** 2026-10-02

---

## Feature Overview

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