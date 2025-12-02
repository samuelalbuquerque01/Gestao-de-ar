import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'USER';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  register: (data: Omit<User, 'id' | 'role'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Admin User
const ADMIN_USER: User = {
  id: 'admin-001',
  name: 'Administrador',
  email: 'admin@neuro.com',
  phone: '(85) 99999-9999',
  role: 'ADMIN'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useLocation();

  // Check for persisted session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('neuro_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Auto-create admin for demo purposes if no users exist (simulated)
      // In a real app, this would happen on server init
      console.log('System initialized. Default admin available: admin@neuro.com');
    }
  }, []);

  const login = async (email: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple mock login logic
    if (email === 'admin@neuro.com') {
      const admin = ADMIN_USER;
      setUser(admin);
      localStorage.setItem('neuro_user', JSON.stringify(admin));
      setLocation('/');
    } else {
      // Allow any other registered user (mock persistence in memory for this session)
      const storedUsers = JSON.parse(localStorage.getItem('neuro_registered_users') || '[]');
      const foundUser = storedUsers.find((u: User) => u.email === email);
      
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('neuro_user', JSON.stringify(foundUser));
        setLocation('/');
      } else {
        alert('Usuário não encontrado. Use admin@neuro.com ou cadastre-se.');
      }
    }
  };

  const register = async (data: Omit<User, 'id' | 'role'>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'USER',
      ...data
    };

    // Save to "DB"
    const storedUsers = JSON.parse(localStorage.getItem('neuro_registered_users') || '[]');
    storedUsers.push(newUser);
    localStorage.setItem('neuro_registered_users', JSON.stringify(storedUsers));

    // Auto login
    setUser(newUser);
    localStorage.setItem('neuro_user', JSON.stringify(newUser));
    setLocation('/');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('neuro_user');
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user,
      login, 
      logout, 
      register 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
