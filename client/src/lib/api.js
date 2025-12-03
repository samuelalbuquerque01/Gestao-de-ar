// api.js - FRONTEND
import axios from 'axios';

// COM PROXY: Use caminho relativo
const baseURL = '/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token adicionado');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Erro na requisição:', error.message);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] Resposta ${response.status} de ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ [API] Erro ${error.response.status} em ${error.config?.url || 'URL desconhecida'}:`);
      console.error(`📋 [API] Dados da resposta:`, error.response.data);
      
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('🔒 Token removido (401 Unauthorized)');
      }
      
      if (error.response.status === 404) {
        console.error('🔍 [API] Rota não encontrada. Verifique:');
        console.error('   1. Backend está rodando na porta correta?');
        console.error('   2. Proxy está configurado corretamente?');
        console.error('   3. A rota existe no backend?');
      }
    } else if (error.request) {
      console.error('❌ [API] Sem resposta do servidor - URL:', error.config?.url);
      console.error('🔍 [API] Possíveis causas:');
      console.error('   1. Backend não está rodando');
      console.error('   2. Problema de CORS');
      console.error('   3. Erro de rede');
    } else {
      console.error('❌ [API] Erro:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export { api };