import api from './api';

export const servicoService = {
  // Criar novo serviço
  criarServico: async (servicoData) => {
    try {
      const response = await api.post('/servicos', servicoData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter todos os serviços
  obterServicos: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== '') {
          params.append(key, filtros[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/servicos?${queryString}` : '/servicos';
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter serviço por ID
  obterServico: async (id) => {
    try {
      const response = await api.get(`/servicos/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar serviço
  atualizarServico: async (id, dados) => {
    try {
      const response = await api.put(`/servicos/${id}`, dados);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Excluir serviço
  excluirServico: async (id) => {
    try {
      const response = await api.delete(`/servicos/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter serviços por máquina
  obterServicosPorMaquina: async (maquinaId) => {
    try {
      const response = await api.get(`/servicos/maquina/${maquinaId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter estatísticas
  obterEstatisticas: async () => {
    try {
      const response = await api.get('/servicos/estatisticas/geral');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};