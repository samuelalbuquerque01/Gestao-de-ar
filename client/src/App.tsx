import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/lib/data";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import MachinesPage from "@/pages/machines";
import ServicesPage from "@/pages/services";
import TechniciansPage from "@/pages/technicians";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/maquinas" component={MachinesPage} />
        <Route path="/servicos" component={ServicesPage} />
        <Route path="/tecnicos" component={TechniciansPage} />
        <Route path="/relatorios" component={() => <div className="p-10 text-center text-muted-foreground">Módulo de Relatórios em Desenvolvimento</div>} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <Toaster />
        <Router />
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
