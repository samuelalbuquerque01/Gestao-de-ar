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
    if (token && token !== 'undefined' && token.length > 10) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token adicionado às requisições');
    } else {
      console.log('⚠️ [API] Token inválido ou ausente no localStorage:', {
        temToken: !!token,
        token: token?.substring(0, 20) + '...',
        length: token?.length
      });
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
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('🔒 Token inválido detectado (401/403)');
        
        // Só remove e redireciona se NÃO estiver na página de login/register
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          console.log('🗑️ Removendo token inválido...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Pequeno delay antes de redirecionar
          setTimeout(() => {
            console.log('🔄 Redirecionando para login...');
            window.location.href = '/login';
          }, 300);
        } else {
          console.log('ℹ️ [API] Já está na página de login, mantendo erro...');
        }
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