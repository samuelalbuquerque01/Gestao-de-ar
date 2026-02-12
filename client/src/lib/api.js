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
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token.length > 10) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
    }
    
    return config;
  },
  (error) => {
    console.error('âŒ [API] Erro na requisiÃ§Ã£o:', error.message);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`âŒ [API] Erro ${error.response.status} em ${error.config?.url || 'URL desconhecida'}:`);
      
      if (error.response.status === 401 || error.response.status === 403) {
        // SÃ³ remove e redireciona se NÃƒO estiver na pÃ¡gina de login/register
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Pequeno delay antes de redirecionar
          setTimeout(() => {
            window.location.href = '/login';
          }, 300);
        } else {
        }
      }
    } else if (error.request) {
      console.error('âŒ [API] Sem resposta do servidor - URL:', error.config?.url);
      console.error('ðŸ” [API] PossÃ­veis causas:');
      console.error('   1. Backend nÃ£o estÃ¡ rodando');
      console.error('   2. Problema de CORS');
      console.error('   3. Erro de rede');
    } else {
      console.error('âŒ [API] Erro:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export { api };
