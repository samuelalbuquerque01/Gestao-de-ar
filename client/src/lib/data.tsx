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
  refetchAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);


const checkToken = () => {
  const token = localStorage.getItem('token');
  const isValid = token && token !== 'undefined' && token.length > 10;
  return isValid;
};

const waitForValidToken = async (maxWait = 3000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    if (checkToken()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Espera 200ms
  }
  return false;
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [machinesInitialLoad, setMachinesInitialLoad] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  useEffect(() => {
    const tokenCheck = async () => {
      const isValid = await waitForValidToken(2000);
      setHasValidToken(isValid);
      if (!isValid) {
      }
    };
    
    tokenCheck();
    
    const handleStorageChange = () => {
      setHasValidToken(checkToken());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const { 
    data: techniciansData = [], 
    isLoading: isLoadingTechnicians,
    error: errorTechnicians,
    refetch: refetchTechnicians
  } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        if (!checkToken()) {
          const hasToken = await waitForValidToken(1000);
          if (!hasToken) {
            return [];
          }
        }
        const response = await api.get('/technicians');
        return response.data.data || [];
      } catch (error: any) {
        console.error('âŒ [DATA] Erro ao buscar tÃ©cnicos:', error.message);
        return [];
      }
    },
    retry: false, // IMPORTANTE: nÃ£o retentar automaticamente
    enabled: hasValidToken, // SÃ“ EXECUTA SE TIVER TOKEN VÃLIDO
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: (response) => {
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
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.map(tech => tech.id === response.data.data?.id ? response.data.data : tech)
      );
      setTimeout(() => refetchTechnicians(), 300);
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['technicians'], (old: any[] = []) => 
        old.filter(tech => tech.id !== id)
      );
      setTimeout(() => refetchTechnicians(), 300);
    },
  });

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
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!checkToken()) {
          const hasToken = await waitForValidToken(1500);
          if (!hasToken) {
            return [];
          }
        }
        const startTime = Date.now();
        const response = await api.get('/machines');
        const endTime = Date.now();
        
        if (response.data.data && response.data.data.length > 0) {
        }
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('âŒ [DATA] Erro ao buscar mÃ¡quinas:', error.message);
        console.error('âŒ [DATA] Status:', error.response?.status);
        return [];
      }
    },
    retry: false, // IMPORTANTE: nÃ£o retentar automaticamente
    enabled: hasValidToken, // SÃ“ EXECUTA SE TIVER TOKEN VÃLIDO
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!isLoadingMachines) {
      if (machinesData.length > 0) {
      }
      const timer = setTimeout(() => {
        setMachinesInitialLoad(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMachines, machinesData]);

  const createMachineMutation = useMutation({
    mutationFn: (data: any) => {
      return api.post('/machines', data);
    },
    onSuccess: (response) => {
      
      queryClient.setQueryData(['machines'], (old: any[] = []) => {
        const newData = [...old, response.data.data];
        return newData;
      });
      
      setTimeout(() => {
        refetchMachines();
      }, 300);
    },
    onError: (error: any) => {
      console.error('âŒ [DATA] Erro ao criar mÃ¡quina:', error.message);
    }
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      return api.put(`/machines/${id}`, data);
    },
    onSuccess: (response) => {
      
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
      return api.delete(`/machines/${id}`);
    },
    onSuccess: (_, id) => {
      
      queryClient.setQueryData(['machines'], (old: any[] = []) => 
        old.filter(machine => machine.id !== id)
      );
      
      setTimeout(() => refetchMachines(), 300);
    },
  });

  const { 
    data: servicesData = [], 
    isLoading: isLoadingServices,
    error: errorServices,
    refetch: refetchServices
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        if (!checkToken()) {
          const hasToken = await waitForValidToken(1000);
          if (!hasToken) {
            return [];
          }
        }
        const response = await api.get('/services');
        return response.data.data || [];
      } catch (error: any) {
        console.error('âŒ [DATA] Erro ao buscar serviÃ§os:', error.message);
        return [];
      }
    },
    retry: false,
    enabled: hasValidToken,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/services', data),
    onSuccess: (response) => {
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
      queryClient.setQueryData(['services'], (old: any[] = []) => 
        old.filter(service => service.id !== id)
      );
      setTimeout(() => refetchServices(), 300);
    },
  });

  const { 
    data: dashboardStatsData = {}, 
    isLoading: isLoadingStats,
    error: errorStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        if (!checkToken()) {
          const hasToken = await waitForValidToken(1000);
          if (!hasToken) {
            return {};
          }
        }
        const response = await api.get('/dashboard/stats');
        return response.data.data || {};
      } catch (error: any) {
        console.error('âŒ [DATA] Erro ao buscar estatÃ­sticas:', error.message);
        return {};
      }
    },
    retry: false,
    enabled: hasValidToken,
    staleTime: 1000 * 60,
    cacheTime: 1000 * 60 * 5,
  });

  const refetchAll = async () => {
    
    if (!checkToken()) {
      return;
    }
    
    try {
      await Promise.all([
        refetchTechnicians(),
        refetchMachines(),
        refetchServices(),
        refetchStats()
      ]);
    } catch (error) {
      console.error('âŒ [DATA] Erro ao fazer refetch:', error);
    }
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



