import React from 'react';
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/lib/data";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import MachinesPage from "@/pages/machines";
import ServicesPage from "@/pages/services";
import TechniciansPage from "@/pages/technicians";
import ReportsPage from "@/pages/reports";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando autenticacao...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  return (
    <Layout>
      <DataProvider>
        <Component />
      </DataProvider>
    </Layout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* Protected Routes - SO se autenticado */}
      {isAuthenticated ? (
        <>
          <Route path="/">
            <ProtectedRoute component={Dashboard} />
          </Route>
          
          <Route path="/maquinas">
            <ProtectedRoute component={MachinesPage} />
          </Route>
          
          <Route path="/servicos">
            <ProtectedRoute component={ServicesPage} />
          </Route>
          
          <Route path="/tecnicos">
            <ProtectedRoute component={TechniciansPage} />
          </Route>
          
          <Route path="/relatorios">
            <ProtectedRoute component={ReportsPage} />
          </Route>
          
          <Route path="/configuracoes">
            <ProtectedRoute component={() => <div className="p-10 text-center text-muted-foreground">Modulo de Configuracoes em Desenvolvimento</div>} />
          </Route>
          
          <Route path="/perfil">
            <ProtectedRoute component={() => <div className="p-10 text-center text-muted-foreground">Modulo de Perfil em Desenvolvimento</div>} />
          </Route>
        </>
      ) : (
        // Se nao autenticado, redireciona todas as rotas para login
        <Route><Redirect to="/login" /></Route>
      )}
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
