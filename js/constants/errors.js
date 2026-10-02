/**
 * GiraFila — Centralized Error Catalog (Single Source of Truth)
 * Aligned with HARNESS/Architecture/ErrorGovernance.md
 * 
 * Nomenclature: GF-[MODULE]-[TYPE]-[NUMBER]
 * Types: VAL (Validation), REG (Business Rule), SEC (Security), SYS (System)
 */

export const ERROR_CATALOG = Object.freeze({
  // Session
  'GF-SESSION-VAL-001': {
    userMessage: 'É necessário selecionar um Evento e um Serviço ativos para realizar o atendimento.',
    technicalContext: {
      summary: 'Sessão ativa não possui evento ou serviço definidos.',
      commonCauses: ['Voluntário não selecionou o contexto de trabalho ao iniciar'],
      relatedFiles: ['js/views/sessionModal.js', 'js/views/attendanceView.js'],
      suggestedAction: 'Abrir o modal de seleção de contexto de sessão.'
    }
  },
  'GF-SESSION-VAL-002': {
    userMessage: 'Selecione um evento antes de escolher o serviço.',
    technicalContext: {
      summary: 'Tentativa de selecionar serviço sem haver um evento ativo definido na sessão.',
      commonCauses: ['Usuário clicou para selecionar serviço antes de escolher um evento'],
      relatedFiles: ['js/views/sessionModal.js'],
      suggestedAction: 'Selecionar um evento ativo antes de prosseguir com a escolha do serviço.'
    }
  },
  'GF-SESSION-VAL-003': {
    userMessage: 'Selecione um posto/serviço para continuar.',
    technicalContext: {
      summary: 'Nenhum posto/serviço foi selecionado no modal dedicado de serviço.',
      commonCauses: ['Submissão do modal com dropdown de serviço vazio'],
      relatedFiles: ['js/views/sessionModal.js'],
      suggestedAction: 'Escolher um serviço válido na lista antes de salvar.'
    }
  },

  // Visitor Validation
  'GF-VISIT-VAL-001': {
    userMessage: 'O nome do participante é obrigatório e deve conter apenas letras.',
    technicalContext: {
      summary: 'Campo nome de visitante vazio ou contendo caracteres não alfabéticos.',
      commonCauses: ['Digitação de números/símbolos ou submissão vazia'],
      relatedFiles: ['js/views/visitorView.js', 'js/utils/sanitizer.js'],
      suggestedAction: 'Validar campo nome com regex alfabética e aplicar capitalização.'
    }
  },
  'GF-VISIT-VAL-002': {
    userMessage: 'O telefone informado está incompleto. Use o formato (XX) XXXXX-XXXX ou marque "Não possui telefone".',
    technicalContext: {
      summary: 'Telefone do adulto não atinge o tamanho mínimo de 10-11 dígitos.',
      commonCauses: ['Máscara incompleta digitada pelo operador'],
      relatedFiles: ['js/views/visitorView.js'],
      suggestedAction: 'Verificar se toggle "Não possui telefone" está ativado ou se possui 10-11 dígitos.'
    }
  },
  'GF-VISIT-VAL-003': {
    userMessage: 'Para menores de idade, o número do QR Code do adulto responsável é obrigatório.',
    technicalContext: {
      summary: 'Visitante marcado como criança sem preenchimento do QR do responsável.',
      commonCauses: ['Campo responsável deixado em branco na ficha de criança'],
      relatedFiles: ['js/views/visitorView.js'],
      suggestedAction: 'Exigir preenchimento e busca do QR Code do responsável.'
    }
  },
  'GF-VISIT-VAL-004': {
    userMessage: 'O número do ticket QR Code deve ser um número inteiro entre 1 e 9999.',
    technicalContext: {
      summary: 'Ticket QR Code fora da faixa operacional de 1 a 9999.',
      commonCauses: ['QR lido com valor fora da faixa física de tickets'],
      relatedFiles: ['js/views/visitorView.js', 'js/views/attendanceView.js'],
      suggestedAction: 'Restringir valor numérico entre 1 e 9999.'
    }
  },
  'GF-VISIT-VAL-005': {
    userMessage: 'A idade do participante é obrigatória e deve ser um número entre 0 e 120 anos.',
    technicalContext: {
      summary: 'Idade inválida, vazia ou fora do intervalo operacional de 0 a 120 anos.',
      commonCauses: ['Campo idade deixado em branco ou preenchido com valor negativo ou superior a 120'],
      relatedFiles: ['js/views/visitorView.js'],
      suggestedAction: 'Validar idade com número inteiro entre 0 e 120.'
    }
  },
  'GF-VISIT-VAL-006': {
    userMessage: 'O campo gênero é obrigatório. Selecione Masculino ou Feminino.',
    technicalContext: {
      summary: 'Gênero não informado ou não pertencente às opções permitidas.',
      commonCauses: ['Seleção não realizada no dropdown de gênero'],
      relatedFiles: ['js/views/visitorView.js'],
      suggestedAction: 'Exigir seleção de Masculino ou Feminino.'
    }
  },

  // Visitor Business Rules
  'GF-VISIT-REG-001': {
    userMessage: 'Este ticket QR Code já está cadastrado para outro participante neste evento.',
    technicalContext: {
      summary: 'Violação de unicidade de QR Code para o mesmo evento.',
      commonCauses: ['Ticket físico já entregue a outro visitante no dia'],
      relatedFiles: ['js/views/visitorView.js', 'js/services/storageService.js'],
      suggestedAction: 'Informar ao operador para usar outro cartão de ticket físico.'
    }
  },
  'GF-VISIT-REG-002': {
    userMessage: 'Responsável não encontrado: o QR Code informado não pertence a um adulto cadastrado neste evento.',
    technicalContext: {
      summary: 'Tentativa de associar criança a QR inexistente ou a outra criança.',
      commonCauses: ['QR digitado errado ou adulto ainda não cadastrado na recepção'],
      relatedFiles: ['js/views/visitorView.js'],
      suggestedAction: 'Cadastrar o adulto antes ou conferir o número do ticket do responsável.'
    }
  },

  // Event Validation
  'GF-EVENT-VAL-001': {
    userMessage: 'O nome do evento é obrigatório e deve ter no máximo 50 caracteres.',
    technicalContext: {
      summary: 'Nome do evento vazio ou excedeu 50 caracteres.',
      commonCauses: ['Campo vazio ou texto muito longo'],
      relatedFiles: ['js/views/eventView.js'],
      suggestedAction: 'Limitar nome a 50 caracteres alfabéticos/alfanuméricos.'
    }
  },
  'GF-EVENT-VAL-002': {
    userMessage: 'A data do evento é obrigatória.',
    technicalContext: {
      summary: 'Data do evento não informada.',
      commonCauses: ['Campo data vazio'],
      relatedFiles: ['js/views/eventView.js'],
      suggestedAction: 'Exigir seleção de data válida no padrão ISO/UTC literal.'
    }
  },
  'GF-EVENT-VAL-003': {
    userMessage: 'O local do evento é obrigatório.',
    technicalContext: {
      summary: 'Local do evento vazio.',
      commonCauses: ['Campo local em branco'],
      relatedFiles: ['js/views/eventView.js'],
      suggestedAction: 'Exigir preenchimento do local.'
    }
  },

  // Service Validation
  'GF-SERV-VAL-001': {
    userMessage: 'O nome do serviço e a vinculação a um evento são obrigatórios.',
    technicalContext: {
      summary: 'Nome do serviço ou evento ausente no cadastro de serviço.',
      commonCauses: ['Campos obrigatórios em branco'],
      relatedFiles: ['js/views/serviceView.js'],
      suggestedAction: 'Assegurar seleção de evento e preenchimento de nome.'
    }
  },
  'GF-SERV-VAL-002': {
    userMessage: 'O responsável pelo atendimento é obrigatório (até 200 caracteres).',
    technicalContext: {
      summary: 'Nome do responsável pelo serviço ausente.',
      commonCauses: ['Campo responsável em branco'],
      relatedFiles: ['js/views/serviceView.js'],
      suggestedAction: 'Exigir nome do responsável com capitalização.'
    }
  },
  'GF-SERV-VAL-003': {
    userMessage: 'Selecione apenas uma restrição de público (Apenas Crianças OU Apenas Adultos).',
    technicalContext: {
      summary: 'Conflito de restrições de público.',
      commonCauses: ['Ambos toggles ativados simultaneamente'],
      relatedFiles: ['js/views/serviceView.js'],
      suggestedAction: 'Desativar mutuamente os toggles de restrição.'
    }
  },

  // Attendance Validation & Rules
  'GF-ATTEND-VAL-001': {
    userMessage: 'Informe ou leia um número de ticket QR Code válido (1 a 9999).',
    technicalContext: {
      summary: 'Entrada de QR Code inválida no registro de atendimento.',
      commonCauses: ['Campo vazio, leitura falha ou valor fora do limite'],
      relatedFiles: ['js/views/attendanceView.js'],
      suggestedAction: 'Conferir digitação do número do ticket.'
    }
  },
  'GF-ATTEND-REG-001': {
    userMessage: 'Participante não encontrado neste evento. Por favor, realize o cadastro na recepção.',
    technicalContext: {
      summary: 'QR Code informado não possui cadastro ativo para o evento selecionado.',
      commonCauses: ['Visitante não passou pela recepção ou ticket não registrado'],
      relatedFiles: ['js/views/attendanceView.js'],
      suggestedAction: 'Encaminhar o participante à mesa de cadastro.'
    }
  },
  'GF-ATTEND-REG-002': {
    userMessage: 'Atendimento já realizado! Este benefício/serviço já foi resgatado para este participante.',
    technicalContext: {
      summary: 'Tentativa de duplicidade no mesmo serviço e mesmo evento.',
      commonCauses: ['Participante tentando receber duas vezes o mesmo benefício'],
      relatedFiles: ['js/views/attendanceView.js', 'js/services/storageService.js'],
      suggestedAction: 'Bloquear registro e exibir horário do primeiro atendimento.'
    }
  },
  'GF-ATTEND-REG-003': {
    userMessage: 'Restrição de Atendimento: Este serviço é exclusivo para crianças.',
    technicalContext: {
      summary: 'Participante é adulto em serviço com restrição Apenas Crianças.',
      commonCauses: ['Adulto tentando utilizar serviço infantil'],
      relatedFiles: ['js/views/attendanceView.js'],
      suggestedAction: 'Informar ao voluntário a restrição cadastrada.'
    }
  },
  'GF-ATTEND-REG-004': {
    userMessage: 'Restrição de Atendimento: Este serviço é exclusivo para adultos.',
    technicalContext: {
      summary: 'Participante é criança em serviço com restrição Apenas Adultos.',
      commonCauses: ['Criança tentando utilizar serviço de adultos'],
      relatedFiles: ['js/views/attendanceView.js'],
      suggestedAction: 'Informar ao voluntário a restrição cadastrada.'
    }
  },

  // Security & Hardware
  'GF-CAMERA-SEC-001': {
    userMessage: 'Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador ou digite o número manualmente.',
    technicalContext: {
      summary: 'Permissão de câmera negada ou dispositivo sem suporte a getUserMedia.',
      commonCauses: ['Permissão de vídeo negada pelo usuário ou contexto não-seguro HTTP'],
      relatedFiles: ['js/utils/qrScanner.js'],
      suggestedAction: 'Utilizar entrada numérica manual do ticket de 1 a 9999.'
    }
  },

  // Event Business Rules
  'GF-EVENT-REG-001': {
    userMessage: 'Este evento não pode ser excluído pois possui serviços ou visitantes vinculados. Remova-os primeiro.',
    technicalContext: {
      summary: 'Tentativa de exclusão de evento com dependências ativas (services ou visitors).',
      commonCauses: ['Evento possui serviços cadastrados ou visitantes registrados'],
      relatedFiles: ['js/views/eventView.js', 'js/services/storageService.js'],
      suggestedAction: 'Excluir serviços e visitantes vinculados ao evento antes de removê-lo.'
    }
  },

  // Service Business Rules
  'GF-SERV-REG-001': {
    userMessage: 'Este serviço não pode ser excluído pois possui atendimentos registrados.',
    technicalContext: {
      summary: 'Tentativa de exclusão de serviço com atendimentos vinculados.',
      commonCauses: ['Serviço possui registros de atendimento associados'],
      relatedFiles: ['js/views/serviceView.js', 'js/services/storageService.js'],
      suggestedAction: 'Verificar se há atendimentos vinculados a este serviço antes de excluí-lo.'
    }
  },

  // Visitor Business Rules (extended)
  'GF-VISIT-REG-003': {
    userMessage: 'Não foi possível salvar: o QR Code informado já está em uso por outro participante neste evento.',
    technicalContext: {
      summary: 'Conflito de QR Code durante edição de visitante.',
      commonCauses: ['QR Code alterado para valor já atribuído a outro participante no mesmo evento'],
      relatedFiles: ['js/views/visitorView.js', 'js/services/storageService.js'],
      suggestedAction: 'Usar um número de ticket disponível.'
    }
  },

  // System
  'GF-SYSTEM-SYS-001': {
    userMessage: 'Ocorreu um erro no armazenamento local do navegador. Tente novamente.',
    technicalContext: {
      summary: 'Falha em transação do IndexedDB.',
      commonCauses: ['Armazenamento cheio ou erro de quota no navegador'],
      relatedFiles: ['js/services/storageService.js'],
      suggestedAction: 'Verificar permissões de armazenamento do navegador.'
    }
  },
  'GF-SYSTEM-SYS-002': {
    userMessage: 'Ocorreu um erro ao tentar atualizar ou excluir o registro. Tente novamente.',
    technicalContext: {
      summary: 'Falha em operação de UPDATE ou DELETE no IndexedDB ou LAN API.',
      commonCauses: ['Registro não encontrado', 'Erro de transação no IndexedDB', 'Falha de rede na LAN API'],
      relatedFiles: ['js/services/storageService.js'],
      suggestedAction: 'Recarregar a página e tentar novamente. Verificar conectividade com a LAN API.'
    }
  },
  'GF-SYSTEM-SYS-003': {
    userMessage: 'Não foi possível copiar automaticamente para a área de transferência. Selecione o endereço na tela para copiar.',
    technicalContext: {
      summary: 'Falha na gravação na área de transferência via navigator.clipboard e document.execCommand.',
      commonCauses: [
        'Contexto não seguro (HTTP através de IP de rede local)',
        'Permissão de clipboard bloqueada pelo navegador',
        'Navegador mobile sem suporte a execCommand em background'
      ],
      relatedFiles: ['js/utils/clipboard.js', 'js/app.js'],
      suggestedAction: 'Selecionar o texto do elemento na interface para permitir cópia manual pelo usuário.'
    }
  },

  // Dashboard
  'GF-DASH-SYS-001': {
    userMessage: 'Não foi possível carregar os dados do painel estatístico. Verifique a conexão e tente atualizar.',
    technicalContext: {
      summary: 'Falha ao consolidar métricas agregadas para o Dashboard (visitantes, atendimentos, serviços).',
      commonCauses: [
        'Erro de leitura no IndexedDB durante getAllVisitors() ou getAllAttendances()',
        'Falha de rede na LAN API ao buscar dados sem filtro de event_id',
        'Exceção não capturada em computeMetrics()'
      ],
      relatedFiles: ['js/views/dashboardView.js', 'js/services/storageService.js', 'api.php'],
      suggestedAction: 'Verificar console do navegador para stack trace. Recarregar a página. Checar disponibilidade da LAN API.'
    }
  },

  // Export
  'GF-EXPORT-VAL-001': {
    userMessage: 'Selecione ao menos uma opção (Visitantes ou Atendimentos) para exportar.',
    technicalContext: {
      summary: 'Nenhuma aba selecionada nos toggles antes de confirmar a exportação.',
      commonCauses: ['Usuário desmarcou ambos os toggles'],
      relatedFiles: ['js/views/dashboardView.js', 'js/utils/xlsxExporter.js'],
      suggestedAction: 'Ativar ao menos um toggle antes de clicar em Exportar.'
    }
  },
  'GF-EXPORT-REG-001': {
    userMessage: 'Não há dados para exportar com os filtros ativos. Limpe os filtros ou registre dados primeiro.',
    technicalContext: {
      summary: 'Dados filtrados resultaram em zero registros em todas as abas selecionadas.',
      commonCauses: ['Filtros muito restritivos', 'Banco de dados vazio para o contexto selecionado'],
      relatedFiles: ['js/views/dashboardView.js', 'js/utils/xlsxExporter.js'],
      suggestedAction: 'Limpar filtros no Dashboard e tentar novamente.'
    }
  },
  'GF-EXPORT-SYS-001': {
    userMessage: 'O recurso de exportação não está disponível. Verifique a conexão com a internet e recarregue a página.',
    technicalContext: {
      summary: 'Biblioteca SheetJS (window.XLSX) não carregada via CDN.',
      commonCauses: ['Sem conexão à internet no momento do carregamento', 'CDN bloqueado por firewall ou proxy'],
      relatedFiles: ['index.html', 'js/utils/xlsxExporter.js'],
      suggestedAction: 'Verificar o carregamento da tag <script> do SheetJS em index.html.'
    }
  },
  'GF-EXPORT-SYS-002': {
    userMessage: 'Não foi possível gerar o arquivo de exportação. Tente novamente.',
    technicalContext: {
      summary: 'Falha em XLSX.writeFile() ou na criação do Blob para download.',
      commonCauses: ['Memória insuficiente no dispositivo', 'Restrição de download do navegador'],
      relatedFiles: ['js/utils/xlsxExporter.js'],
      suggestedAction: 'Verificar console do navegador. Reduzir volume via filtros e tentar novamente.'
    }
  },

  // Master Password / Lock
  'GF-LOCK-VAL-001': {
    userMessage: 'Senha mestre incorreta. Tente novamente.',
    technicalContext: {
      summary: 'Hash da senha informada não corresponde ao hash armazenado em localStorage.',
      commonCauses: ['Senha digitada incorretamente'],
      relatedFiles: ['js/utils/masterPassword.js', 'js/views/dashboardView.js', 'js/app.js'],
      suggestedAction: 'Verificar se o Caps Lock está ativo e tentar novamente.'
    }
  },
  'GF-LOCK-VAL-002': {
    userMessage: 'A nova senha mestre deve ter ao menos 6 caracteres.',
    technicalContext: {
      summary: 'Nova senha abaixo do tamanho mínimo de 6 caracteres.',
      commonCauses: ['Senha muito curta digitada pelo usuário'],
      relatedFiles: ['js/app.js', 'js/utils/masterPassword.js'],
      suggestedAction: 'Exigir mínimo de 6 caracteres na nova senha.'
    }
  },
  'GF-LOCK-VAL-003': {
    userMessage: 'A nova senha mestre e a confirmação não coincidem. Verifique e tente novamente.',
    technicalContext: {
      summary: 'Campo "Nova Senha" e "Confirmar Nova Senha" com valores divergentes.',
      commonCauses: ['Erro de digitação na confirmação'],
      relatedFiles: ['js/app.js'],
      suggestedAction: 'Redigitar ambos os campos de nova senha.'
    }
  },
  'GF-LOCK-SYS-001': {
    userMessage: 'Não foi possível processar a senha mestre. Seu navegador pode não suportar esta funcionalidade.',
    technicalContext: {
      summary: 'window.crypto.subtle indisponível — API Web Crypto não suportada.',
      commonCauses: ['Contexto não seguro (HTTP em IP de rede local sem HTTPS)', 'Navegador muito antigo'],
      relatedFiles: ['js/utils/masterPassword.js'],
      suggestedAction: 'Verificar se o navegador suporta Web Crypto API. Usar contexto HTTPS se possível.'
    }
  }
});
