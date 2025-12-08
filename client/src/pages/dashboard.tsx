import React from 'react';
import { useData, ServiceStatus, MachineStatus } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Fan, Wrench, AlertTriangle, CheckCircle2, Clock, Activity, Loader2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { machines, services, dashboardStats, isLoadingMachines, isLoadingMachinesInitial } = useData();

  // Mostrar loading enquanto carrega
  if (isLoadingMachinesInitial) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Carregando dashboard</h3>
            <p className="text-sm text-muted-foreground">Aguarde enquanto carregamos os dados...</p>
          </div>
        </div>
      </div>
    );
  }

  // Stats Calculations
  const activeMachines = machines.filter(m => m.status === 'ATIVO').length;
  const maintenanceMachines = machines.filter(m => m.status === 'MANUTENCAO').length;
  const defectMachines = machines.filter(m => m.status === 'DEFEITO').length;
  
  const pendingServices = services.filter(s => s.status === 'AGENDADO' || s.status === 'PENDENTE').length;
  const completedServices = services.filter(s => s.status === 'CONCLUIDO').length;
  
  // Chart Data - Machines by Type
  const machinesByType = machines.reduce((acc, curr) => {
    const tipo = curr.tipo || 'DESCONHECIDO';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(machinesByType).map(([name, value]) => ({ name, value }));
  
  // Chart Data - Services by Type
  const serviceStats = [
    { name: 'Prev.', total: services.filter(s => s.tipoServico === 'PREVENTIVA').length },
    { name: 'Corr.', total: services.filter(s => s.tipoServico === 'CORRETIVA').length },
    { name: 'Inst.', total: services.filter(s => s.tipoServico === 'INSTALACAO').length },
    { name: 'Limp.', total: services.filter(s => s.tipoServico === 'LIMPEZA').length },
  ];

  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(173, 58%, 39%)', 'hsl(197, 37%, 24%)', 'hsl(43, 74%, 66%)', 'hsl(27, 87%, 67%)', 'hsl(0, 0%, 40%)'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de ar condicionado.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Máquinas Ativas</CardTitle>
            <Fan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMachines}</div>
            <p className="text-xs text-muted-foreground">
              de {machines.length} máquinas totais
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceMachines}</div>
            <p className="text-xs text-muted-foreground">
              {defectMachines > 0 ? `${defectMachines} com defeito crítico` : 'Operação normal'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingServices}</div>
            <p className="text-xs text-muted-foreground">
              Agendados para breve
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedServices}</div>
            <p className="text-xs text-muted-foreground">
              Total histórico
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Tipos de Serviço</CardTitle>
            <CardDescription>Distribuição de manutenções realizadas e agendadas.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Tipos de Máquina</CardTitle>
            <CardDescription>Inventário por categoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Services List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Próximos Serviços</CardTitle>
          <CardDescription>Manutenções agendadas para os próximos dias.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services
              .filter(s => s.status === 'AGENDADO' || s.status === 'EM_ANDAMENTO')
              .sort((a, b) => new Date(a.dataAgendamento).getTime() - new Date(b.dataAgendamento).getTime())
              .slice(0, 5)
              .map(service => {
                const machine = machines.find(m => m.id === service.maquinaId);
                return (
                  <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        service.prioridade === 'URGENTE' ? 'bg-red-100 text-red-600' : 
                        service.prioridade === 'ALTA' ? 'bg-orange-100 text-orange-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{service.descricaoServico}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{machine?.codigo || 'Sem máquina'} - {machine?.localizacaoDescricao || 'Local desconhecido'}</span>
                          <span>•</span>
                          <span>{format(new Date(service.dataAgendamento), "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.status === 'EM_ANDAMENTO' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {service.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
            })}
            {services.filter(s => s.status === 'AGENDADO').length === 0 && (
               <div className="text-center py-8 text-muted-foreground">
                 Nenhum serviço agendado.
               </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}