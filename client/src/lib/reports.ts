import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  branchFilter?: string;
  statusFilter?: string;
  technicianId?: string;
  machineId?: string;
  serviceType?: string;
}

export interface ReportSummary {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  canceledServices: number;
  completionRate: number;
  totalCost: number;
  avgCostPerService: number;
  urgentServices: number;
}

export interface ReportData {
  summary: ReportSummary;
  breakdown: {
    byType: Array<{ name: string; count: number }>;
    byStatus: Array<{ name: string; count: number }>;
    byBranch: Array<{ name: string; count: number }>;
    monthlyData: Array<{ label: string; completed: number; pending: number; total: number }>;
    topTechnicians: Array<{ name: string; count: number }>;
    topMachines: Array<{ name: string; count: number }>;
  };
  services: Array<{
    id: string;
    tipoServico: string;
    descricaoServico: string;
    dataAgendamento: string;
    dataConclusao?: string;
    tecnicoNome: string;
    status: string;
    prioridade: string;
    custo: string;
    machineCodigo?: string;
    machineModelo?: string;
    machineFilial?: string;
    machineLocalizacao?: string;
  }>;
  filters: Partial<ReportFilters>;
}

export interface RealTimeStats {
  today: {
    total: number;
    completed: number;
    pending: number;
  };
  week: {
    total: number;
    completed: number;
    completionRate: number;
  };
  machines: {
    total: number;
    active: number;
    problems: number;
  };
  technicians: {
    total: number;
    active: number;
    topActive: Array<{ name: string; count: number }>;
  };
  alerts: {
    urgentServices: number;
    overdueServices: number;
  };
}

export const useReports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchReports = useCallback(async (filters: ReportFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 [REPORTS] Buscando relatórios com filtros:', filters);
      
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.branchFilter && filters.branchFilter !== 'all') 
        queryParams.append('branchFilter', filters.branchFilter);
      if (filters.statusFilter && filters.statusFilter !== 'all') 
        queryParams.append('statusFilter', filters.statusFilter);
      if (filters.technicianId) queryParams.append('technicianId', filters.technicianId);
      if (filters.machineId) queryParams.append('machineId', filters.machineId);
      if (filters.serviceType) queryParams.append('serviceType', filters.serviceType);
      
      const response = await api.get(`/reports/summary?${queryParams}`);
      
      console.log('📊 [REPORTS] Resposta completa:', response.data);
      
      if (response.data.success && response.data.data) {
        console.log('✅ [REPORTS] Relatório recebido com sucesso');
        console.log('📊 [REPORTS] Serviços recebidos:', response.data.data.services?.length);
        
        // ATUALIZA O ESTADO
        setReportData(response.data.data);
        
        return response.data.data;
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (err: any) {
      console.error('❌ [REPORTS] Erro ao buscar relatórios:', err);
      
      let errorMessage = 'Erro ao buscar relatórios';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRealTimeStats = useCallback(async (): Promise<RealTimeStats | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 [REPORTS] Buscando estatísticas em tempo real...');
      
      const response = await api.get('/reports/real-time-stats');
      
      if (response.data.success && response.data.data) {
        console.log('✅ [REPORTS] Estatísticas em tempo real recebidas');
        return response.data.data;
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (err: any) {
      console.error('❌ [REPORTS] Erro ao buscar estatísticas:', err);
      setError(err.message || 'Erro ao buscar estatísticas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportToCSV = useCallback(async (filters: ReportFilters): Promise<void> => {
    try {
      console.log('📤 [REPORTS] Exportando para CSV...');
      
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.branchFilter && filters.branchFilter !== 'all') 
        queryParams.append('branchFilter', filters.branchFilter);
      if (filters.statusFilter && filters.statusFilter !== 'all') 
        queryParams.append('statusFilter', filters.statusFilter);
      
      const response = await api.get(`/reports/export/csv?${queryParams}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ [REPORTS] CSV exportado com sucesso');
    } catch (err: any) {
      console.error('❌ [REPORTS] Erro ao exportar CSV:', err);
      throw err;
    }
  }, []);

  return {
    fetchReports,
    fetchRealTimeStats,
    exportToCSV,
    reportData,
    isLoading,
    error,
  };
};