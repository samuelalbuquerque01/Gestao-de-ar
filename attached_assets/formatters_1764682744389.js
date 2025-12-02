// Formatar data para exibição
export const formatarData = (data) => {
  if (!data) return '';
  const dataObj = new Date(data);
  return dataObj.toLocaleDateString('pt-BR');
};

// Formatar data e hora
export const formatarDataHora = (data) => {
  if (!data) return '';
  const dataObj = new Date(data);
  return dataObj.toLocaleString('pt-BR');
};

// Formatar valor monetário
export const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Traduzir status da máquina
export const traduzirStatusMaquina = (status) => {
  const statusMap = {
    'ATIVO': 'Ativo',
    'INATIVO': 'Inativo',
    'MANUTENCAO': 'Em Manutenção',
    'DEFEITO': 'Com Defeito'
  };
  return statusMap[status] || status;
};

// Traduzir tipo de serviço
export const traduzirTipoServico = (tipo) => {
  const tipoMap = {
    'PREVENTIVA': 'Manutenção Preventiva',
    'CORRETIVA': 'Manutenção Corretiva',
    'INSTALACAO': 'Instalação',
    'LIMPEZA': 'Limpeza',
    'VISTORIA': 'Vistoria'
  };
  return tipoMap[tipo] || tipo;
};

// Traduzir status do serviço
export const traduzirStatusServico = (status) => {
  const statusMap = {
    'AGENDADO': 'Agendado',
    'EM_ANDAMENTO': 'Em Andamento',
    'CONCLUIDO': 'Concluído',
    'CANCELADO': 'Cancelado',
    'PENDENTE': 'Pendente'
  };
  return statusMap[status] || status;
};

// Traduzir prioridade
export const traduzirPrioridade = (prioridade) => {
  const prioridadeMap = {
    'BAIXA': 'Baixa',
    'MEDIA': 'Média',
    'ALTA': 'Alta',
    'URGENTE': 'Urgente'
  };
  return prioridadeMap[prioridade] || prioridade;
};

// Formatar tipo de máquina
export const formatarTipoMaquina = (tipo) => {
  const tipoMap = {
    'SPLIT': 'Split',
    'WINDOW': 'Window',
    'PISO_TETO': 'Piso-Teto',
    'CASSETE': 'Cassete',
    'INVERTER': 'Inverter',
    'PORTATIL': 'Portátil'
  };
  return tipoMap[tipo] || tipo;
};

// Formatar localização
export const formatarLocalizacao = (localizacao) => {
  const localizacaoMap = {
    'SALA': 'Sala',
    'QUARTO': 'Quarto',
    'ESCRITORIO': 'Escritório',
    'SALA_REUNIAO': 'Sala de Reunião',
    'OUTRO': 'Outro'
  };
  return localizacaoMap[localizacao] || localizacao;
};

// Formatar voltagem
export const formatarVoltagem = (voltagem) => {
  const voltagemMap = {
    'V110': '110V',
    'V220': '220V',
    'BIVOLT': 'Bivolt'
  };
  return voltagemMap[voltagem] || voltagem;
};