// data.tsx - FRONTEND COMPLETO
import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DataContextType {
  technicians: any[];
  isLoadingTechnicians: boolean;
  errorTechnicians: any;
  createTechnician: (data: any) => Promise<any>;
  updateTechnician: (id: string, data: any) => Promise<any>;
  deleteTechnician: (id: string) => Promise<any>;
  
  machines: any[];
  isLoadingMachines: boolean;
  errorMachines: any;
  createMachine: (data: any) => Promise<any>;
  updateMachine: (id: string, data: any) => Promise<any>;
  deleteMachine: (id: string) => Promise<any>;
  
  services: any[];
  isLoadingServices: boolean;
  errorServices: any;
  createService: (data: any) => Promise<any>;
  updateService: (id: string, data: any) => Promise<any>;
  deleteService: (id: string) => Promise<any>;
  
  dashboardStats: any;
  isLoadingStats: boolean;
  errorStats: any;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // ========== TÉCNICOS ==========
  const { 
    data: techniciansData = [], 
    isLoading: isLoadingTechnicians,
    error: errorTechnicians 
  } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando técnicos...');
        const response = await api.get('/technicians');
        console.log('✅ [DATA] Técnicos carregados:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error) {
        console.error('❌ [DATA] Erro ao buscar técnicos:', error);
        return [];
      }
    },
    retry: 1,
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/technicians/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  // ========== MÁQUINAS ==========
  const { 
    data: machinesData = [], 
    isLoading: isLoadingMachines,
    error: errorMachines 
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando máquinas...');
        const response = await api.get('/machines');
        console.log('✅ [DATA] Máquinas carregadas:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error) {
        console.error('❌ [DATA] Erro ao buscar máquinas:', error);
        return [];
      }
    },
    retry: 1,
  });

  const createMachineMutation = useMutation({
    mutationFn: (data: any) => api.post('/machines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/machines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/machines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  // ========== SERVIÇOS ==========
  const { 
    data: servicesData = [], 
    isLoading: isLoadingServices,
    error: errorServices 
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando serviços...');
        const response = await api.get('/services');
        console.log('✅ [DATA] Serviços carregados:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error) {
        console.error('❌ [DATA] Erro ao buscar serviços:', error);
        return [];
      }
    },
    retry: 1,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // ========== DASHBOARD STATS ==========
  const { 
    data: dashboardStatsData = {}, 
    isLoading: isLoadingStats,
    error: errorStats 
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando estatísticas...');
        const response = await api.get('/dashboard/stats');
        console.log('✅ [DATA] Estatísticas carregadas:', response.data.data);
        return response.data.data || {};
      } catch (error) {
        console.error('❌ [DATA] Erro ao buscar estatísticas:', error);
        return {};
      }
    },
    retry: 1,
  });

  const value: DataContextType = {
    technicians: techniciansData,
    isLoadingTechnicians,
    errorTechnicians,
    createTechnician: createTechnicianMutation.mutateAsync,
    updateTechnician: (id: string, data: any) => 
      updateTechnicianMutation.mutateAsync({ id, data }),
    deleteTechnician: deleteTechnicianMutation.mutateAsync,
    
    machines: machinesData,
    isLoadingMachines,
    errorMachines,
    createMachine: createMachineMutation.mutateAsync,
    updateMachine: (id: string, data: any) => 
      updateMachineMutation.mutateAsync({ id, data }),
    deleteMachine: deleteMachineMutation.mutateAsync,
    
    services: servicesData,
    isLoadingServices,
    errorServices,
    createService: createServiceMutation.mutateAsync,
    updateService: (id: string, data: any) => 
      updateServiceMutation.mutateAsync({ id, data }),
    deleteService: deleteServiceMutation.mutateAsync,
    
    dashboardStats: dashboardStatsData,
    isLoadingStats,
    errorStats,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
}