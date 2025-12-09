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

// Função para criar uma versão simplificada do HTML para PDF
const createSimpleHTMLForPDF = (reportContent: HTMLElement, reportTitle: string, startDate: string, endDate: string, branchFilter: string) => {
  // Clone o conteúdo
  const simpleContent = reportContent.cloneNode(true) as HTMLElement;
  
  // Remove todos os elementos complexos que podem causar problemas
  const elementsToRemove = [
    '.pdf-header',
    '.pdf-footer',
    'style',
    'script',
    'link[rel="stylesheet"]',
    '[class*="okl"]',
    '[style*="okl"]',
    '[class*="var(--"]',
    '[style*="var(--"]'
  ];
  
  elementsToRemove.forEach(selector => {
    simpleContent.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Remove todas as classes e atributos de estilo
  simpleContent.querySelectorAll('*').forEach((el: any) => {
    if (el.removeAttribute) {
      el.removeAttribute('class');
      el.removeAttribute('style');
    }
    
    // Aplica estilos básicos inline
    if (el.style) {
      el.style.fontFamily = 'Arial, Helvetica, sans-serif';
      el.style.color = '#000000';
      el.style.backgroundColor = 'transparent';
      el.style.border = 'none';
      el.style.boxShadow = 'none';
    }
  });
  
  // Cria um container HTML simples
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle}</title>
        <style>
          * { 
            font-family: Arial, Helvetica, sans-serif !important; 
            color: #000000 !important;
            background-color: transparent !important;
          }
          body { margin: 20px; padding: 0; }
          .report-title { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: center;
            margin-bottom: 10px;
          }
          .report-subtitle { 
            font-size: 14px; 
            text-align: center;
            color: #666666 !important;
            margin-bottom: 20px;
          }
          .report-header {
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .stats-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-card {
            flex: 1;
            min-width: 200px;
            border: 1px solid #cccccc;
            border-radius: 4px;
            padding: 15px;
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
          }
          .stat-label {
            font-size: 12px;
            color: #666666 !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f5f5f5 !important;
            border: 1px solid #cccccc;
            padding: 8px;
            text-align: left;
            font-weight: bold;
          }
          td {
            border: 1px solid #cccccc;
            padding: 8px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge-completed { background-color: #d1fae5 !important; color: #065f46 !important; }
          .badge-canceled { background-color: #fee2e2 !important; color: #991b1b !important; }
          .badge-pending { background-color: #dbeafe !important; color: #1e40af !important; }
          .page-break { page-break-after: always; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">Neuropsicocentro - Relatório de Serviços</div>
          <div class="report-subtitle">Sistema de Gestão de Ar Condicionado</div>
          <div style="text-align: center; font-size: 12px; color: #666666 !important;">
            Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
            ${branchFilter !== 'all' ? ` • Filial: ${branchFilter}` : ''}
          </div>
          <div style="text-align: center; font-size: 11px; color: #999999 !important; margin-top: 5px;">
            Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
        
        ${simpleContent.innerHTML}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #cccccc; font-size: 10px; text-align: center; color: #999999 !important;">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Ar Condicionado - Neuropsicocentro</p>
          <p>Para mais informações, entre em contato com a administração</p>
        </div>
      </body>
    </html>
  `;
  
  return html;
};

const generatePDF = async (reportContent: HTMLElement, reportTitle: string, startDate: string, endDate: string, branchFilter: string) => {
  try {
    console.log('🖨️ [PDF] Iniciando geração do PDF...');
    
    // Cria HTML simplificado sem estilos problemáticos
    const simpleHTML = createSimpleHTMLForPDF(reportContent, reportTitle, startDate, endDate, branchFilter);
    
    // Cria um iframe oculto para renderizar o HTML simplificado
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '210mm'; // Largura A4
    iframe.style.height = '297mm'; // Altura A4
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Escreve o HTML no iframe
    iframe.contentDocument?.write(simpleHTML);
    iframe.contentDocument?.close();
    
    // Aguarda o carregamento
    await new Promise(resolve => {
      iframe.onload = resolve;
      // Fallback timeout
      setTimeout(resolve, 1000);
    });
    
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    // Usa o body do iframe para capturar
    const iframeBody = iframe.contentDocument?.body;
    if (!iframeBody) throw new Error('Não foi possível acessar o conteúdo do PDF');
    
    // Configuração MÍNIMA do html2canvas
    const canvas = await html2canvas(iframeBody, {
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: true,
      allowTaint: false,
      foreignObjectRendering: false,
      ignoreElements: (element) => false,
      onclone: (clonedDoc) => {
        // Remove qualquer estilo remanescente
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.cssText = '';
          }
        });
      }
    });

    console.log('✅ [PDF] Canvas criado');

    const imgData = canvas.toDataURL('image/jpeg', 0.9); // Usa JPEG com 90% de qualidade
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Ajusta a imagem para caber na página
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPos = 10;
    const maxHeight = pageHeight - 20;
    
    if (imgHeight <= maxHeight) {
      // Cabe em uma página
      pdf.addImage(imgData, 'JPEG', 10, yPos, imgWidth, imgHeight);
    } else {
      // Divide em múltiplas páginas
      let remainingHeight = imgHeight;
      let currentPage = 1;
      
      while (remainingHeight > 0) {
        const pageImgHeight = Math.min(remainingHeight, maxHeight);
        
        pdf.addImage(
          imgData, 
          'JPEG', 
          10, 
          10, 
          imgWidth, 
          imgHeight,
          undefined,
          undefined,
          -((imgHeight - remainingHeight) * (pageWidth - 20) / imgWidth)
        );
        
        remainingHeight -= pageImgHeight;
        
        if (remainingHeight > 0) {
          pdf.addPage();
          currentPage++;
        }
      }
    }

    // Remove o iframe
    document.body.removeChild(iframe);

    console.log('✅ [PDF] PDF gerado com sucesso');
    pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
    
    return true;
  } catch (error: any) {
    console.error('❌ [PDF] Erro ao gerar PDF:', error);
    console.error('❌ [PDF] Mensagem:', error.message);
    
    // Fallback: método alternativo sem html2canvas
    if (error.message.includes('okl') || error.message.includes('color')) {
      try {
        await generateSimpleTextPDF(reportTitle, startDate, endDate, branchFilter);
        return true;
      } catch (fallbackError) {
        throw new Error('Não foi possível gerar o PDF. Tente exportar os dados em CSV.');
      }
    }
    
    throw error;
  }
};

// Método de fallback: PDF baseado em texto
const generateSimpleTextPDF = async (reportTitle: string, startDate: string, endDate: string, branchFilter: string) => {
  const jsPDF = (await import('jspdf')).default;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Título
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Neuropsicocentro - Relatório de Serviços', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Gestão de Ar Condicionado', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Período
  pdf.setFontSize(10);
  pdf.text(`Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`, 20, yPos);
  if (branchFilter !== 'all') {
    pdf.text(`Filial: ${branchFilter}`, pageWidth - 20, yPos, { align: 'right' });
  }
  yPos += 10;
  
  pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, yPos);
  yPos += 15;
  
  // Linha divisória
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;
  
  // Mensagem informativa
  pdf.setFontSize(11);
  pdf.text('Relatório de serviços disponível apenas em formato digital.', 20, yPos);
  yPos += 7;
  pdf.text('Para visualizar gráficos e tabelas detalhadas, acesse o sistema online.', 20, yPos);
  yPos += 15;
  
  pdf.setFontSize(10);
  pdf.text('Para exportar os dados completos:', 20, yPos);
  yPos += 7;
  pdf.text('1. Acesse a página de relatórios no sistema', 25, yPos);
  yPos += 5;
  pdf.text('2. Utilize os filtros para selecionar o período desejado', 25, yPos);
  yPos += 5;
  pdf.text('3. Clique em "Exportar CSV" para baixar os dados', 25, yPos);
  yPos += 15;
  
  // Footer
  pdf.setFontSize(8);
  pdf.text('Relatório gerado automaticamente pelo Sistema de Gestão de Ar Condicionado - Neuropsicocentro', pageWidth / 2, 280, { align: 'center' });
  pdf.text('Para mais informações, entre em contato com a administração', pageWidth / 2, 285, { align: 'center' });
  
  pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
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

    setStartDate(start);
    setEndDate(end);
  }, [dateRange]);

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

  // ========== DADOS DA API ==========
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

  // Dados para gráficos
  const typeChartData = breakdown.byType;
  const statusChartData = breakdown.byStatus;
  const branchChartData = breakdown.byBranch;
  const technicianChartData = breakdown.topTechnicians;

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
      
      await generatePDF(reportRef.current, reportTitle, startDate, endDate, branchFilter);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "O arquivo foi baixado.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.message || "Não foi possível gerar o PDF. Tente exportar em CSV.",
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

  // Serviços filtrados para a tabela
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
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-700">Erro ao carregar relatórios</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
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
        <Card className="border-blue-200">
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
            <p className="text-blue-700">Carregando relatórios...</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange" className="text-gray-700">Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-gray-300">
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
                  <Label htmlFor="startDate" className="text-gray-700">Data Inicial</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-gray-700">Data Final</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="branchFilter" className="text-gray-700">Filial</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="border-gray-300">
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
              <Label htmlFor="statusFilter" className="text-gray-700">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300">
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
            <Label htmlFor="search" className="flex items-center gap-2 mb-2 text-gray-700">
              <Search className="h-4 w-4" />
              Buscar
            </Label>
            <Input
              placeholder="Buscar por técnico, máquina ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-gray-300"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
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
            <Badge variant="outline" className="border-gray-300 text-gray-700">
              {filteredServices.length} {filteredServices.length === 1 ? 'serviço' : 'serviços'} encontrados
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6 bg-white p-4 rounded-lg border border-gray-300 pdf-content">
        {/* Este conteúdo será convertido para PDF */}
        {!isLoading && filteredServices.length > 0 && (
          <>
            <div className="stats-container">
              <div className="stat-card">
                <div className="text-gray-600">Total de Serviços</div>
                <div className="stat-value">{totalServices}</div>
                <div className="stat-label">no período selecionado</div>
              </div>
              
              <div className="stat-card">
                <div className="text-gray-600">Taxa de Conclusão</div>
                <div className="stat-value">{completionRate.toFixed(1)}%</div>
                <div className="stat-label">{completedServices} de {totalServices} concluídos</div>
              </div>
              
              <div className="stat-card">
                <div className="text-gray-600">Serviços Pendentes</div>
                <div className="stat-value">{pendingServices}</div>
                <div className="stat-label">aguardando execução</div>
              </div>
              
              <div className="stat-card">
                <div className="text-gray-600">Média Diária</div>
                <div className="stat-value">{averageServicesPerDay.toFixed(1)}</div>
                <div className="stat-label">serviços por dia</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Máquina</th>
                  <th>Técnico</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Filial</th>
                </tr>
              </thead>
              <tbody>
                {displayedServices.map((service) => {
                  const machine = machines.find(m => m.id === service.maquinaId);
                  return (
                    <tr key={service.id}>
                      <td>{formatDateSafe(service.dataAgendamento)}</td>
                      <td>{service.machineCodigo || machine?.codigo || 'N/A'} - {service.machineModelo || machine?.modelo || 'Desconhecido'}</td>
                      <td>{service.tecnicoNome || 'Desconhecido'}</td>
                      <td>{service.tipoServico || 'N/A'}</td>
                      <td>{service.descricaoServico || 'Sem descrição'}</td>
                      <td>
                        <span className={`badge ${
                          service.status === 'CONCLUIDO' ? 'badge-completed' :
                          service.status === 'CANCELADO' ? 'badge-canceled' :
                          'badge-pending'
                        }`}>
                          {service.status || 'AGENDADO'}
                        </span>
                      </td>
                      <td>{service.machineFilial || machine?.filial || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {!isLoading && filteredServices.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-600 mb-4">Nenhum serviço encontrado</div>
            <div className="text-sm text-gray-500">
              Não há serviços no período selecionado com os filtros aplicados.
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden">
        <Card className="border-dashed border-gray-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileDown className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-800">Dica: Exporte para PDF</p>
                <p className="text-sm text-gray-600">
                  Clique em "Exportar PDF" para baixar um relatório completo. 
                  Se encontrar problemas, utilize a função de exportação em CSV.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}