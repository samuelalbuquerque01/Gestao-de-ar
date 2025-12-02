import api from './api';

export const maquinaService = {
  // Criar nova máquina
  criarMaquina: async (maquinaData) => {
    try {
      const response = await api.post('/maquinas', maquinaData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter todas as máquinas
  obterMaquinas: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== '') {
          params.append(key, filtros[key]);
        }
      });
      
      const queryString = params.toString();
      const url = queryString ? `/maquinas?${queryString}` : '/maquinas';
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter máquina por ID
  obterMaquina: async (id) => {
    try {
      const response = await api.get(`/maquinas/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Atualizar máquina
  atualizarMaquina: async (id, dados) => {
    try {
      const response = await api.put(`/maquinas/${id}`, dados);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Excluir máquina
  excluirMaquina: async (id) => {
    try {
      const response = await api.delete(`/maquinas/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter máquinas com manutenção atrasada
  obterManutencaoAtrasada: async () => {
    try {
      const response = await api.get('/maquinas/manutencao/atrasada');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obter estatísticas
  obterEstatisticas: async () => {
    try {
      const response = await api.get('/maquinas/estatisticas/geral');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};