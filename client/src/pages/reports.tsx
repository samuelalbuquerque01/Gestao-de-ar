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

const safeDateFormat = (dateString: any): string => {
  if (!dateString) return 'Data não informada';
  
  try {
    if (typeof dateString === 'string' && dateString.trim() === '') {
      return 'Data não informada';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Data não informada';
    }
    
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error('[ERRO] Erro ao formatar data:', error);
    return 'Data não informada';
  }
};

const safeDateTimeFormat = (dateString: any): string => {
  if (!dateString) return 'Data/hora não informada';
  
  try {
    if (typeof dateString === 'string' && dateString.trim() === '') {
      return 'Data/hora não informada';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Data/hora não informada';
    }
    
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('[ERRO] Erro ao formatar data/hora:', error);
    return 'Data/hora não informada';
  }
};

const generatePDF = async (
  reportTitle: string,
  startDate: string,
  endDate: string,
  branchFilter: string,
  statusFilter: string,
  summary: any,
  services: any[]
) => {
  try {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const cleanText = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/Ã¡/g, 'á')
        .replace(/Ã /g, 'à')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã¤/g, 'ä')
        .replace(/é/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã´/g, 'ô')
        .replace(/Ãµ/g, 'õ')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã§/g, 'ç')
        .replace(/Â/g, '')
        .replace(/•/g, '-')
        .replace(/â€“|â€”/g, '-')
        .trim();
    };

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = 10;

    const ensureSpace = (space: number) => {
      if (y + space > pageHeight - 10) {
        pdf.addPage();
        drawHeader();
      }
    };

    const drawHeader = () => {
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 22, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(cleanText(reportTitle), margin, 9);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, margin, 15);
      pdf.setTextColor(0, 0, 0);
      y = 30;
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(title, margin, y);
      y += 2;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y + 1, pageWidth - margin, y + 1);
      y += 6;
    };

    const drawInfoLine = (label: string, value: string) => {
      ensureSpace(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cleanText(value), margin + 22, y);
      y += 5;
    };

    const drawMetric = (x: number, title: string, value: string) => {
      const w = (pageWidth - margin * 2 - 6) / 2;
      const h = 16;
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(title, x + 3, y + 5);
      pdf.setFontSize(12);
      pdf.text(value, x + 3, y + 12);
    };

    drawHeader();

    drawSectionTitle('Resumo Executivo');
    drawMetric(margin, 'Total de servicos', String(summary.totalServices || 0));
    drawMetric(margin + ((pageWidth - margin * 2 - 6) / 2) + 6, 'Taxa de conclusao', `${Number(summary.completionRate || 0).toFixed(1)}%`);
    y += 20;
    drawMetric(margin, 'Pendentes', String(summary.pendingServices || 0));
    drawMetric(margin + ((pageWidth - margin * 2 - 6) / 2) + 6, 'Concluidos', String(summary.completedServices || 0));
    y += 22;

    drawSectionTitle('Filtros Aplicados');
    drawInfoLine('Periodo', `${safeDateFormat(startDate)} a ${safeDateFormat(endDate)}`);
    drawInfoLine('Filial', branchFilter === 'all' ? 'Todas' : branchFilter);
    drawInfoLine('Status', statusFilter === 'all' ? 'Todos' : statusFilter);
    drawInfoLine('Registros', `${services.length} servicos`);

    drawSectionTitle('Detalhamento de Servicos');
    const colX = [margin, 30, 65, 115, 150, 178];
    const colW = [20, 35, 50, 35, 28, 20];
    const headers = ['Data', 'Maquina', 'Tecnico', 'Tipo', 'Status', 'Filial'];

    const drawTableHeader = () => {
      ensureSpace(8);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 4.5, pageWidth - margin * 2, 6, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      headers.forEach((header, i) => {
        pdf.text(header, colX[i] + 1, y);
      });
      y += 4;
      pdf.setDrawColor(235, 235, 235);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 2;
    };

    drawTableHeader();

    services.forEach((service, index) => {
      const row = [
        safeDateFormat(service.dataAgendamento),
        cleanText(`${service.machineCodigo || '-'} ${service.machineModelo ? `- ${service.machineModelo}` : ''}`),
        cleanText(service.tecnicoNome || '-'),
        cleanText(service.tipoServico || '-'),
        cleanText(service.status || '-'),
        cleanText(service.machineFilial || '-')
      ];

      const wrapped = row.map((cell, i) => pdf.splitTextToSize(cell, colW[i] - 2));
      const lineCount = Math.max(...wrapped.map((lines) => lines.length));
      const rowHeight = Math.max(5, lineCount * 3.5 + 1.5);

      if (y + rowHeight > pageHeight - 10) {
        pdf.addPage();
        drawHeader();
        drawSectionTitle('Detalhamento de Servicos (continuacao)');
        drawTableHeader();
      }

      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, y - 3.5, pageWidth - margin * 2, rowHeight, 'F');
      }

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      wrapped.forEach((cellLines, i) => {
        pdf.text(cellLines, colX[i] + 1, y);
      });

      y += rowHeight;
      pdf.setDrawColor(235, 235, 235);
      pdf.line(margin, y - 1, pageWidth - margin, y - 1);
    });

    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Pagina ${i} de ${pageCount}`, pageWidth - 35, pageHeight - 6);
    }

    pdf.save(`${cleanText(reportTitle).replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
    return true;
  } catch (error: any) {
    console.error('[PDF] Erro ao gerar PDF:', error);
    console.error('[PDF] Mensagem:', error?.message);
    throw new Error('Nao foi possivel gerar o PDF. Tente novamente.');
  }
};

export default function ReportsPage() {
  const { machines } = useData();
  const { toast } = useToast();
  const { 
    fetchReports, 
    reportData, 
    isLoading: isLoadingReports, 
    error: reportError 
  } = useReports();
  
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

    setStartDate(start);
    setEndDate(end);
  }, [dateRange]);

  useEffect(() => {
    const loadReports = async () => {
      if (!startDate || !endDate) {        return;
      }
      try {
        setLocalError(null);
        await fetchReports({
          startDate,
          endDate,
          branchFilter,
          statusFilter
        });
      } catch (error: any) {
        console.error('[ERRO] [REPORTS] Erro ao carregar relatórios:', error);
        setLocalError(error.message || 'Erro ao carregar relatórios');
      }
    };

    loadReports();
  }, [startDate, endDate, branchFilter, statusFilter, fetchReports]);

  const filteredServices = reportData?.services || [];
  const summary = reportData?.summary || {
    totalServices: 0,
    completedServices: 0,
    pendingServices: 0,
    canceledServices: 0,
    completionRate: 0,
    totalCost: 0,
    avgCostPerService: 0,
    urgentServices: 0
  };
  
  const breakdown = reportData?.breakdown || {
    byType: [],
    byStatus: [],
    byBranch: [],
    monthlyData: [],
    topTechnicians: [],
    topMachines: []
  };

  const totalServices = summary.totalServices;
  const completedServices = summary.completedServices;
  const pendingServices = summary.pendingServices;
  const canceledServices = summary.canceledServices;
  const completionRate = summary.completionRate;
  const averageServicesPerDay = totalServices > 0 ? totalServices / 30 : 0;

  const typeChartData = breakdown.byType;
  const statusChartData = breakdown.byStatus;
  const branchChartData = breakdown.byBranch;
  const technicianChartData = breakdown.topTechnicians;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const reportTitle = `Relatorio de Servicos - ${safeDateFormat(startDate)} a ${safeDateFormat(endDate)}`;

      await generatePDF(
        reportTitle,
        startDate,
        endDate,
        branchFilter,
        statusFilter,
        summary,
        filteredServices
      );
      
      toast({
        title: "Relatório gerado!",
        description: "O PDF foi baixado com sucesso.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Não foi possível gerar o PDF. Tente novamente.",
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

  const formatCurrentDate = (date: Date) => {
    return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';
  };

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
                {safeDateFormat(startDate)} a {safeDateFormat(endDate)}
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

      <div ref={reportRef} className="space-y-6 bg-white p-4 rounded-lg border simple-pdf">
        <div className="pdf-header hidden print:block">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-black">Neuropsicocentro - Relatório de Serviços</h1>
            <p className="text-gray-600">Sistema de Gestão de Ar Condicionado</p>
            <div className="mt-2 text-sm text-gray-700">
              Período: {safeDateFormat(startDate)} a {safeDateFormat(endDate)}
              {branchFilter !== 'all' && ` • Filial: ${branchFilter}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
          <Separator className="mb-4" />
        </div>

        {!isLoading && filteredServices.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black">Total de Serviços</CardTitle>
                  <Activity className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black">{totalServices}</div>
                  <p className="text-xs text-gray-600">
                    no período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black">Taxa de Conclusão</CardTitle>
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black">{completionRate.toFixed(1)}%</div>
                  <p className="text-xs text-gray-600">
                    {completedServices} de {totalServices} serviços concluídos
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black">Serviços Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black">{pendingServices}</div>
                  <p className="text-xs text-gray-600">
                    aguardando execução
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-black">Média Diária</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-black">{averageServicesPerDay.toFixed(1)}</div>
                  <p className="text-xs text-gray-600">
                    serviços por dia
                  </p>
                </CardContent>
              </Card>
            </div>

            {typeChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <BarChart3 className="h-5 w-5" />
                      Serviços por Tipo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={typeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#374151"
                          tick={{ fill: '#374151' }}
                        />
                        <YAxis 
                          stroke="#374151"
                          tick={{ fill: '#374151' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#ffffff',
                            border: '1px solid #d1d5db',
                            color: '#111827'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#4f46e5" 
                          name="Quantidade" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {statusChartData.length > 0 && (
                  <Card className="border border-gray-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-black">
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
                            label={({ name, count }) => `${name}: ${count}`}
                            outerRadius={80}
                            fill="#4f46e5"
                            dataKey="count"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#ffffff',
                              border: '1px solid #d1d5db',
                              color: '#111827'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Card className="border border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black">
                  <FileText className="h-5 w-5" />
                  Detalhamento dos Serviços
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Lista completa de serviços no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-gray-300">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="text-black font-medium">Data</TableHead>
                        <TableHead className="text-black font-medium">Máquina</TableHead>
                        <TableHead className="text-black font-medium">Técnico</TableHead>
                        <TableHead className="text-black font-medium">Tipo</TableHead>
                        <TableHead className="text-black font-medium">Descrição</TableHead>
                        <TableHead className="text-black font-medium">Status</TableHead>
                        <TableHead className="text-black font-medium">Filial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-600">
                            Nenhum serviço encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedServices.map((service, index) => {
                          const machine = machines.find(m => m.id === service.maquinaId);
                          return (
                            <TableRow 
                              key={service.id}
                              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                              <TableCell className="text-black">
                                {safeDateFormat(service.dataAgendamento)}
                              </TableCell>
                              <TableCell className="font-medium text-black">
                                {service.machineCodigo || machine?.codigo || 'N/A'} - {service.machineModelo || machine?.modelo || 'Desconhecido'}
                              </TableCell>
                              <TableCell className="text-black">{service.tecnicoNome || 'Desconhecido'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-gray-300 text-gray-700">
                                  {service.tipoServico || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-black">
                                {service.descricaoServico || 'Sem descrição'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    service.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800 border-green-200' :
                                    service.status === 'CANCELADO' ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-blue-100 text-blue-800 border-blue-200'
                                  }
                                >
                                  {service.status || 'AGENDADO'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-black">{service.machineFilial || machine?.filial || 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredServices.length > 50 && (
                  <div className="mt-4 text-center text-sm text-gray-600">
                    Mostrando 50 de {filteredServices.length} serviços. Exporte o PDF para ver todos.
                  </div>
                )}
              </CardContent>
            </Card>

            {branchChartData.length > 0 && (
              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Building className="h-5 w-5" />
                    Serviços por Filial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchChartData.map(({ name, count }, index) => (
                      <div key={name} className="flex items-center justify-between p-3 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Building className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-black">{name}</p>
                            <p className="text-sm text-gray-600">{count} serviços</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          {totalServices > 0 ? ((count / totalServices) * 100).toFixed(1) : 0}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {technicianChartData.length > 0 && (
              <Card className="border border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Users className="h-5 w-5" />
                    Top Técnicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {technicianChartData.map(({ name, count }, index) => {
                      const maxValue = Math.max(...technicianChartData.map(t => t.count));
                      const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
                      
                      return (
                        <div key={name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-800 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-black">{name}</p>
                              <p className="text-sm text-gray-600">{count} serviços realizados</p>
                            </div>
                          </div>
                          <div className="w-32">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full"
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
          </>
        )}

        {!isLoading && filteredServices.length === 0 && (
          <Card className="border border-gray-300">
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-black">Nenhum serviço encontrado</p>
              <p className="text-sm text-gray-600 mt-2">
                Não há serviços no período selecionado com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="pdf-footer hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 text-center">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Ar Condicionado - Neuropsicocentro</p>
          <p className="mt-1">Para mais informações, entre em contato com a administração</p>
        </div>
      </div>

      <div className="print:hidden">
        <Card className="border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileDown className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-black">Dica: Exporte para PDF</p>
                <p className="text-sm text-gray-600">
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



