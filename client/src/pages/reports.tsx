import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { 
  Filter, 
  Calendar, 
  FileText, 
  TrendingUp,
  CheckCircle,
  Clock,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  Building,
  Users,
  Loader2,
  FileDown,
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useReports } from '@/lib/reports';

const generatePDF = async (reportContent: HTMLElement, reportTitle: string) => {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;
  
  const canvas = await html2canvas(reportContent, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = imgWidth / imgHeight;
  
  let width = pageWidth - 20;
  let height = width / ratio;
  
  if (height > pageHeight - 40) {
    height = pageHeight - 40;
    width = height * ratio;
  }

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(reportTitle, 15, 15);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 15, 22);
  
  pdf.setLineWidth(0.5);
  pdf.line(15, 25, pageWidth - 15, 25);

  pdf.addImage(imgData, 'PNG', 10, 30, width, height);

  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Página ${i} de ${pageCount}`, pageWidth - 30, pageHeight - 10);
  }

  pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
};

export default function ReportsPage() {
  const { machines, services } = useData();
  const { toast } = useToast();
  const { fetchReports, reportData, isLoading: isLoadingReports, error: reportError } = useReports();
  
  const [dateRange, setDateRange] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const branches = Array.from(new Set(machines.map(m => m.filial).filter(Boolean)));

  // Efeito para definir datas iniciais
  useEffect(() => {
    const today = new Date();
    let start, end;

    switch (dateRange) {
      case 'today':
        start = format(today, 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last7days':
        start = format(subDays(today, 7), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last30days':
        start = format(subDays(today, 30), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'last90days':
        start = format(subDays(today, 90), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'thismonth':
        start = format(startOfMonth(today), 'yyyy-MM-dd');
        end = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'lastmonth':
        const lastMonth = subMonths(today, 1);
        start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      default:
        start = startDate || format(subDays(today, 30), 'yyyy-MM-dd');
        end = endDate || format(today, 'yyyy-MM-dd');
    }

    // SEMPRE atualize as datas
    setStartDate(start);
    setEndDate(end);
  }, [dateRange, startDate, endDate]);

  // Efeito para buscar relatórios quando os filtros mudam
  useEffect(() => {
    const loadReports = async () => {
      if (!startDate || !endDate) {
        console.log('⏳ [REPORTS] Aguardando datas...');
        return;
      }

      console.log('🔄 [REPORTS] Buscando relatórios com filtros:', {
        startDate,
        endDate,
        branchFilter,
        statusFilter
      });

      try {
        setLocalError(null);
        await fetchReports({
          startDate,
          endDate,
          branchFilter,
          statusFilter
        });
      } catch (error: any) {
        console.error('❌ [REPORTS] Erro ao carregar relatórios:', error);
        setLocalError(error.message || 'Erro ao carregar relatórios');
      }
    };

    loadReports();
  }, [startDate, endDate, branchFilter, statusFilter, fetchReports]);

  // ========== CORREÇÃO PRINCIPAL AQUI ==========
  // Usar SOMENTE dados da API de relatórios, não os dados brutos do useData()
  const filteredServices = reportData?.services || [];

  console.log('📊 [REPORTS] Dados da API:', {
    totalDaAPI: reportData?.summary?.totalServices,
    servicosDaAPI: filteredServices.length,
    servicosCompletosDoSistema: services.length
  });

  // Estatísticas da API ou calculadas localmente APENAS dos serviços filtrados
  const totalServices = reportData?.summary?.totalServices || filteredServices.length;
  const completedServices = reportData?.summary?.completedServices || filteredServices.filter(s => s.status === 'CONCLUIDO').length;
  const pendingServices = reportData?.summary?.pendingServices || filteredServices.filter(s => 
    s.status === 'AGENDADO' || s.status === 'EM_ANDAMENTO' || s.status === 'PENDENTE'
  ).length;
  const canceledServices = reportData?.summary?.canceledServices || filteredServices.filter(s => s.status === 'CANCELADO').length;
  
  const completionRate = reportData?.summary?.completionRate || 
    (totalServices > 0 ? (completedServices / totalServices) * 100 : 0);
  const averageServicesPerDay = totalServices > 0 ? totalServices / 30 : 0;

  // Dados para gráficos - usar APENAS serviços filtrados
  const typeChartData = reportData?.breakdown?.byType || 
    Object.entries(
      filteredServices.reduce((acc, service) => {
        const type = service.tipoServico || 'OUTRO';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

  const statusChartData = reportData?.breakdown?.byStatus ||
    Object.entries(
      filteredServices.reduce((acc, service) => {
        const status = service.status || 'AGENDADO';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

  const branchChartData = reportData?.breakdown?.byBranch ||
    Object.entries(
      filteredServices.reduce((acc, service) => {
        const machine = machines.find(m => m.id === service.maquinaId);
        const branch = machine?.filial || 'Não especificada';
        acc[branch] = (acc[branch] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

  const technicianChartData = reportData?.breakdown?.topTechnicians ||
    Object.entries(
      filteredServices.reduce((acc, service) => {
        const tech = service.tecnicoNome || 'Desconhecido';
        acc[tech] = (acc[tech] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const handleGeneratePDF = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      const reportTitle = `Relatório de Serviços - ${
        isValid(startDateObj) ? format(startDateObj, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'
      } a ${
        isValid(endDateObj) ? format(endDateObj, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida'
      }`;
      
      await generatePDF(reportRef.current, reportTitle);
      
      toast({
        title: "Relatório gerado!",
        description: "O PDF foi baixado com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleRefreshReports = async () => {
    try {
      setLocalError(null);
      await fetchReports({
        startDate,
        endDate,
        branchFilter,
        statusFilter
      });
      toast({
        title: "Relatório atualizado!",
        description: "Os dados foram atualizados com sucesso.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar relatório:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o relatório.",
        variant: "destructive",
      });
    }
  };

  const formatDateSafe = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';
    } catch {
      return 'Data inválida';
    }
  };

  const formatCurrentDate = (date: Date) => {
    return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';
  };

  // ========== CORREÇÃO CRÍTICA AQUI ==========
  // Serviços filtrados para a tabela - usar APENAS filteredServices
  const displayedServices = filteredServices
    .filter(service => {
      if (searchTerm) {
        const machine = machines.find(m => m.id === service.maquinaId);
        return (
          service.descricaoServico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.tecnicoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine?.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    })
    .slice(0, 50);

  const isLoading = isLoadingReports;
  const error = reportError || localError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios detalhados de serviços e manutenções</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshReports}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? 'Carregando...' : 'Atualizar'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || filteredServices.length === 0}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {isGeneratingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Mensagens de erro/status */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao carregar relatórios</p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleRefreshReports}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de carregamento */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
            <p>Carregando relatórios...</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange">Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="thismonth">Este mês</SelectItem>
                  <SelectItem value="lastmonth">Mês anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="branchFilter">Filial</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as filiais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="AGENDADO">Agendado</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="search" className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4" />
              Buscar
            </Label>
            <Input
              placeholder="Buscar por técnico, máquina ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatCurrentDate(new Date(startDate))} a {formatCurrentDate(new Date(endDate))}
              </span>
              {branchFilter !== 'all' && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {branchFilter}
                </span>
              )}
            </div>
            <Badge variant="outline">
              {filteredServices.length} {filteredServices.length === 1 ? 'serviço' : 'serviços'} encontrados
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6 bg-white p-4 rounded-lg border">
        <div className="pdf-header hidden print:block">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Neuropsicocentro - Relatório de Serviços</h1>
            <p className="text-muted-foreground">Sistema de Gestão de Ar Condicionado</p>
            <div className="mt-2 text-sm">
              Período: {formatCurrentDate(new Date(startDate))} a {formatCurrentDate(new Date(endDate))}
              {branchFilter !== 'all' && ` • Filial: ${branchFilter}`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          <Separator className="mb-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServices}</div>
              <p className="text-xs text-muted-foreground">
                no período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {completedServices} de {totalServices} serviços concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingServices}</div>
              <p className="text-xs text-muted-foreground">
                aguardando execução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageServicesPerDay.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                serviços por dia
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Serviços por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhamento dos Serviços
            </CardTitle>
            <CardDescription>
              Lista completa de serviços no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {isLoading ? 'Carregando serviços...' : 'Nenhum serviço encontrado com os filtros aplicados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedServices.map((service) => {
                      const machine = machines.find(m => m.id === service.maquinaId);
                      return (
                        <TableRow key={service.id}>
                          <TableCell>
                            {formatDateSafe(service.dataAgendamento)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {machine?.codigo || 'N/A'} - {machine?.modelo || 'Desconhecido'}
                          </TableCell>
                          <TableCell>{service.tecnicoNome || 'Desconhecido'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {service.tipoServico || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {service.descricaoServico || 'Sem descrição'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                service.status === 'CONCLUIDO' ? 'default' :
                                service.status === 'CANCELADO' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {service.status || 'AGENDADO'}
                            </Badge>
                          </TableCell>
                          <TableCell>{machine?.filial || 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {displayedServices.length > 50 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Mostrando 50 de {displayedServices.length} serviços. Exporte o PDF para ver todos.
              </div>
            )}
          </CardContent>
        </Card>

        {branchChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Serviços por Filial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchChartData.map(({ name, value }, index) => (
                  <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-muted-foreground">{value} serviços</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {totalServices > 0 ? ((value / totalServices) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {technicianChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {technicianChartData.map(({ name, value }, index) => {
                  const maxValue = Math.max(...technicianChartData.map(t => t.value));
                  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">{value} serviços realizados</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pdf-footer hidden print:block mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Ar Condicionado - Neuropsicocentro</p>
          <p className="mt-1">Para mais informações, entre em contato com a administração</p>
        </div>
      </div>

      <div className="print:hidden">
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileDown className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Dica: Exporte para PDF</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Exportar PDF" para baixar um relatório completo com todos os dados e gráficos.
                  O PDF será gerado com qualidade para impressão e incluirá todas as informações visíveis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}