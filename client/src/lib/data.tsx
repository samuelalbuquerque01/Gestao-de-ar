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
  refetchAll: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

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
        const response = await api.get('/technicians'); // ← API já adiciona /api automaticamente
        console.log('✅ [DATA] Técnicos carregados:', response.data.data?.length || 0);
        
        if (response.data.data && response.data.data.length > 0) {
          console.log('📋 [DATA] Exemplo técnico:', {
            id: response.data.data[0].id,
            nome: response.data.data[0].nome
          });
        }
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar técnicos:', error.message);
        console.error('❌ [DATA] Status:', error.response?.status);
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 30, // 30 segundos
    cacheTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true, // Recarrega quando volta para a aba
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Técnico criado com sucesso:', response.data.data?.id);
      
      // Atualizar cache IMEDIATAMENTE
      queryClient.setQueryData(['technicians'], (old: any[] = []) => {
        const newData = [...old, response.data.data];
        console.log('🔄 [DATA] Cache técnicos atualizado, total:', newData.length);
        return newData;
      });
      
      // Forçar refetch após 100ms para sincronização
      setTimeout(() => refetchTechnicians(), 100);
    },
    onError: (error: any) => {
      console.error('❌ [DATA] Erro ao criar técnico:', error.message);
      console.error('❌ [DATA] Dados do erro:', error.response?.data);
    }
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      api.put(`/technicians/${id}`, data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Técnico atualizado com sucesso');
      
      // Atualizar cache
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.map(tech => 
          tech.id === response.data.data?.id ? response.data.data : tech
        )
      );
      
      setTimeout(() => refetchTechnicians(), 100);
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Técnico deletado com sucesso');
      
      // Remover do cache
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.filter(tech => tech.id !== id)
      );
      
      setTimeout(() => refetchTechnicians(), 100);
    },
  });

  // ========== MÁQUINAS ==========
  const { 
    data: machinesData = [], 
    isLoading: isLoadingMachines,
    error: errorMachines,
    refetch: refetchMachines
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      try {
        console.log('📊 [DATA] Buscando máquinas...');
        const response = await api.get('/machines'); // ← API já adiciona /api automaticamente
        console.log('✅ [DATA] Máquinas carregadas:', response.data.data?.length || 0);
        
        if (response.data.data && response.data.data.length > 0) {
          const machine = response.data.data[0];
          console.log('📋 [DATA] Exemplo máquina:', {
            id: machine.id,
            codigo: machine.codigo,
            modelo: machine.modelo,
            marca: machine.marca,
            tipo: machine.tipo
          });
          
          // DEBUG: Verificar TODOS os campos da primeira máquina
          console.log('🔍 [DATA] Todos os campos da primeira máquina:', Object.keys(machine).map(key => ({
            key,
            value: machine[key],
            type: typeof machine[key]
          })));
        } else {
          console.log('📋 [DATA] Nenhuma máquina encontrada');
        }
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar máquinas:', error.message);
        console.error('❌ [DATA] Status:', error.response?.status);
        console.error('❌ [DATA] Response data:', error.response?.data);
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 30,
    cacheTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const createMachineMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('📤 [DATA] Criando máquina com dados:', JSON.stringify(data, null, 2));
      return api.post('/machines', data);
    },
    onSuccess: (response) => {
      console.log('✅ [DATA] Máquina criada com sucesso:', response.data.data?.id);
      
      // DEBUG: Verificar os dados retornados
      console.log('📋 [DATA] Dados retornados da criação:', response.data.data);
      
      // Atualizar cache IMEDIATAMENTE
      queryClient.setQueryData(['machines'], (old: any[] = []) => {
        const newData = [...old, response.data.data];
        console.log('🔄 [DATA] Cache máquinas atualizado, total:', newData.length);
        return newData;
      });
      
      // Forçar refetch após 100ms para sincronização
      setTimeout(() => {
        console.log('🔄 [DATA] Forçando refetch de máquinas...');
        refetchMachines();
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ [DATA] Erro ao criar máquina:', error.message);
      console.error('❌ [DATA] Dados do erro:', error.response?.data);
      console.error('❌ [DATA] Status:', error.response?.status);
    }
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      console.log('📤 [DATA] Atualizando máquina:', id, JSON.stringify(data, null, 2));
      return api.put(`/machines/${id}`, data);
    },
    onSuccess: (response) => {
      console.log('✅ [DATA] Máquina atualizada com sucesso');
      
      // Atualizar cache
      queryClient.setQueryData(['machines'], (old: any[] = []) => 
        old.map(machine => 
          machine.id === response.data.data?.id ? response.data.data : machine
        )
      );
      
      setTimeout(() => refetchMachines(), 100);
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('📤 [DATA] Deletando máquina:', id);
      return api.delete(`/machines/${id}`);
    },
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Máquina deletada com sucesso');
      
      // Remover do cache
      queryClient.setQueryData(['machines'], (old: any[] = []) => 
        old.filter(machine => machine.id !== id)
      );
      
      setTimeout(() => refetchMachines(), 100);
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
        const response = await api.get('/services'); // ← API já adiciona /api automaticamente
        console.log('✅ [DATA] Serviços carregados:', response.data.data?.length || 0);
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar serviços:', error.message);
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 30,
    cacheTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/services', data),
    onSuccess: (response) => {
      console.log('✅ [DATA] Serviço criado com sucesso:', response.data.data?.id);
      
      // Atualizar cache
      queryClient.setQueryData(['services'], (old: any[] = []) => {
        return [...old, response.data.data];
      });
      
      setTimeout(() => refetchServices(), 100);
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
      
      setTimeout(() => refetchServices(), 100);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: (_, id) => {
      console.log('✅ [DATA] Serviço deletado com sucesso');
      
      queryClient.setQueryData(['services'], (old: any[] = []) => 
        old.filter(service => service.id !== id)
      );
      
      setTimeout(() => refetchServices(), 100);
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
        const response = await api.get('/dashboard/stats'); // ← API já adiciona /api automaticamente
        console.log('✅ [DATA] Estatísticas carregadas:', response.data.data);
        return response.data.data || {};
      } catch (error: any) {
        console.error('❌ [DATA] Erro ao buscar estatísticas:', error.message);
        return {};
      }
    },
    retry: 1,
    staleTime: 1000 * 30,
    cacheTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
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