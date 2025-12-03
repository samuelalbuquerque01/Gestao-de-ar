import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar token no localStorage ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('✅ Sessão restaurada');
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('🔑 Tentando login...');
      
      const response = await api.post('/auth/login', { email, password });
      
      console.log('📥 Resposta:', response.data);
      
      if (response.data.success && response.data.data) {
        const { token, user: userData } = response.data.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('✅ Login bem-sucedido');
      } else {
        throw new Error(response.data.error || 'Login falhou');
      }
      
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      
      let errorMessage = 'Falha no login';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: any): Promise<void> => {
    try {
      console.log('👤 Tentando registro...');
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success && response.data.data) {
        const { token, user: newUser } = response.data.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        setUser(newUser);
        setIsAuthenticated(true);
        
        console.log('✅ Registro bem-sucedido');
      } else {
        throw new Error(response.data.error || 'Registro falhou');
      }
      
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      
      let errorMessage = 'Falha no registro';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}