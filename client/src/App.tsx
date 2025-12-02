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
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated && !user) { // Check user too as auth state might lag slightly on init
    return <Redirect to="/login" />;
  }
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* Protected Routes */}
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
        <ProtectedRoute component={() => <div className="p-10 text-center text-muted-foreground">Módulo de Relatórios em Desenvolvimento</div>} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Router />
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
