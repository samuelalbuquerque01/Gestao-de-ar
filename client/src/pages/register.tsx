import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fan, Loader2, ArrowLeft, User } from 'lucide-react';
import { Link } from 'wouter';

export default function RegisterPage() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',      // ← ADICIONADO (obrigatório para backend)
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    setError(''); // Limpa erro ao digitar
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!formData.username.trim()) {
      setError('Nome de usuário é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      // Envia TODOS os campos obrigatórios para o backend
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone
      });
    } catch (error: any) {
      console.error('Erro no registro:', error);
      setError(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2 relative">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="absolute left-4 top-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <div className="flex justify-center mb-4 pt-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Fan className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Criar Conta</CardTitle>
          <CardDescription>Cadastre-se para acessar o sistema Neuropsicocentro</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome de Usuário *
              </Label>
              <Input 
                id="username" 
                placeholder="Ex: joao.silva" 
                value={formData.username}
                onChange={handleChange}
                required 
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Usado para login. Letras, números e pontos.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                value={formData.name}
                onChange={handleChange}
                required 
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={formData.email}
                onChange={handleChange}
                required 
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                placeholder="(00) 00000-0000" 
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Digite novamente"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required 
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Campos marcados com * são obrigatórios</p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Já tem uma conta?
                </span>
              </div>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Fazer Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}