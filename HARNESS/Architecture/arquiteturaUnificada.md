# Technical Architecture — GiraFila

This file documents the technical architecture of **GiraFila**.

---

## 1. Stack Overview

- **Language / Runtime:** HTML5, CSS3, JavaScript Vanilla (ES6+ Modules), zero external runtime dependencies.
- **Framework:** Nenhum (Vanilla JS puro para máxima portabilidade, autonomia e performance).
- **Database:** IndexedDB (armazenamento estruturado local no navegador, suporte assíncrono nativo).
- **Hosting / Infrastructure:** Execução local estática (qualquer servidor HTTP simples como PHP CLI, Python http.server ou abertura direta na LAN).
- **Hardware Integrations:** Câmera do dispositivo via `BarcodeDetector` / `getUserMedia` para leitura direta de QR Codes.

## 2. Directory Structure

```text
GiraFila/
├── index.html                   # Shell da aplicação: Header, Session Bar, Abas, Containers, Modals
├── css/
│   ├── variables.css            # Tokens de design (Cores, Z-index tiers, Tipografia, Espaçamentos)
│   ├── base.css                 # Reset, Mobile First, tipografia base, scroll horizontal prevenido
│   └── components.css           # Estilos de cards, inputs, toggles, botões, modais, toasts, badges
├── js/
│   ├── constants/
│   │   ├── errors.js            # Catálogo Centralizado de Erros (SSOT)
│   │   └── zIndex.js            # Constantes de camadas z-index conforme UiDesignSystem.md
│   ├── services/
│   │   ├── storageService.js    # Camada IndexedDB (Events, Services, Visitors, Attendances, AuditLogs)
│   │   ├── auditService.js      # Serviço de telemetria/auditoria local
│   │   └── errorHandler.js      # Resolução de códigos de erro e disparo de toasts/modais
│   ├── utils/
│   │   ├── sanitizer.js         # Sanitização XSS, capitalização e formatação (Telefone, Nomes)
│   │   └── qrScanner.js         # Wrapper de leitura QR Code via BarcodeDetector / Câmera
│   ├── views/
│   │   ├── sessionModal.js      # Modal de seleção obrigatória de Evento e Serviço da sessão
│   │   ├── visitorView.js       # Tela 1: Cadastro de Visitantes (Adulto / Criança + Responsável)
│   │   ├── eventView.js         # Tela 2: Gestão de Eventos (Cadastro e Listagem)
│   │   ├── serviceView.js       # Tela 3: Gestão de Serviços (Cadastro com busca inteligente de evento)
│   │   └── attendanceView.js    # Tela 4: Registro de Atendimento Operacional (Prevenção de duplicidade)
│   └── app.js                   # Inicialização, roteamento simples de abas e estado da sessão
└── HARNESS/                     # Diretrizes de engenharia, governança e arquitetura
```

## 3. Server & Routing Conventions

- **SPA sem recarregamento:** Alternância de abas por controle de visibilidade (`.view-panel.active`).
- **Sessão Persistente:** Objeto global de sessão contendo `eventId`, `eventName`, `serviceId`, `serviceName`.
- **Zero Servidores de Backend:** A lógica de negócio e validação reside inteiramente no cliente.

## 4. Environment Variables

- Nenhuma variável de ambiente necessária; aplicação 100% autossuficiente e portátil.

## 5. Architecture Gotchas & Known Constraints

- **Restrição de Câmera:** O acesso a câmeras via `navigator.mediaDevices.getUserMedia` requer contexto seguro (`localhost`, `127.0.0.1` ou HTTPS). Em caso de restrição em rede local sem HTTPS, a digitação numérica do ticket (1 a 9999) funciona como fallback transparente.
- **Unicidade de Ticket por Evento:** Um mesmo ticket físico (1 a 9999) pode ser reutilizado em eventos diferentes, mas dentro do mesmo evento o vínculo com o participante é estritamente exclusivo.