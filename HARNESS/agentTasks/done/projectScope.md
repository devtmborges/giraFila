# GiraFila — Especificação de Escopo do Projeto

## 1. Visão Geral e Objetivo
O **GiraFila** é uma aplicação Web leve, descentralizada e autossuficiente (desenvolvida exclusivamente em **HTML5, CSS3 e JavaScript Vanilla**), projetada para operar sem dependências de frameworks pesados (como Node.js ou Next.js) ou infraestrutura complexa de nuvem. 

O sistema foi idealizado para atender a ações sociais voluntárias em comunidades carentes[cite: 4], garantindo o controle rigoroso de fluxo no atendimento a eventos (distribuição de brinquedos, atendimentos médicos/odontológicos, cabeleireiro, etc.)[cite: 4]. O principal objetivo é assegurar que cada participante consuma os serviços e benefícios de forma única por evento[cite: 4], prevenindo fraudes, perdas de fichas[cite: 4] e duplicidade de atendimento.

---

## 2. Requisitos de Arquitetura e Infraestrutura
* **Stack Tecnológica:** HTML5, CSS3 e JavaScript puro (*Vanilla JS*).
* **Ausência de Dependências Externas:** Sem necessidade de instalações complexas, servidores Node.js ou hospedagem externa. Pode rodar via servidor HTTP estático local leve.
* **Acesso em Rede Local (LAN):** Acessível por múltiplos dispositivos (smartphones, tablets, notebooks) conectados à mesma rede Wi-Fi local através do IP da máquina anfitriã.
* **Persistência de Dados:** Banco de dados SQL leve executado no navegador (ex: SQLite via WebAssembly/sql.js ou IndexedDB estruturado).
* **Público-Alvo:** Utilização restrita à equipe de voluntários da instituição[cite: 4].

---

## 3. Regras de Negócio Centrais
1. **Seleção de Contexto por Sessão:** Ao abrir a aplicação no dispositivo, o voluntário seleciona obrigatoriamente o **Evento** ativo e, em seguida, o **Serviço** que irá operar[cite: 4].
2. **Ciclo de Vida dos Tickets (QR Code 1 a 9999):** Os visitantes recebem na entrada um ticket físico contendo um código QR numerado de **1 a 9999**. O vínculo entre o visitante e o código QR é **exclusivo e temporário para o evento atual**, permitindo que o mesmo ticket seja reciclado em dias ou eventos diferentes, reduzindo riscos em caso de perda ou extravio[cite: 4].
3. **Validação de Dependentes (Crianças):** Menores de idade (`Criança = true`) devem ser vinculados obrigatoriamente ao número do QR Code de um adulto responsável (`Criança = false`). O sistema valida de forma automática a existência do QR e se o mesmo pertence de fato a um adulto cadastrado.

---

## 4. Módulos e Telas Principais do MVP

### Tela 1: Cadastro de Visitantes
Módulo utilizado na recepção para o registro inicial dos participantes[cite: 4]. Todos os campos disponíveis são de preenchimento obrigatório:
* **Nome:** Campo de texto (até 200 caracteres alfabéticos) com formatação automática de capitalização (primeira letra de cada palavra em maiúsculo).
* **Criança:** Controle do tipo `Toggle` (Booleano: Sim/Não).
* **Telefone:** Exibido dinamicamente apenas quando `Criança = false`. Formato numérico padrão `(XX) XXXXX-XXXX`, acompanhado de um `Toggle` ao lado para marcar *"Não possui telefone"*.
* **Responsável:** Exibido dinamicamente apenas quando `Criança = true`. Campo numérico para inserção/leitura do QR Code do adulto responsável, com validação automática de cadastro prévio e checagem de perfil adulto[cite: 4].

### Tela 2: Gestão de Eventos
Módulo para cadastro e configuração dos eventos realizados pela instituição:
* **Nome do Evento:** Texto de até 50 caracteres alfabéticos com capitalização automática.
* **Data:** Data de realização.
* **Local:** Endereço ou descrição do local.
* **Descrição:** Detalhes informativos do evento.

### Tela 3: Gestão de Serviços
Cadastro dos postos de atendimento e benefícios oferecidos (ex: Dentista, Cabeleireiro, Entrega de Brinquedos)[cite: 4]:
* **Nome do Serviço:** Identificação da atividade.
* **Evento:** Campo de texto inteligente que, a partir de 3 caracteres digitados, exibe uma lista de seleção com os eventos correspondentes (nome e data).
* **Restrições de Público:** 
  * `Apenas crianças` [Toggle: boolean]
  * `Apenas adultos` [Toggle: boolean]
* **Responsável pelo Atendimento:** Nome do voluntário/profissional encarregado (texto até 200 caracteres com capitalização automática).
* **Descrição:** Detalhes operacionais (texto de até 200 caracteres alfanuméricos).

### Tela 4: Registro de Atendimento (Operacional)
Tela utilizada nos postos de atendimento para validação e entrega rápida[cite: 4]:
* **Visitante:** Campo numérico para inserção do número do QR Code, integrado a um botão de leitura de QR Code utilizando a câmera do próprio dispositivo[cite: 4].
* **Ação Principal:** Botão **CONFIRMAR ATENDIMENTO**[cite: 4]. Ao acioná-lo, o sistema processa a vinculação automática do atendimento considerando o evento e o serviço previamente selecionados na sessão, validando se o benefício já foi resgatado para evitar duplicidades.