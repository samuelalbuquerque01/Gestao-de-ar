import React, { useState } from 'react';
import { useData } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Fan, Wrench, CheckCircle2, Clock, Activity, Loader2 } from 'lucide-react';
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
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'wouter';

// Funcao auxiliar para validar e formatar datas com seguranca
const safeDateFormat = (dateValue: any): string => {
  if (!dateValue) return 'Data nao informada';

  try {
    if (typeof dateValue === 'string' && dateValue.trim() === '') {
      return 'Data nao informada';
    }

    const date = new Date(dateValue);

    if (!isValid(date) || isNaN(date.getTime())) {
      return 'Data nao informada';
    }

    return format(date, "dd 'de' MMMM", { locale: ptBR });
  } catch (error) {
    console.error('[DASHBOARD] Erro ao formatar data:', error);
    return 'Data nao informada';
  }
};

const safeDateCompare = (dateValue: any): number => {
  if (!dateValue) return 0;

  try {
    const date = new Date(dateValue);
    return isValid(date) && !isNaN(date.getTime()) ? date.getTime() : 0;
  } catch (error) {
    return 0;
  }
};

export default function Dashboard() {
  const { machines, services, isLoadingMachinesInitial } = useData();
  const [, navigate] = useLocation();
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);

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

  const normalizeMachineStatus = (status?: string) =>
    (status || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  // Padrão adotado: máquina em manutenção quando status = MANUTENCAO.
  const isMachineInMaintenance = (machine: any) => normalizeMachineStatus(machine.status) === 'MANUTENCAO';

  const getMaintenanceStartDate = (machine: any) => {
    return (
      machine.maintenance?.startDate ||
      machine.maintenanceStartDate ||
      machine.dataInicioManutencao ||
      null
    );
  };

  const activeMachines = machines.filter((m) => normalizeMachineStatus(m.status) === 'ATIVO').length;
  const machinesInMaintenance = machines.filter(isMachineInMaintenance);
  const maintenanceMachines = machinesInMaintenance.length;

  const pendingServices = services.filter((s) => s.status === 'AGENDADO' || s.status === 'PENDENTE').length;
  const completedServices = services.filter((s) => s.status === 'CONCLUIDO').length;

  const machinesByType = machines.reduce((acc, curr) => {
    const tipo = curr.tipo || 'DESCONHECIDO';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(machinesByType).map(([name, value]) => ({ name, value }));

  const serviceStats = [
    { name: 'Prev.', total: services.filter((s) => s.tipoServico === 'PREVENTIVA').length },
    { name: 'Corr.', total: services.filter((s) => s.tipoServico === 'CORRETIVA').length },
    { name: 'Inst.', total: services.filter((s) => s.tipoServico === 'INSTALACAO').length },
    { name: 'Limp.', total: services.filter((s) => s.tipoServico === 'LIMPEZA').length },
  ];

  const COLORS = ['hsl(221, 83%, 53%)', 'hsl(173, 58%, 39%)', 'hsl(197, 37%, 24%)', 'hsl(43, 74%, 66%)', 'hsl(27, 87%, 67%)', 'hsl(0, 0%, 40%)'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">{'Vis\u00e3o geral do sistema de ar condicionado.'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{'M\u00e1quinas Ativas'}</CardTitle>
            <Fan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMachines}</div>
            <p className="text-xs text-muted-foreground">{'de '} {machines.length} {' m\u00e1quinas totais'}</p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setIsMaintenanceDialogOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsMaintenanceDialogOpen(true);
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{'Em Manuten\u00e7\u00e3o'}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceMachines}</div>
            <p className="text-xs text-muted-foreground">
              {maintenanceMachines > 0
                ? `${maintenanceMachines} em manuten\u00e7\u00e3o`
                : 'Nenhuma m\u00e1quina em manuten\u00e7\u00e3o'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{'Servi\u00e7os Pendentes'}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingServices}</div>
            <p className="text-xs text-muted-foreground">Agendados para breve</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{'Servi\u00e7os Conclu\u00eddos'}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedServices}</div>
            <p className="text-xs text-muted-foreground">{'Total hist\u00f3rico'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>{'Tipos de Servi\u00e7o'}</CardTitle>
            <CardDescription>{'Distribui\u00e7\u00e3o de manuten\u00e7\u00f5es realizadas e agendadas.'}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
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
            <CardTitle>{'Tipos de M\u00e1quina'}</CardTitle>
            <CardDescription>{'Invent\u00e1rio por categoria.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{'Pr\u00f3ximos Servi\u00e7os'}</CardTitle>
          <CardDescription>{'Manuten\u00e7\u00f5es agendadas para os pr\u00f3ximos dias.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services
              .filter((s) => s.status === 'AGENDADO' || s.status === 'EM_ANDAMENTO')
              .sort((a, b) => {
                const dateA = safeDateCompare(a.dataAgendamento);
                const dateB = safeDateCompare(b.dataAgendamento);
                return dateA - dateB;
              })
              .slice(0, 5)
              .map((service) => {
                const machine = machines.find((m) => m.id === service.maquinaId);
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
                          <span>{machine?.codigo || 'Sem m\u00e1quina'} - {machine?.localizacaoDescricao || 'Local desconhecido'}</span>
                          <span>-</span>
                          <span>{safeDateFormat(service.dataAgendamento)}</span>
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
            {services.filter((s) => s.status === 'AGENDADO').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">{'Nenhum servi\u00e7o agendado.'}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maquinas em manutencao</DialogTitle>
            <DialogDescription>
              {maintenanceMachines > 0
                ? `${maintenanceMachines} maquina(s) em manutencao no momento`
                : 'Nenhuma maquina em manutencao no momento'}
            </DialogDescription>
          </DialogHeader>

          {machinesInMaintenance.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-md">
              Nenhuma maquina em manutencao no momento
            </div>
          ) : (
            <div className="space-y-3">
              {machinesInMaintenance.map((machine) => (
                <div key={machine.id} className="rounded-md border p-3">
                  <div className="grid gap-2 md:grid-cols-6">
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground">Nome da maquina</p>
                      <p className="font-medium">{machine.modelo || 'Nao informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Filial</p>
                      <p>{machine.filial || machine.branchName || 'Nao informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <p>{machine.localizacaoDescricao || 'Nao informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Patrimonio/ID</p>
                      <p>{machine.codigo || machine.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inicio manutencao</p>
                      <p>{safeDateFormat(getMaintenanceStartDate(machine))}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => navigate('/maquinas')}>
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
