# Módulo: Painel Analítico (Dashboard) — Arquitetura e Especificação Técnica

> Documentação técnica do módulo Dashboard (Tela 5) do GiraFila.
> Alinhado com `HARNESS/Architecture/ProjectStructure.md`, `DatabaseAndRls.md`, `TimeAndDates.md` e `ErrorGovernance.md`.

---

## 1. Visão Geral e Responsabilidade

O **Painel Analítico (Dashboard)** é a interface de consolidação de dados estratégicos do GiraFila. Ele agrega informações de participantes cadastrados na recepção e atendimentos realizados nos postos em tempo real, permitindo aos coordenadores e voluntários acompanhar o impacto da ação social.

- **Arquivo da View:** `js/views/dashboardView.js`
- **Shell / Aba:** `#tabDashboard` em `index.html` (botão `<span>📊</span> <span>Dashboard</span>`)
- **Dependências Externas:** Zero. Todos os gráficos e componentes são renderizados nativamente via HTML, CSS e SVG inline.
- **Suporte Dual-Layer:** Opera tanto conectado à API central LAN (`api.php` SQLite) quanto offline no navegador (`IndexedDB`).

---

## 2. Filtros Globais e Reatividade

O painel conta com uma barra superior de filtros com recálculo instantâneo in-memory:

| Filtro | Seletor | Opções | Comportamento quando vazio |
|---|---|---|---|
| **🎉 Evento** | `#dashFilterEvent` | Todos os eventos cadastrados | Consolida dados de **todos os eventos** simultaneamente |
| **🎯 Serviço** | `#dashFilterService` | Serviços do evento selecionado (ou todos) | Exibe total de atendimentos de todos os postos |
| **⚧️ Gênero** | `#dashFilterGender` | Feminino, Masculino | Inclui todos os gêneros (incluindo não informados) |
| **👶 Público** | `#dashFilterPublic` | Crianças, Adultos | Inclui crianças e adultos |

### Regras de Interação dos Filtros:
1. **Filtros Não Alimentados (Padrão):** Trazem totais gerais consolidados para todos os cards e indicadores da página.
2. **Cascata Inteligente (Anti-Orphan):** Ao alterar o filtro de *Evento*, o seletor de *Serviço* é resetado automaticamente para evitar manter selecionado um serviço que não pertence ao novo evento.
3. **Badge de Contexto:** Um badge visual no topo (`#dashFilterBadge`) exibe em tempo real o resumo textual dos filtros ativos ou indica: *"Exibindo totais gerais de todos os eventos"*.
4. **Botão Limpar:** `#dashBtnClearFilters` redefine todos os filtros para o estado neutro global e reprocessa a visão.
5. **Atualização Reativa:** A view responde automaticamente à troca de abas (`switchTab('tabDashboard')`), alteração de sessão (`onSessionChange`) e ao botão manual de atualização (`#dashBtnRefresh`).
6. **Experiência Mobile (`max-width: 640px`):**
   - **Filtros Colapsáveis:** Botão retrátil `#dashBtnToggleFilters` com chevron e rótulo dinâmico (*Ocultar Filtros* / *Exibir Filtros*), além de suporte a toque direto no badge de contexto.
   - **Grid 2x2 com Limpar Full-Width:** Disposição de Evento + Serviço na linha 1, Gênero + Público na linha 2, e botão Limpar expandido na linha 3.
   - **Grid de Indicadores 2+2+1:** Reorganização dos 5 KPIs com cards pareados (Visitantes + Atendimentos na linha 1; Média Crianças + Média Atendimentos na linha 2) e o card destaque de Taxa de Cobertura abrangendo a largura total na base (linha 3).

---

## 3. Indicadores e Fórmulas de Cálculo

Todas as métricas são calculadas pela função pura `computeMetrics()` em `dashboardView.js`:

### 3.1 Total de Visitantes (`#dashKpiVisitors`)
- **Fórmula:** `COUNT(filteredVisitors)`
- **Semântica com filtro de Serviço:** Quando um serviço específico está selecionado, o card reflete os visitantes atendidos naquele serviço específico, preservando a coerência visual.

### 3.2 Atendimentos Realizados (`#dashKpiAttendances`)
- **Fórmula:** `COUNT(demographicAttendances)`
- Considera os atendimentos registrados nos postos respeitando os filtros demográficos aplicados ao visitante.

### 3.3 Taxa de Cobertura (`#dashKpiCoverage`)
- **Fórmula:** `ROUND((uniqueAttendedVisitors / baseVisitors) * 100)%`
- **Subtexto:** `dashKpiCoverageSub` exibe `X de Y participantes`.
- **Proteção:** Divisão protegida contra zero quando `baseVisitors === 0`.

### 3.4 Média de Atendimentos por Participante (`#dashKpiAvgAttendances`)
- **Fórmula:** `totalAttendances / uniqueAttendedVisitors` (formatado com 1 casa decimal: `X.X`).
- Representa a média de serviços que cada visitante efetivamente utilizou na ação social.

### 3.5 Média de Crianças por Responsável (`#dashKpiGuardian`)
- **Fórmula:** `totalChildrenWithGuardian / uniqueGuardians` (formatado com 1 casa decimal: `X.X`).
- **Subtexto:** Exibe `X crianças • Y responsáveis`.
- **Fallback amigável:** Caso o filtro de público esteja definido para "Adultos", exibe amigavelmente `(Filtro: apenas adultos)` sem gerar `NaN` ou `0.0` incorreto.

### 3.6 Acessibilidade Digital (`#dashPhoneRate`)
- **Fórmula:** `ROUND((adultsWithPhone / totalAdults) * 100)%`
- Base de cálculo restrita aos **adultos** cadastrados (crianças não possuem campo de telefone próprio).

---

## 4. Visualizações e Gráficos

### 4.1 Proporção de Público (Crianças vs Adultos)
- Exibe contadores absolutos e porcentagens de crianças e adultos.
- Barra horizontal proporcional empilhada (`.dash-pub-bar` com classes `--children` e `--adults`).

### 4.2 Ranking de Serviços Mais Utilizados
- Lista ordenada descendentemente por quantidade de atendimentos registrados.
- Pódios visuais com medalhas (🥇 1º, 🥈 2º, 🥉 3º) e barras de progresso proporcionais ao líder.
- Destaque com borda e fundo ativo (`.dash-rank-row--hl`) quando o serviço está selecionado no filtro global.

### 4.3 Distribuição por Gênero
- Gráfico de barras horizontais com distribuição entre:
  - `Feminino` (rosa / `#ec4899`)
  - `Masculino` (azul / `#3b82f6`)
  - `Não Informado` (cinza / `#94a3b8`)

### 4.4 Distribuição por Faixa Etária
Segmentação em 7 faixas etárias baseadas na idade cadastrada:
1. `0 – 6 anos (1ª Infância)`
2. `7 – 12 anos (Criança)`
3. `13 – 17 anos (Adolescente)`
4. `18 – 29 anos (Jovem)`
5. `30 – 59 anos (Adulto)`
6. `60+ anos (Idoso)`
7. `Não Informada`

### 4.5 Fluxo de Atendimentos por Hora
- Gráfico de colunas SVG nativo renderizado em tempo real.
- Eixo horizontal com as horas do dia baseadas no fuso horário local do navegador (`new Date(created_at).getHours()`).
- Coluna com pico máximo de atendimento destacada em cor quente (`#f2994a`).

---

## 5. Tratamento de Casos de Borda e Lacunas Mitigadas

1. **Gargalo Relacional do QR Code (Multi-Evento):**
   O `qr_code` é único por evento, mas não globalmente no banco de dados. A junção entre `attendances` e `visitors` é realizada utilizando **chave composta** `event_id + '_' + qr_code`, garantindo integridade absoluta nos totais consolidados.
2. **Tratamento de Idade Zero (Bebês):**
   Verificação de idade estrita contra `null`, `undefined` e `''`. Participantes com `age === 0` são alocados com precisão na faixa "0 – 6 anos" (1ª Infância) em vez de caírem em "Não Informada".
3. **Divisão por Zero:**
   Todas as frações (médias, porcentagens e taxas) possuem fallback para zero ou strings amigáveis, impedindo a exibição de `NaN` ou `Infinity`.
4. **Mobile-First e Scroll Horizontal Zero:**
   Layout construído com `grid` e `minmax` com `min-width: 0`, garantindo renderização limpa e legível em qualquer dispositivo móvel a partir de 320px de largura.

---

## 6. Governança de Erros e Telemetria

- **Código de Erro:** `GF-DASH-SYS-001` (definido no catálogo SSOT `js/constants/errors.js`).
- **Disparo:** Capturado no bloco `try/catch` de `loadAndRender()`, exibindo toast amigável ao usuário caso haja falha de conexão ou leitura no IndexedDB.
