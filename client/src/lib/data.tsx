import { createContext, useContext, useState, useEffect } from 'react';
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
  isLoadingMachinesInitial: boolean;
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
  refetchAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [machinesInitialLoad, setMachinesInitialLoad] = useState(true);

  // ========== TÉCNICOS ==========
  const { 
    data: techniciansData = [], 
    isLoading: isLoadingTechnicians,
    error: errorTechnicians,
    refetch: refetchTechnicians
  } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando técnicos...');
        const response = await api.get('/technicians');
        console.log('✅ [DATA] Técnicos recebidos:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar técnicos:', error.message);
        return [];
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Técnico criado com sucesso');
      queryClient.setQueryData(['technicians'], (old: any[] = []) => {
        return [...old, response.data.data];
      });
      setTimeout(() => refetchTechnicians(), 300);
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/technicians/${id}`, data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Técnico atualizado com sucesso');
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.map(tech => tech.id === response.data.data?.id ? response.data.data : tech)
      );
      setTimeout(() => refetchTechnicians(), 300);
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Técnico deletado com sucesso');
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.filter(tech => tech.id !== id)
      );
      setTimeout(() => refetchTechnicians(), 300);
    },
  });

  // ========== MÁQUINAS ==========
  const { 
    data: machinesData = [], 
    isLoading: isLoadingMachines,
    error: errorMachines,
    refetch: refetchMachines,
    isFetching: isFetchingMachines
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando máquinas...');
        const startTime = Date.now();
        const response = await api.get('/machines');
        const endTime = Date.now();
        console.log(`✅ [DATA] Máquinas recebidas em ${endTime - startTime}ms:`, response.data.data?.length || 0);
        
        if (response.data.data && response.data.data.length > 0) {
          console.log('📋 [DATA] Primeira máquina:', {
            id: response.data.data[0].id,
            codigo: response.data.data[0].codigo,
            modelo: response.data.data[0].modelo,
            marca: response.data.data[0].marca
          });
        }
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar máquinas:', error.message);
        console.error('❌ [DATA] Status:', error.response?.status);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!isLoadingMachines) {
      if (machinesData.length > 0) {
        console.log('✅ [DATA] Máquinas carregadas com sucesso:', machinesData.length);
      }
      // Após 1 segundo, marca como carregado (mesmo se vazio)
      const timer = setTimeout(() => {
        setMachinesInitialLoad(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMachines, machinesData]);

  const createMachineMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('📤 [DATA] Criando máquina:', data);
      return api.post('/machines', data);
    },
    onSuccess: (response) => {
      console.log('✅ [DATA] Máquina criada com sucesso:', response.data.data?.id);
      
      // Atualização otimista - mostra imediatamente
      queryClient.setQueryData(['machines'], (old: any[] = []) => {
        const newData = [...old, response.data.data];
        console.log('🔄 [DATA] Cache atualizado instantaneamente');
        return newData;
      });
      
      // Sincronizar com backend após 300ms
      setTimeout(() => {
        console.log('🔄 [DATA] Sincronizando com backend...');
        refetchMachines();
      }, 300);
    },
    onError: (error: any) => {
      console.error('❌ [DATA] Erro ao criar máquina:', error.message);
    }
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      console.log('📤 [DATA] Atualizando máquina:', id);
      return api.put(`/machines/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('✅ [DATA] Máquina atualizada com sucesso');
      
      // Atualização otimista
      queryClient.setQueryData(['machines'], (old: any[] = []) => 
        old.map(machine => 
          machine.id === response.data.data?.id ? response.data.data : machine
        )
      );
      
      setTimeout(() => refetchMachines(), 300);
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('📤 [DATA] Deletando máquina:', id);
      return api.delete(`/machines/${id}`);
    },
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Máquina deletada com sucesso');
      
      // Atualização otimista
      queryClient.setQueryData(['machines'], (old: any[] = []) => 
        old.filter(machine => machine.id !== id)
      );
      
      setTimeout(() => refetchMachines(), 300);
    },
  });

  // ========== SERVIÇOS ==========
  const { 
    data: servicesData = [], 
    isLoading: isLoadingServices,
    error: errorServices,
    refetch: refetchServices
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando serviços...');
        const response = await api.get('/services');
        console.log('✅ [DATA] Serviços recebidos:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar serviços:', error.message);
        return [];
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/services', data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Serviço criado com sucesso');
      queryClient.setQueryData(['services'], (old: any[] = []) => {
        return [...old, response.data.data];
      });
      setTimeout(() => refetchServices(), 300);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/services/${id}`, data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Serviço atualizado com sucesso');
      queryClient.setQueryData(['services'], (old: any[] = []) => 
        old.map(service => 
          service.id === response.data.data?.id ? response.data.data : service
        )
      );
      setTimeout(() => refetchServices(), 300);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Serviço deletado com sucesso');
      queryClient.setQueryData(['services'], (old: any[] = []) => 
        old.filter(service => service.id !== id)
      );
      setTimeout(() => refetchServices(), 300);
    },
  });

  // ========== DASHBOARD STATS ==========
  const { 
    data: dashboardStatsData = {}, 
    isLoading: isLoadingStats,
    error: errorStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando estatísticas...');
        const response = await api.get('/dashboard/stats');
        console.log('✅ [DATA] Estatísticas recebidas');
        return response.data.data || {};
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar estatísticas:', error.message);
        return {};
      }
    },
    retry: 2,
    staleTime: 1000 * 60,
    cacheTime: 1000 * 60 * 5,
  });

  // Função para refetch de tudo
  const refetchAll = () => {
    console.log('🔄 [DATA] Refetch de todos os dados...');
    refetchTechnicians();
    refetchMachines();
    refetchServices();
    refetchStats();
  };

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
    isLoadingMachinesInitial: machinesInitialLoad && (isLoadingMachines || isFetchingMachines),
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
    refetchAll,
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