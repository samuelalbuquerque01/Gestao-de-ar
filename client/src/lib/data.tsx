import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, subDays } from 'date-fns';

// Types
export type MachineStatus = 'ATIVO' | 'INATIVO' | 'MANUTENCAO' | 'DEFEITO';
export type MachineType = 'SPLIT' | 'WINDOW' | 'PISO_TETO' | 'CASSETE' | 'INVERTER' | 'PORTATIL';
export type LocationType = 'SALA' | 'QUARTO' | 'ESCRITORIO' | 'SALA_REUNIAO' | 'OUTRO';
export type ServiceType = 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'LIMPEZA' | 'VISTORIA';
export type ServiceStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'PENDENTE';
export type Priority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Machine {
  id: string;
  codigo: string;
  modelo: string;
  marca: string;
  tipo: MachineType;
  capacidadeBTU: number;
  voltagem: 'V110' | 'V220' | 'BIVOLT';
  localizacaoTipo: LocationType;
  localizacaoDescricao: string;
  localizacaoAndar?: number;
  dataInstalacao: string;
  status: MachineStatus;
  observacoes?: string;
}

export interface Service {
  id: string;
  tipoServico: ServiceType;
  maquinaId: string;
  dataAgendamento: string;
  dataConclusao?: string;
  tecnicoNome: string;
  descricaoProblema?: string;
  descricaoServico: string;
  prioridade: Priority;
  status: ServiceStatus;
  observacoes?: string;
}

// Mock Data
const INITIAL_MACHINES: Machine[] = [
  {
    id: '1',
    codigo: 'AC-001',
    modelo: 'Dual Inverter Voice',
    marca: 'LG',
    tipo: 'SPLIT',
    capacidadeBTU: 12000,
    voltagem: 'V220',
    localizacaoTipo: 'SALA_REUNIAO',
    localizacaoDescricao: 'Sala Principal',
    localizacaoAndar: 2,
    dataInstalacao: '2023-01-15',
    status: 'ATIVO',
  },
  {
    id: '2',
    codigo: 'AC-002',
    modelo: 'WindFree',
    marca: 'Samsung',
    tipo: 'SPLIT',
    capacidadeBTU: 9000,
    voltagem: 'V220',
    localizacaoTipo: 'ESCRITORIO',
    localizacaoDescricao: 'RH - Sala 3',
    localizacaoAndar: 1,
    dataInstalacao: '2023-03-10',
    status: 'MANUTENCAO',
  },
  {
    id: '3',
    codigo: 'AC-003',
    modelo: 'Eco Garden',
    marca: 'Gree',
    tipo: 'CASSETE',
    capacidadeBTU: 24000,
    voltagem: 'V220',
    localizacaoTipo: 'SALA',
    localizacaoDescricao: 'Recepção',
    localizacaoAndar: 0,
    dataInstalacao: '2022-11-05',
    status: 'ATIVO',
  },
  {
    id: '4',
    codigo: 'AC-004',
    modelo: 'Springer Midea',
    marca: 'Midea',
    tipo: 'WINDOW',
    capacidadeBTU: 7500,
    voltagem: 'V110',
    localizacaoTipo: 'QUARTO',
    localizacaoDescricao: 'Alojamento - Quarto 10',
    localizacaoAndar: 3,
    dataInstalacao: '2021-06-20',
    status: 'DEFEITO',
  }
];

const INITIAL_SERVICES: Service[] = [
  {
    id: '1',
    tipoServico: 'PREVENTIVA',
    maquinaId: '1',
    dataAgendamento: new Date().toISOString(),
    tecnicoNome: 'Carlos Silva',
    descricaoServico: 'Limpeza de filtros e verificação de gás',
    prioridade: 'MEDIA',
    status: 'AGENDADO',
  },
  {
    id: '2',
    tipoServico: 'CORRETIVA',
    maquinaId: '2',
    dataAgendamento: subDays(new Date(), 2).toISOString(),
    tecnicoNome: 'Roberto Santos',
    descricaoProblema: 'Não está gelando',
    descricaoServico: 'Troca do capacitor',
    prioridade: 'ALTA',
    status: 'EM_ANDAMENTO',
  },
  {
    id: '3',
    tipoServico: 'LIMPEZA',
    maquinaId: '3',
    dataAgendamento: subDays(new Date(), 15).toISOString(),
    dataConclusao: subDays(new Date(), 15).toISOString(),
    tecnicoNome: 'Carlos Silva',
    descricaoServico: 'Higienização completa',
    prioridade: 'BAIXA',
    status: 'CONCLUIDO',
  },
  {
    id: '4',
    tipoServico: 'VISTORIA',
    maquinaId: '4',
    dataAgendamento: addDays(new Date(), 5).toISOString(),
    tecnicoNome: 'Ana Paula',
    descricaoServico: 'Avaliação técnica para troca',
    prioridade: 'MEDIA',
    status: 'AGENDADO',
  }
];

// Context
interface DataContextType {
  machines: Machine[];
  services: Service[];
  addMachine: (machine: Omit<Machine, 'id'>) => void;
  updateMachine: (id: string, machine: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  addService: (service: Omit<Service, 'id'>) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  getMachine: (id: string) => Machine | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);

  const addMachine = (machine: Omit<Machine, 'id'>) => {
    const newMachine = { ...machine, id: Math.random().toString(36).substr(2, 9) };
    setMachines([...machines, newMachine]);
  };

  const updateMachine = (id: string, updatedData: Partial<Machine>) => {
    setMachines(machines.map(m => m.id === id ? { ...m, ...updatedData } : m));
  };

  const deleteMachine = (id: string) => {
    setMachines(machines.filter(m => m.id !== id));
  };

  const getMachine = (id: string) => machines.find(m => m.id === id);

  const addService = (service: Omit<Service, 'id'>) => {
    const newService = { ...service, id: Math.random().toString(36).substr(2, 9) };
    setServices([...services, newService]);
  };

  const updateService = (id: string, updatedData: Partial<Service>) => {
    setServices(services.map(s => s.id === id ? { ...s, ...updatedData } : s));
  };

  const deleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  return (
    <DataContext.Provider value={{ 
      machines, services, 
      addMachine, updateMachine, deleteMachine, getMachine,
      addService, updateService, deleteService 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
