// ========== STORAGE COMPLETO CORRIGIDO ==========

import { 
  type User, type InsertUser,
  type Technician, type InsertTechnician,
  type Machine, type InsertMachine,
  type Service, type InsertService,
  type ServiceHistory, type InsertServiceHistory
} from "@shared/schema";
import { db } from "./db";
import { 
  users, technicians, machines, services, serviceHistory 
} from "@shared/schema";
import { eq, and, desc, sql, count, gte, lte, sum, avg } from "drizzle-orm";

export interface IStorage {
  // USERS
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  
  // TECHNICIANS
  getTechnician(id: string): Promise<Technician | undefined>;
  getAllTechnicians(): Promise<Technician[]>;
  createTechnician(technicianData: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: string): Promise<boolean>;
  
  // MACHINES
  getMachine(id: string): Promise<Machine | undefined>;
  getMachineByCodigo(codigo: string): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  getMachinesByStatus(status: string): Promise<Machine[]>;
  getMachinesByBranch(branch: string): Promise<Machine[]>;
  createMachine(machineData: InsertMachine): Promise<Machine>;
  updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<boolean>;
  
  // SERVICES
  getService(id: string): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  getServicesByMachine(machineId: string): Promise<Service[]>;
  getServicesByTechnician(technicianId: string): Promise<Service[]>;
  getServicesByDateRange(startDate: Date, endDate: Date): Promise<Service[]>;
  getServicesByStatus(status: string): Promise<Service[]>;
  getServicesByType(serviceType: string): Promise<Service[]>;
  getCompletedServices(startDate?: Date, endDate?: Date): Promise<Service[]>;
  getServicesWithCosts(startDate?: Date, endDate?: Date): Promise<Service[]>;
  createService(serviceData: InsertService): Promise<Service>;
  updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;
  
  // SERVICE HISTORY
  addServiceHistory(historyData: InsertServiceHistory): Promise<ServiceHistory>;
  getServiceHistory(serviceId: string): Promise<ServiceHistory[]>;
  
  // DASHBOARD STATS
  getDashboardStats(): Promise<{
    activeMachines: number;
    maintenanceMachines: number;
    defectMachines: number;
    pendingServices: number;
    completedServices: number;
    totalCost: number;
    avgServiceCost: number;
  }>;
  
  // REPORTS
  getServiceTypesStats(startDate?: Date, endDate?: Date): Promise<Record<string, number>>;
  getTechnicianPerformance(startDate?: Date, endDate?: Date): Promise<Array<{
    technicianId: string;
    technicianName: string;
    completedServices: number;
    totalServices: number;
    avgCompletionTime: number;
    totalCost: number;
  }>>;
  getMonthlyServiceStats(year?: number): Promise<Array<{
    month: string;
    totalServices: number;
    completedServices: number;
    pendingServices: number;
    totalCost: number;
  }>>;
  getBranchStats(): Promise<Array<{
    branch: string;
    machineCount: number;
    activeMachines: number;
    totalServices: number;
    totalCost: number;
  }>>;
  getCostAnalysis(startDate?: Date, endDate?: Date): Promise<{
    byType: Array<{ type: string; count: number; totalCost: number; avgCost: number }>;
    byTechnician: Array<{ technicianName: string; count: number; totalCost: number; avgCost: number }>;
    byBranch: Array<{ branch: string; count: number; totalCost: number; avgCost: number }>;
    byPriority: Array<{ priority: string; count: number; totalCost: number; avgCost: number }>;
  }>;
  getMachineMaintenanceHistory(machineId: string): Promise<Array<{
    service: Service;
    daysSinceLastService: number;
    totalCost: number;
  }>>;
}

// ========== FUNÇÃO mapDbToCamelCase - VERSÃO CORRIGIDA ==========
function mapDbToCamelCase(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  // Criar uma cópia PROFUNDA
  const result = JSON.parse(JSON.stringify(data));
  
  console.log(`🔍 [mapDbToCamelCase] Tabela: ${tableName}, Campos originais:`, Object.keys(result));
  
  if (tableName === 'users') {
    console.log('👤 [mapDbToCamelCase] Mapeando USUÁRIO');
    
    // MAPEAMENTO CRÍTICO PARA USERS
    if ('password_hash' in result) {
      result.password = result.password_hash;
      console.log('✅ Mapeado: password_hash → password');
    }
    
    if ('created_at' in result) {
      result.createdAt = result.created_at;
      console.log('✅ Mapeado: created_at → createdAt');
    }
    
    if ('updated_at' in result) {
      result.updatedAt = result.updated_at;
      console.log('✅ Mapeado: updated_at → updatedAt');
    }
    
    if ('is_active' in result) {
      result.isActive = result.is_active;
      console.log('✅ Mapeado: is_active → isActive');
    }
    
    // DELETAR campos snake_case
    const keysToDelete = [
      'password_hash', 'created_at', 'updated_at', 'is_active'
    ];
    
    keysToDelete.forEach(key => {
      if (key in result) {
        delete result[key];
      }
    });
    
    console.log('✅ [mapDbToCamelCase] USUÁRIO mapeado. Campos finais:', Object.keys(result));
    
  } else if (tableName === 'services') {
    console.log('🔧 [mapDbToCamelCase] Mapeando SERVICES - VERIFICANDO STATUS');
    
    // DEBUG: Verificar quais campos existem
    console.log('🔍 Campos presentes:', Object.keys(result));
    console.log('🔍 Campo "status" presente?', 'status' in result, 'Valor:', result.status);
    console.log('🔍 Campo "prioridade" presente?', 'prioridade' in result, 'Valor:', result.prioridade);
    
    // MAPEAMENTO para services - GARANTIR que todos os campos sejam mapeados
    if ('tipo_servico' in result) {
      result.tipoServico = result.tipo_servico;
      console.log('✅ Mapeado: tipo_servico → tipoServico =', result.tipoServico);
    }
    if ('maquina_id' in result) result.maquinaId = result.maquina_id;
    if ('tecnico_id' in result) result.tecnicoId = result.tecnico_id;
    if ('tecnico_nome' in result) result.tecnicoNome = result.tecnico_nome;
    if ('descricao_servico' in result) result.descricaoServico = result.descricao_servico;
    if ('descricao_problema' in result) result.descricaoProblema = result.descricao_problema;
    if ('data_agendamento' in result) result.dataAgendamento = result.data_agendamento;
    if ('data_conclusao' in result) result.dataConclusao = result.data_conclusao;
    
    // CRÍTICO: Garantir mapeamento de prioridade
    if ('prioridade' in result) {
      result.prioridade = result.prioridade;
      console.log('✅ Mapeado: prioridade → prioridade =', result.prioridade);
    } else {
      console.log('⚠️ Campo "prioridade" NÃO ENCONTRADO no resultado');
    }
    
    // CRÍTICO: Garantir mapeamento de status
    if ('status' in result) {
      result.status = result.status;
      console.log('✅ Mapeado: status → status =', result.status);
    } else {
      console.log('❌ ERRO: Campo "status" NÃO ENCONTRADO no resultado!');
    }
    
    if ('custo' in result) result.custo = result.custo;
    if ('observacoes' in result) result.observacoes = result.observacoes;
    if ('created_at' in result) result.createdAt = result.created_at;
    if ('updated_at' in result) result.updatedAt = result.updated_at;
    
    // DELETAR campos snake_case - NÃO DELETAR 'prioridade' e 'status'!
    const keysToDelete = [
      'tipo_servico', 'maquina_id', 'tecnico_id', 'tecnico_nome',
      'descricao_servico', 'descricao_problema', 'data_agendamento',
      'data_conclusao', 'custo', 'observacoes',
      'created_at', 'updated_at'
    ];
    
    keysToDelete.forEach(key => {
      if (key in result) {
        delete result[key];
      }
    });
    
    console.log('✅ [mapDbToCamelCase] Serviço mapeado. Campos finais:', Object.keys(result));
    console.log('📊 Status final:', result.status);
    console.log('📊 Prioridade final:', result.prioridade);
    
  } else if (tableName === 'machines') {
    if ('location_type' in result) result.locationType = result.location_type;
    if ('location_floor' in result) result.locationFloor = result.location_floor;
    if ('installation_date' in result) result.installationDate = result.installation_date;
    if ('created_at' in result) result.createdAt = result.created_at;
    if ('updated_at' in result) result.updatedAt = result.updated_at;
    
    delete result.location_type;
    delete result.location_floor;
    delete result.installation_date;
    delete result.created_at;
    delete result.updated_at;
    
  } else if (tableName === 'technicians') {
    if ('created_at' in result) result.createdAt = result.created_at;
    if ('updated_at' in result) result.updatedAt = result.updated_at;
    
    delete result.created_at;
    delete result.updated_at;
    
  } else if (tableName === 'service_history') {
    if ('service_id' in result) result.serviceId = result.service_id;
    if ('created_at' in result) result.createdAt = result.created_at;
    if ('created_by' in result) result.createdBy = result.created_by;
    
    delete result.service_id;
    delete result.created_at;
    delete result.created_by;
  }
  
  return result;
}

// Função auxiliar para converter camelCase para snake_case
function mapCamelToDb(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = JSON.parse(JSON.stringify(data));
  
  if (tableName === 'users') {
    console.log('👤 [mapCamelToDb] Convertendo USUÁRIO para banco');
    
    if ('password' in result) {
      result.password_hash = result.password;
      console.log('✅ Convertido: password → password_hash');
    }
    
    if ('createdAt' in result) result.created_at = result.createdAt;
    if ('updatedAt' in result) result.updated_at = result.updatedAt;
    if ('isActive' in result) result.is_active = result.isActive;
    
    delete result.password;
    delete result.createdAt;
    delete result.updatedAt;
    delete result.isActive;
    
  } else if (tableName === 'services') {
    if ('tipoServico' in result) result.tipo_servico = result.tipoServico;
    if ('maquinaId' in result) result.maquina_id = result.maquinaId;
    if ('tecnicoId' in result) result.tecnico_id = result.tecnicoId;
    if ('tecnicoNome' in result) result.tecnico_nome = result.tecnicoNome;
    if ('descricaoServico' in result) result.descricao_servico = result.descricaoServico;
    if ('descricaoProblema' in result) result.descricao_problema = result.descricaoProblema;
    if ('dataAgendamento' in result) result.data_agendamento = result.dataAgendamento;
    if ('dataConclusao' in result) result.data_conclusao = result.dataConclusao;
    if ('prioridade' in result) result.prioridade = result.prioridade;
    if ('status' in result) result.status = result.status;
    if ('custo' in result) result.custo = result.custo;
    if ('observacoes' in result) result.observacoes = result.observacoes;
    if ('createdAt' in result) result.created_at = result.createdAt;
    if ('updatedAt' in result) result.updated_at = result.updatedAt;
    
    delete result.tipoServico;
    delete result.maquinaId;
    delete result.tecnicoId;
    delete result.tecnicoNome;
    delete result.descricaoServico;
    delete result.descricaoProblema;
    delete result.dataAgendamento;
    delete result.dataConclusao;
    delete result.prioridade;
    delete result.status;
    delete result.custo;
    delete result.observacoes;
    delete result.createdAt;
    delete result.updatedAt;
    
  } else if (tableName === 'machines') {
    if ('locationType' in result) result.location_type = result.locationType;
    if ('locationFloor' in result) result.location_floor = result.locationFloor;
    if ('installationDate' in result) result.installation_date = result.installationDate;
    if ('createdAt' in result) result.created_at = result.createdAt;
    if ('updatedAt' in result) result.updated_at = result.updatedAt;
    
    delete result.locationType;
    delete result.locationFloor;
    delete result.installationDate;
    delete result.createdAt;
    delete result.updatedAt;
    
  } else if (tableName === 'technicians') {
    if ('createdAt' in result) result.created_at = result.createdAt;
    if ('updatedAt' in result) result.updated_at = result.updatedAt;
    
    delete result.createdAt;
    delete result.updatedAt;
    
  } else if (tableName === 'service_history') {
    if ('serviceId' in result) result.service_id = result.serviceId;
    if ('createdAt' in result) result.created_at = result.createdAt;
    if ('createdBy' in result) result.created_by = result.createdBy;
    
    delete result.serviceId;
    delete result.createdAt;
    delete result.createdBy;
  }
  
  return result;
}

// Função auxiliar para converter qualquer valor para Date
function anyToDate(dateValue: any): Date | null {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return null;
  }
  
  try {
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }
    
    if (dateValue instanceof Date && isNaN(dateValue.getTime())) {
      return null;
    }
    
    if (typeof dateValue === 'string' && dateValue.includes('Invalid Date')) {
      return null;
    }
    
    if (typeof dateValue === 'string') {
      const cleanStr = dateValue.trim();
      if (cleanStr === '' || cleanStr.toLowerCase() === 'null') {
        return null;
      }
      
      const date = new Date(cleanStr);
      
      if (isNaN(date.getTime())) {
        const parts = cleanStr.split(/[/\-T]/);
        if (parts.length >= 3) {
          const isoStr = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3] || '00:00:00'}`;
          const isoDate = new Date(isoStr);
          if (!isNaN(isoDate.getTime())) {
            return isoDate;
          }
        }
      }
      
      return !isNaN(date.getTime()) ? date : null;
    }
    
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date : null;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ [anyToDate] Erro ao converter para Date:', error, 'Valor:', dateValue);
    return null;
  }
}

// Função auxiliar para validar e formatar datas
function safeDateToISO(dateValue: any): string {
  if (dateValue === null || dateValue === undefined) {
    return '';
  }
  
  try {
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'invalid date') {
        return '';
      }
      
      const testDate = new Date(trimmed);
      if (!isNaN(testDate.getTime())) {
        return testDate.toISOString();
      }
      
      return '';
    }
    
    if (dateValue instanceof Date && isNaN(dateValue.getTime())) {
      return '';
    }
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) ? date.toISOString() : '';
    
  } catch (error) {
    console.error('❌ [safeDateToISO] Erro:', error);
    return '';
  }
}

export class DatabaseStorage implements IStorage {
  // ========== USERS ==========
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por ID:', id);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (user) {
        console.log('✅ [STORAGE] Usuário encontrado por ID:', user.username);
        const mappedUser = mapDbToCamelCase(user, 'users');
        return mappedUser;
      }
      
      return undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar usuário por ID:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por username:', username);
      
      if (!username || username.trim() === '') {
        console.log('⚠️  [STORAGE] Username vazio');
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.username, String(username).trim()));
      
      if (user) {
        console.log('✅ [STORAGE] Usuário encontrado:', {
          id: user.id,
          username: user.username,
          email: user.email
        });
        
        const mappedUser = mapDbToCamelCase(user, 'users');
        return mappedUser;
      }
      
      console.log('⚠️  [STORAGE] Usuário não encontrado');
      return undefined;
      
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar por username:', error.message);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por email:', email || '(vazio)');
      
      if (!email || email.trim() === '') {
        console.log('⚠️  [STORAGE] Email vazio');
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, String(email).trim()));
      
      if (user) {
        console.log('✅ [STORAGE] Usuário encontrado por email:', user.email);
        return mapDbToCamelCase(user, 'users');
      }
      
      return undefined;
      
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar por email:', error.message);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      console.log('👤 [STORAGE] Criando usuário:', userData.username);
      
      const dbData = mapCamelToDb(userData, 'users');
      
      const [user] = await db.insert(users)
        .values({
          ...dbData,
          role: userData.role || 'technician',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      
      console.log('✅ [STORAGE] Usuário criado com ID:', user.id);
      return mapDbToCamelCase(user, 'users');
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar usuário:', error.message);
      throw error;
    }
  }

  // ========== TECHNICIANS ==========
  async getTechnician(id: string): Promise<Technician | undefined> {
    try {
      const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
      return tech ? mapDbToCamelCase(tech, 'technicians') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar técnico:', error);
      return undefined;
    }
  }

  async getAllTechnicians(): Promise<Technician[]> {
    try {
      const techs = await db.select().from(technicians).orderBy(technicians.nome);
      return techs.map(tech => mapDbToCamelCase(tech, 'technicians'));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar técnicos:', error);
      return [];
    }
  }

  async createTechnician(technicianData: InsertTechnician): Promise<Technician> {
    try {
      const dbData = mapCamelToDb(technicianData, 'technicians');
      
      const [tech] = await db.insert(technicians).values({
        ...dbData,
        updated_at: new Date()
      }).returning();
      return mapDbToCamelCase(tech, 'technicians');
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao criar técnico:', error);
      throw error;
    }
  }

  async updateTechnician(id: string, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined> {
    try {
      const dbData = mapCamelToDb(technicianData, 'technicians');
      
      const [tech] = await db.update(technicians)
        .set({
          ...dbData,
          updated_at: new Date()
        })
        .where(eq(technicians.id, id))
        .returning();
      return tech ? mapDbToCamelCase(tech, 'technicians') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao atualizar técnico:', error);
      return undefined;
    }
  }

  async deleteTechnician(id: string): Promise<boolean> {
    try {
      const result = await db.delete(technicians).where(eq(technicians.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao deletar técnico:', error);
      return false;
    }
  }

  // ========== MACHINES ==========
  async getMachine(id: string): Promise<Machine | undefined> {
    try {
      const [machine] = await db.select().from(machines).where(eq(machines.id, id));
      if (!machine) return undefined;
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      
      let dataInstalacao = '';
      if (mappedMachine.installationDate) {
        const date = anyToDate(mappedMachine.installationDate);
        if (date) {
          dataInstalacao = date.toISOString();
        }
      }
      
      return {
        ...mappedMachine,
        id: machine.id,
        codigo: machine.codigo || '',
        modelo: machine.model || '',
        marca: machine.brand || '',
        tipo: machine.type || 'SPLIT',
        capacidadeBTU: machine.capacity || 9000,
        voltagem: machine.voltage || 'V220',
        localizacaoTipo: mappedMachine.locationType || 'SALA',
        localizacaoDescricao: machine.location || '',
        localizacaoAndar: mappedMachine.locationFloor || 0,
        filial: machine.branch || 'Matriz',
        dataInstalacao: dataInstalacao,
        status: machine.status || 'ATIVO',
        observacoes: machine.observacoes || '',
        createdAt: mappedMachine.createdAt || new Date(),
        updatedAt: mappedMachine.updatedAt || new Date()
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquina:', error);
      return undefined;
    }
  }

  async getMachineByCodigo(codigo: string): Promise<Machine | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando máquina por código:', codigo);
      const [machine] = await db.select().from(machines).where(eq(machines.codigo, codigo));
      if (!machine) return undefined;
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      
      let dataInstalacao = '';
      if (mappedMachine.installationDate) {
        const date = anyToDate(mappedMachine.installationDate);
        if (date) {
          dataInstalacao = date.toISOString();
        }
      }
      
      return {
        ...mappedMachine,
        id: machine.id,
        codigo: machine.codigo || '',
        modelo: machine.model || '',
        marca: machine.brand || '',
        tipo: machine.type || 'SPLIT',
        capacidadeBTU: machine.capacity || 9000,
        voltagem: machine.voltage || 'V220',
        localizacaoTipo: mappedMachine.locationType || 'SALA',
        localizacaoDescricao: machine.location || '',
        localizacaoAndar: mappedMachine.locationFloor || 0,
        filial: machine.branch || 'Matriz',
        dataInstalacao: dataInstalacao,
        status: machine.status || 'ATIVO',
        observacoes: machine.observacoes || '',
        createdAt: mappedMachine.createdAt || new Date(),
        updatedAt: mappedMachine.updatedAt || new Date()
      };
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar máquina por código:', error.message);
      return undefined;
    }
  }

  async getAllMachines(): Promise<Machine[]> {
    try {
      const machinesList = await db.select().from(machines).orderBy(machines.codigo);
      
      return machinesList.map(machine => {
        const mappedMachine = mapDbToCamelCase(machine, 'machines');
        
        let dataInstalacao = '';
        try {
          if (mappedMachine.installationDate) {
            const date = anyToDate(mappedMachine.installationDate);
            if (date) {
              dataInstalacao = date.toISOString();
            }
          }
        } catch (error) {
          console.error(`❌ [STORAGE] Erro ao processar dataInstalacao da máquina ${machine.id}:`, error);
        }
        
        return {
          ...mappedMachine,
          id: machine.id,
          codigo: machine.codigo || '',
          modelo: machine.model || '',
          marca: machine.brand || '',
          tipo: machine.type || 'SPLIT',
          capacidadeBTU: machine.capacity || 9000,
          voltagem: machine.voltage || 'V220',
          localizacaoTipo: mappedMachine.locationType || 'SALA',
          localizacaoDescricao: machine.location || '',
          localizacaoAndar: mappedMachine.locationFloor || 0,
          filial: machine.branch || 'Matriz',
          dataInstalacao: dataInstalacao,
          status: machine.status || 'ATIVO',
          observacoes: machine.observacoes || '',
          createdAt: mappedMachine.createdAt || new Date(),
          updatedAt: mappedMachine.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquinas:', error);
      return [];
    }
  }

  async getMachinesByStatus(status: string): Promise<Machine[]> {
    try {
      const machinesList = await db.select()
        .from(machines)
        .where(eq(machines.status, status))
        .orderBy(machines.codigo);
      
      return machinesList.map(machine => {
        const mappedMachine = mapDbToCamelCase(machine, 'machines');
        
        let dataInstalacao = '';
        if (mappedMachine.installationDate) {
          const date = anyToDate(mappedMachine.installationDate);
          if (date) {
            dataInstalacao = date.toISOString();
          }
        }
        
        return {
          ...mappedMachine,
          id: machine.id,
          codigo: machine.codigo || '',
          modelo: machine.model || '',
          marca: machine.brand || '',
          tipo: machine.type || 'SPLIT',
          capacidadeBTU: machine.capacity || 9000,
          voltagem: machine.voltage || 'V220',
          localizacaoTipo: mappedMachine.locationType || 'SALA',
          localizacaoDescricao: machine.location || '',
          localizacaoAndar: mappedMachine.locationFloor || 0,
          filial: machine.branch || 'Matriz',
          dataInstalacao: dataInstalacao,
          status: machine.status || 'ATIVO',
          observacoes: machine.observacoes || '',
          createdAt: mappedMachine.createdAt || new Date(),
          updatedAt: mappedMachine.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquinas por status:', error);
      return [];
    }
  }

  async getMachinesByBranch(branch: string): Promise<Machine[]> {
    try {
      const machinesList = await db.select()
        .from(machines)
        .where(eq(machines.branch, branch))
        .orderBy(machines.codigo);
      
      return machinesList.map(machine => {
        const mappedMachine = mapDbToCamelCase(machine, 'machines');
        
        let dataInstalacao = '';
        if (mappedMachine.installationDate) {
          const date = anyToDate(mappedMachine.installationDate);
          if (date) {
            dataInstalacao = date.toISOString();
          }
        }
        
        return {
          ...mappedMachine,
          id: machine.id,
          codigo: machine.codigo || '',
          modelo: machine.model || '',
          marca: machine.brand || '',
          tipo: machine.type || 'SPLIT',
          capacidadeBTU: machine.capacity || 9000,
          voltagem: machine.voltage || 'V220',
          localizacaoTipo: mappedMachine.locationType || 'SALA',
          localizacaoDescricao: machine.location || '',
          localizacaoAndar: mappedMachine.locationFloor || 0,
          filial: machine.branch || 'Matriz',
          dataInstalacao: dataInstalacao,
          status: machine.status || 'ATIVO',
          observacoes: machine.observacoes || '',
          createdAt: mappedMachine.createdAt || new Date(),
          updatedAt: mappedMachine.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquinas por filial:', error);
      return [];
    }
  }

  async createMachine(machineData: InsertMachine): Promise<Machine> {
    try {
      console.log('📝 [STORAGE] Criando máquina com dados:', JSON.stringify(machineData, null, 2));
      
      const processedData = {
        codigo: machineData.codigo,
        model: machineData.modelo || '',
        brand: machineData.marca || '',
        type: machineData.tipo || 'SPLIT',
        capacity: Number(machineData.capacidadeBTU) || 9000,
        voltage: machineData.voltagem || 'V220',
        locationType: machineData.localizacaoTipo || 'SALA',
        location: machineData.localizacaoDescricao || '',
        locationFloor: machineData.localizacaoAndar || 0,
        branch: machineData.filial || 'Matriz',
        installationDate: anyToDate(machineData.dataInstalacao) || new Date(),
        status: machineData.status || 'ATIVO',
        observacoes: machineData.observacoes || ''
      };
      
      const dbData = mapCamelToDb(processedData, 'machines');
      
      console.log('📝 [STORAGE] Dados convertidos para banco:', JSON.stringify(dbData, null, 2));
      
      const [machine] = await db.insert(machines).values({
        ...dbData,
        updated_at: new Date()
      }).returning();
      
      console.log('✅ [STORAGE] Máquina criada com ID:', machine.id);
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      
      let dataInstalacao = '';
      if (mappedMachine.installationDate) {
        const date = anyToDate(mappedMachine.installationDate);
        if (date) {
          dataInstalacao = date.toISOString();
        }
      }
      
      return {
        id: machine.id,
        codigo: machine.codigo || '',
        modelo: machine.model || '',
        marca: machine.brand || '',
        tipo: machine.type || 'SPLIT',
        capacidadeBTU: machine.capacity || 9000,
        voltagem: machine.voltage || 'V220',
        localizacaoTipo: mappedMachine.locationType || 'SALA',
        localizacaoDescricao: machine.location || '',
        localizacaoAndar: mappedMachine.locationFloor || 0,
        filial: machine.branch || 'Matriz',
        dataInstalacao: dataInstalacao,
        status: machine.status || 'ATIVO',
        observacoes: machine.observacoes || '',
        createdAt: mappedMachine.createdAt || new Date(),
        updatedAt: mappedMachine.updatedAt || new Date()
      };
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar máquina:', error.message);
      throw error;
    }
  }

  async updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    try {
      const updateData: any = {};
      
      if (machineData.codigo !== undefined) updateData.codigo = machineData.codigo;
      if (machineData.modelo !== undefined) updateData.model = machineData.modelo;
      if (machineData.marca !== undefined) updateData.brand = machineData.marca;
      if (machineData.tipo !== undefined) updateData.type = machineData.tipo;
      if (machineData.capacidadeBTU !== undefined) updateData.capacity = Number(machineData.capacidadeBTU);
      if (machineData.voltagem !== undefined) updateData.voltage = machineData.voltagem;
      if (machineData.localizacaoTipo !== undefined) updateData.locationType = machineData.localizacaoTipo;
      if (machineData.localizacaoDescricao !== undefined) updateData.location = machineData.localizacaoDescricao;
      if (machineData.localizacaoAndar !== undefined) updateData.locationFloor = machineData.localizacaoAndar;
      if (machineData.filial !== undefined) updateData.branch = machineData.filial;
      if (machineData.dataInstalacao !== undefined) {
        updateData.installationDate = anyToDate(machineData.dataInstalacao) || new Date();
      }
      if (machineData.status !== undefined) updateData.status = machineData.status;
      if (machineData.observacoes !== undefined) updateData.observacoes = machineData.observacoes;
      
      updateData.updated_at = new Date();
      
      console.log('📝 [STORAGE] Atualizando máquina:', id);
      console.log('📝 [STORAGE] Dados de atualização:', JSON.stringify(updateData, null, 2));
      
      const [machine] = await db.update(machines)
        .set(updateData)
        .where(eq(machines.id, id))
        .returning();
      
      if (!machine) return undefined;
      
      console.log('✅ [STORAGE] Máquina atualizada com ID:', machine.id);
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      
      let dataInstalacao = '';
      if (mappedMachine.installationDate) {
        const date = anyToDate(mappedMachine.installationDate);
        if (date) {
          dataInstalacao = date.toISOString();
        }
      }
      
      return {
        id: machine.id,
        codigo: machine.codigo || '',
        modelo: machine.model || '',
        marca: machine.brand || '',
        tipo: machine.type || 'SPLIT',
        capacidadeBTU: machine.capacity || 9000,
        voltagem: machine.voltage || 'V220',
        localizacaoTipo: mappedMachine.locationType || 'SALA',
        localizacaoDescricao: machine.location || '',
        localizacaoAndar: mappedMachine.locationFloor || 0,
        filial: machine.branch || 'Matriz',
        dataInstalacao: dataInstalacao,
        status: machine.status || 'ATIVO',
        observacoes: machine.observacoes || '',
        createdAt: mappedMachine.createdAt || new Date(),
        updatedAt: mappedMachine.updatedAt || new Date()
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao atualizar máquina:', error);
      return undefined;
    }
  }

  async deleteMachine(id: string): Promise<boolean> {
    try {
      const result = await db.delete(machines).where(eq(machines.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao deletar máquina:', error);
      return false;
    }
  }

  // ========== SERVICES ==========
  async getService(id: string): Promise<Service | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando serviço por ID:', id);
      const [service] = await db.select().from(services).where(eq(services.id, id));
      if (!service) {
        console.log('⚠️  [STORAGE] Serviço não encontrado');
        return undefined;
      }
      
      const mappedService = mapDbToCamelCase(service, 'services');
      
      console.log('📅 [STORAGE] Serviço mapeado:', {
        dataAgendamentoRaw: mappedService.dataAgendamento,
        status: mappedService.status,
        prioridade: mappedService.prioridade
      });
      
      let dataAgendamentoFormatted = '';
      let dataConclusaoFormatted = '';
      
      if (mappedService.dataAgendamento) {
        const date = anyToDate(mappedService.dataAgendamento);
        if (date) {
          dataAgendamentoFormatted = date.toISOString();
        }
      }
      
      if (mappedService.dataConclusao) {
        const date = anyToDate(mappedService.dataConclusao);
        if (date) {
          dataConclusaoFormatted = date.toISOString();
        }
      }
      
      console.log('📅 [STORAGE] Data agendamento final:', dataAgendamentoFormatted);
      
      return {
        ...mappedService,
        id: service.id,
        tipoServico: mappedService.tipoServico,
        maquinaId: mappedService.maquinaId,
        tecnicoId: mappedService.tecnicoId,
        tecnicoNome: mappedService.tecnicoNome,
        descricaoServico: mappedService.descricaoServico,
        descricaoProblema: mappedService.descricaoProblema,
        dataAgendamento: dataAgendamentoFormatted,
        dataConclusao: dataConclusaoFormatted,
        prioridade: mappedService.prioridade,
        status: mappedService.status,
        custo: mappedService.custo ? mappedService.custo.toString() : '',
        observacoes: mappedService.observacoes || '',
        createdAt: mappedService.createdAt || new Date(),
        updatedAt: mappedService.updatedAt || new Date()
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviço:', error);
      return undefined;
    }
  }

  async getAllServices(): Promise<Service[]> {
    try {
      console.log('🔍 [STORAGE] Buscando todos os serviços...');
      const servicesList = await db.select().from(services).orderBy(desc(services.data_agendamento));
      
      console.log(`✅ [STORAGE] Encontrados ${servicesList.length} serviços no banco`);
      
      const mappedServices = servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        console.log('📊 [STORAGE] Serviço após mapeamento:', {
          id: service.id,
          status_mapped: mappedService.status,
          prioridade_mapped: mappedService.prioridade,
          tipo_mapped: mappedService.tipoServico
        });
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            console.log('⚠️  [STORAGE] Data inválida detectada');
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
              console.log('✅ [STORAGE] Data parseada com sucesso:', dataAgendamentoFormatted);
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          // USAR VALORES MAPEADOS, NÃO VALORES DEFAULT
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
      
      // DEBUG: Verificar o primeiro serviço
      if (mappedServices.length > 0) {
        console.log('🔍🔍🔍 [STORAGE DEBUG] PRIMEIRO SERVIÇO COMPLETO:', mappedServices[0]);
      }
      
      return mappedServices;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços:', error);
      return [];
    }
  }

  async getServicesByMachine(machineId: string): Promise<Service[]> {
    try {
      const servicesList = await db.select()
        .from(services)
        .where(eq(services.maquina_id, machineId))
        .orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por máquina:', error);
      return [];
    }
  }

  async getServicesByTechnician(technicianId: string): Promise<Service[]> {
    try {
      const servicesList = await db.select()
        .from(services)
        .where(eq(services.tecnico_id, technicianId))
        .orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por técnico:', error);
      return [];
    }
  }

  async getServicesByDateRange(startDate: Date, endDate: Date): Promise<Service[]> {
    try {
      const servicesList = await db.select()
        .from(services)
        .where(
          and(
            gte(services.data_agendamento, startDate),
            lte(services.data_agendamento, endDate)
          )
        )
        .orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por data:', error);
      return [];
    }
  }

  async getServicesByStatus(status: string): Promise<Service[]> {
    try {
      const servicesList = await db.select()
        .from(services)
        .where(eq(services.status, status))
        .orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por status:', error);
      return [];
    }
  }

  async getServicesByType(serviceType: string): Promise<Service[]> {
    try {
      const servicesList = await db.select()
        .from(services)
        .where(eq(services.tipo_servico, serviceType))
        .orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por tipo:', error);
      return [];
    }
  }

  async getCompletedServices(startDate?: Date, endDate?: Date): Promise<Service[]> {
    try {
      let query = db.select()
        .from(services)
        .where(eq(services.status, 'CONCLUIDO'));
      
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(services.data_agendamento, startDate),
            lte(services.data_agendamento, endDate)
          )
        );
      }
      
      const servicesList = await query.orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços concluídos:', error);
      return [];
    }
  }

  async getServicesWithCosts(startDate?: Date, endDate?: Date): Promise<Service[]> {
    try {
      let query = db.select()
        .from(services)
        .where(sql`${services.custo} IS NOT NULL`);
      
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(services.data_agendamento, startDate),
            lte(services.data_agendamento, endDate)
          )
        );
      }
      
      const servicesList = await query.orderBy(desc(services.data_agendamento));
      
      return servicesList.map(service => {
        const mappedService = mapDbToCamelCase(service, 'services');
        
        let dataAgendamentoFormatted = '';
        let dataConclusaoFormatted = '';
        
        if (mappedService.dataAgendamento) {
          if (typeof mappedService.dataAgendamento === 'string' && 
              mappedService.dataAgendamento.includes('Invalid Date')) {
            dataAgendamentoFormatted = '';
          } else {
            const date = anyToDate(mappedService.dataAgendamento);
            if (date) {
              dataAgendamentoFormatted = date.toISOString();
            }
          }
        }
        
        if (mappedService.dataConclusao) {
          const date = anyToDate(mappedService.dataConclusao);
          if (date) {
            dataConclusaoFormatted = date.toISOString();
          }
        }
        
        return {
          ...mappedService,
          id: service.id,
          tipoServico: mappedService.tipoServico,
          maquinaId: mappedService.maquinaId,
          tecnicoId: mappedService.tecnicoId,
          tecnicoNome: mappedService.tecnicoNome,
          descricaoServico: mappedService.descricaoServico,
          descricaoProblema: mappedService.descricaoProblema,
          dataAgendamento: dataAgendamentoFormatted,
          dataConclusao: dataConclusaoFormatted,
          prioridade: mappedService.prioridade,
          status: mappedService.status,
          custo: mappedService.custo ? mappedService.custo.toString() : '',
          observacoes: mappedService.observacoes || '',
          createdAt: mappedService.createdAt || new Date(),
          updatedAt: mappedService.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços com custos:', error);
      return [];
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    try {
      console.log('📝 [STORAGE] Criando serviço com dados:', JSON.stringify(serviceData, null, 2));
      
      const technician = await this.getTechnician(serviceData.tecnico_id);
      const tecnicoNome = technician?.nome || "Desconhecido";
      
      let dataAgendamento: Date | null = null;
      
      if (serviceData.data_agendamento) {
        dataAgendamento = anyToDate(serviceData.data_agendamento);
      }
      
      if (!dataAgendamento) {
        console.log('⚠️  [STORAGE] Data_agendamento não fornecida, usando data atual');
        dataAgendamento = new Date();
      }
      
      console.log('📅 [STORAGE] Data_agendamento final para banco:', dataAgendamento.toISOString());
      
      let dataConclusao: Date | null = null;
      if (serviceData.data_conclusao) {
        dataConclusao = anyToDate(serviceData.data_conclusao);
      }
      
      let custoValue = null;
      if (serviceData.custo) {
        if (typeof serviceData.custo === 'string') {
          const parsedCusto = parseFloat(serviceData.custo);
          if (!isNaN(parsedCusto)) {
            custoValue = parsedCusto;
          }
        } else if (typeof serviceData.custo === 'number') {
          custoValue = serviceData.custo;
        }
      }
      
      const processedData = {
        tipo_servico: serviceData.tipo_servico || 'PREVENTIVA',
        maquina_id: serviceData.maquina_id,
        tecnico_id: serviceData.tecnico_id,
        tecnico_nome: tecnicoNome,
        descricao_servico: serviceData.descricao_servico || '',
        descricao_problema: serviceData.descricao_problema || '',
        data_agendamento: dataAgendamento,
        data_conclusao: dataConclusao,
        prioridade: serviceData.prioridade || 'MEDIA',
        status: serviceData.status || 'AGENDADO',
        custo: custoValue,
        observacoes: serviceData.observacoes || ''
      };
      
      console.log('📝 [STORAGE] Dados processados para banco:', JSON.stringify(processedData, null, 2));
      
      const [service] = await db.insert(services).values({
        ...processedData,
        updated_at: new Date()
      }).returning();
      
      console.log('✅ [STORAGE] Serviço criado com ID:', service.id);
      
      await this.addServiceHistory({
        serviceId: service.id,
        status: service.status || 'AGENDADO',
        observacao: "Serviço criado"
      });
      
      const mappedService = mapDbToCamelCase(service, 'services');
      
      const createdDataAgendamento = mappedService.dataAgendamento ? 
        anyToDate(mappedService.dataAgendamento)?.toISOString() || '' : '';
      
      const createdDataConclusao = mappedService.dataConclusao ? 
        anyToDate(mappedService.dataConclusao)?.toISOString() || '' : '';
      
      return {
        id: service.id,
        tipoServico: mappedService.tipoServico,
        maquinaId: mappedService.maquinaId,
        tecnicoId: mappedService.tecnicoId,
        tecnicoNome: mappedService.tecnicoNome,
        descricaoServico: mappedService.descricaoServico,
        descricaoProblema: mappedService.descricaoProblema,
        dataAgendamento: createdDataAgendamento,
        dataConclusao: createdDataConclusao,
        prioridade: mappedService.prioridade,
        status: mappedService.status,
        custo: mappedService.custo ? mappedService.custo.toString() : '',
        observacoes: mappedService.observacoes || '',
        createdAt: mappedService.createdAt || new Date(),
        updatedAt: mappedService.updatedAt || new Date()
      };
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar serviço:', error.message);
      throw error;
    }
  }

  async updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    try {
      console.log('🔍🔍🔍 [STORAGE UPDATE] INICIANDO ATUALIZAÇÃO DO SERVIÇO:', id);
      console.log('📥 [STORAGE UPDATE] Dados RECEBIDOS para atualização:', JSON.stringify(serviceData, null, 2));
      
      // DEBUG DETALHADO - verificar todos os campos
      console.log('🔍 [STORAGE UPDATE] Status recebido:', serviceData.status, '(tipo:', typeof serviceData.status, ')');
      console.log('🔍 [STORAGE UPDATE] Prioridade recebida:', serviceData.prioridade, '(tipo:', typeof serviceData.prioridade, ')');
      console.log('🔍 [STORAGE UPDATE] Tipo serviço recebido:', serviceData.tipo_servico);
      
      const updateData: any = {};
      
      // MAPEAMENTO CORRETO - usar os nomes EXATOS das colunas do banco
      if (serviceData.tipo_servico !== undefined) updateData.tipo_servico = serviceData.tipo_servico;
      if (serviceData.maquina_id !== undefined) updateData.maquina_id = serviceData.maquina_id;
      if (serviceData.tecnico_id !== undefined) {
        updateData.tecnico_id = serviceData.tecnico_id;
        const technician = await this.getTechnician(serviceData.tecnico_id);
        updateData.tecnico_nome = technician?.nome || "Desconhecido";
      }
      if (serviceData.descricao_servico !== undefined) updateData.descricao_servico = serviceData.descricao_servico;
      if (serviceData.descricao_problema !== undefined) updateData.descricao_problema = serviceData.descricao_problema;
      
      // CRÍTICO: Garantir que status seja sempre passado
      if (serviceData.status !== undefined) {
        updateData.status = serviceData.status;
        console.log('✅ [STORAGE UPDATE] Status definido para atualização:', serviceData.status);
      } else {
        console.log('⚠️ [STORAGE UPDATE] Status NÃO fornecido na atualização');
      }
      
      // CRÍTICO: Garantir que prioridade seja sempre passada
      if (serviceData.prioridade !== undefined) {
        updateData.prioridade = serviceData.prioridade;
        console.log('✅ [STORAGE UPDATE] Prioridade definida para atualização:', serviceData.prioridade);
      } else {
        console.log('⚠️ [STORAGE UPDATE] Prioridade NÃO fornecida na atualização');
      }
      
      // Processar data_agendamento se fornecida
      if (serviceData.data_agendamento !== undefined) {
        console.log('📅 [STORAGE UPDATE] Processando data_agendamento para atualização:', serviceData.data_agendamento);
        
        const parsedDate = anyToDate(serviceData.data_agendamento);
        if (parsedDate) {
          updateData.data_agendamento = parsedDate;
          console.log('✅ [STORAGE UPDATE] Data_agendamento parseada:', parsedDate.toISOString());
        } else {
          console.log('❌ [STORAGE UPDATE] Falha ao parsear data_agendamento');
        }
      }
      
      // Processar data_conclusao se fornecida
      if (serviceData.data_conclusao !== undefined) {
        if (serviceData.data_conclusao) {
          const parsedDate = anyToDate(serviceData.data_conclusao);
          if (parsedDate) {
            updateData.data_conclusao = parsedDate;
            console.log('✅ [STORAGE UPDATE] Data_conclusao parseada:', parsedDate.toISOString());
          }
        } else {
          updateData.data_conclusao = null;
          console.log('📅 [STORAGE UPDATE] Data_conclusao definida como null');
        }
      }
      
      if (serviceData.custo !== undefined) updateData.custo = serviceData.custo;
      if (serviceData.observacoes !== undefined) updateData.observacoes = serviceData.observacoes;
      
      updateData.updated_at = new Date();
      
      console.log('📝 [STORAGE UPDATE] Dados FINAIS para atualização no banco:', JSON.stringify(updateData, null, 2));
      
      // VERIFICAR se há dados para atualizar
      if (Object.keys(updateData).length === 0) {
        console.log('❌ [STORAGE UPDATE] Nenhum dado para atualizar!');
        return undefined;
      }
      
      const [service] = await db.update(services)
        .set(updateData)
        .where(eq(services.id, id))
        .returning();
      
      if (!service) {
        console.log('❌ [STORAGE UPDATE] Serviço não encontrado para atualização:', id);
        return undefined;
      }
      
      // Adicionar ao histórico se o status mudou
      if (serviceData.status) {
        await this.addServiceHistory({
          serviceId: id,
          status: serviceData.status,
          observacao: "Status atualizado"
        });
      }
      
      console.log('✅ [STORAGE UPDATE] Serviço atualizado com ID:', service.id);
      
      const mappedService = mapDbToCamelCase(service, 'services');
      
      const updatedDataAgendamento = mappedService.dataAgendamento ? 
        anyToDate(mappedService.dataAgendamento)?.toISOString() || '' : '';
      
      const updatedDataConclusao = mappedService.dataConclusao ? 
        anyToDate(mappedService.dataConclusao)?.toISOString() || '' : '';
      
      return {
        id: service.id,
        tipoServico: mappedService.tipoServico,
        maquinaId: mappedService.maquinaId,
        tecnicoId: mappedService.tecnicoId,
        tecnicoNome: mappedService.tecnicoNome,
        descricaoServico: mappedService.descricaoServico,
        descricaoProblema: mappedService.descricaoProblema,
        dataAgendamento: updatedDataAgendamento,
        dataConclusao: updatedDataConclusao,
        prioridade: mappedService.prioridade,
        status: mappedService.status,
        custo: mappedService.custo ? mappedService.custo.toString() : '',
        observacoes: mappedService.observacoes || '',
        createdAt: mappedService.createdAt || new Date(),
        updatedAt: mappedService.updatedAt || new Date()
      };
    } catch (error: any) {
      console.error('❌ [STORAGE UPDATE] Erro ao atualizar serviço:', error.message);
      return undefined;
    }
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      const result = await db.delete(services).where(eq(services.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao deletar serviço:', error);
      return false;
    }
  }

  // ========== SERVICE HISTORY ==========
  async addServiceHistory(historyData: InsertServiceHistory): Promise<ServiceHistory> {
    try {
      const dbData = mapCamelToDb(historyData, 'service_history');
      
      const [history] = await db.insert(serviceHistory).values(dbData).returning();
      return mapDbToCamelCase(history, 'service_history');
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao adicionar histórico:', error);
      throw error;
    }
  }

  async getServiceHistory(serviceId: string): Promise<ServiceHistory[]> {
    try {
      const historyList = await db.select()
        .from(serviceHistory)
        .where(eq(serviceHistory.service_id, serviceId))
        .orderBy(desc(serviceHistory.created_at));
      return historyList.map(history => mapDbToCamelCase(history, 'service_history'));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar histórico:', error);
      return [];
    }
  }

  // ========== DASHBOARD STATS ==========
  async getDashboardStats(): Promise<{
    activeMachines: number;
    maintenanceMachines: number;
    defectMachines: number;
    pendingServices: number;
    completedServices: number;
    totalCost: number;
    avgServiceCost: number;
  }> {
    try {
      const [activeResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'ATIVO'));
      
      const [maintenanceResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'MANUTENCAO'));
      
      const [defectResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'DEFEITO'));
      
      const [pendingResult] = await db.select({ count: count() })
        .from(services)
        .where(sql`status IN ('AGENDADO', 'PENDENTE', 'EM_ANDAMENTO')`);
      
      const [completedResult] = await db.select({ count: count() })
        .from(services)
        .where(eq(services.status, 'CONCLUIDO'));
      
      const [costResult] = await db.select({ 
        total: sum(services.custo),
        avg: avg(services.custo)
      })
        .from(services)
        .where(sql`${services.custo} IS NOT NULL`);
      
      return {
        activeMachines: activeResult?.count || 0,
        maintenanceMachines: maintenanceResult?.count || 0,
        defectMachines: defectResult?.count || 0,
        pendingServices: pendingResult?.count || 0,
        completedServices: completedResult?.count || 0,
        totalCost: costResult?.total ? parseFloat(costResult.total) : 0,
        avgServiceCost: costResult?.avg ? parseFloat(costResult.avg) : 0
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar estatísticas:', error);
      return {
        activeMachines: 0,
        maintenanceMachines: 0,
        defectMachines: 0,
        pendingServices: 0,
        completedServices: 0,
        totalCost: 0,
        avgServiceCost: 0
      };
    }
  }

  // ========== REPORTS ==========
  async getServiceTypesStats(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    try {
      let query = db.select({
        tipo_servico: services.tipo_servico,
        count: count()
      })
      .from(services)
      .groupBy(services.tipo_servico);
      
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(services.data_agendamento, startDate),
            lte(services.data_agendamento, endDate)
          )
        );
      }
      
      const result = await query;
      
      const stats: Record<string, number> = {};
      result.forEach(row => {
        stats[row.tipo_servico] = row.count || 0;
      });
      
      return stats;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar estatísticas de tipos de serviço:', error);
      return {};
    }
  }

  async getTechnicianPerformance(startDate?: Date, endDate?: Date): Promise<Array<{
    technicianId: string;
    technicianName: string;
    completedServices: number;
    totalServices: number;
    avgCompletionTime: number;
    totalCost: number;
  }>> {
    try {
      let baseQuery = db.select({
        tecnico_id: services.tecnico_id,
        tecnico_nome: services.tecnico_nome,
        totalServices: count(),
        completedServices: sql<number>`COUNT(CASE WHEN ${services.status} = 'CONCLUIDO' THEN 1 END)`,
        totalCost: sum(services.custo),
        avgCompletionTime: sql<number>`AVG(
          EXTRACT(EPOCH FROM (${services.data_conclusao} - ${services.data_agendamento})) / 86400
        )`
      })
      .from(services)
      .groupBy(services.tecnico_id, services.tecnico_nome);
      
      if (startDate && endDate) {
        baseQuery = baseQuery.where(
          and(
            gte(services.data_agendamento, startDate),
            lte(services.data_agendamento, endDate)
          )
        );
      }
      
      const result = await baseQuery;
      
      return result.map(row => ({
        technicianId: row.tecnico_id,
        technicianName: row.tecnico_nome,
        completedServices: row.completedServices || 0,
        totalServices: row.totalServices || 0,
        avgCompletionTime: row.avgCompletionTime ? parseFloat(row.avgCompletionTime) : 0,
        totalCost: row.totalCost ? parseFloat(row.totalCost) : 0
      }));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar desempenho de técnicos:', error);
      return [];
    }
  }

  async getMonthlyServiceStats(year?: number): Promise<Array<{
    month: string;
    totalServices: number;
    completedServices: number;
    pendingServices: number;
    totalCost: number;
  }>> {
    try {
      const currentYear = year || new Date().getFullYear();
      
      const result = await db.select({
        month: sql<string>`TO_CHAR(${services.data_agendamento}, 'YYYY-MM')`,
        totalServices: count(),
        completedServices: sql<number>`COUNT(CASE WHEN ${services.status} = 'CONCLUIDO' THEN 1 END)`,
        pendingServices: sql<number>`COUNT(CASE WHEN ${services.status} IN ('AGENDADO', 'EM_ANDAMENTO', 'PENDENTE') THEN 1 END)`,
        totalCost: sum(services.custo)
      })
      .from(services)
      .where(sql`EXTRACT(YEAR FROM ${services.data_agendamento}) = ${currentYear}`)
      .groupBy(sql`TO_CHAR(${services.data_agendamento}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${services.data_agendamento}, 'YYYY-MM')`);
      
      return result.map(row => ({
        month: row.month,
        totalServices: row.totalServices || 0,
        completedServices: row.completedServices || 0,
        pendingServices: row.pendingServices || 0,
        totalCost: row.totalCost ? parseFloat(row.totalCost) : 0
      }));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar estatísticas mensais:', error);
      return [];
    }
  }

  async getBranchStats(): Promise<Array<{
    branch: string;
    machineCount: number;
    activeMachines: number;
    totalServices: number;
    totalCost: number;
  }>> {
    try {
      const result = await db.select({
        branch: machines.branch,
        machineCount: count(machines.id),
        activeMachines: sql<number>`COUNT(CASE WHEN ${machines.status} = 'ATIVO' THEN 1 END)`,
        totalServices: count(services.id),
        totalCost: sum(services.custo)
      })
      .from(machines)
      .leftJoin(services, eq(machines.id, services.maquina_id))
      .groupBy(machines.branch)
      .orderBy(machines.branch);
      
      return result.map(row => ({
        branch: row.branch || 'Não especificada',
        machineCount: row.machineCount || 0,
        activeMachines: row.activeMachines || 0,
        totalServices: row.totalServices || 0,
        totalCost: row.totalCost ? parseFloat(row.totalCost) : 0
      }));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar estatísticas por filial:', error);
      return [];
    }
  }

  async getCostAnalysis(startDate?: Date, endDate?: Date): Promise<{
    byType: Array<{ type: string; count: number; totalCost: number; avgCost: number }>;
    byTechnician: Array<{ technicianName: string; count: number; totalCost: number; avgCost: number }>;
    byBranch: Array<{ branch: string; count: number; totalCost: number; avgCost: number }>;
    byPriority: Array<{ priority: string; count: number; totalCost: number; avgCost: number }>;
  }> {
    try {
      let whereClause = sql`${services.custo} IS NOT NULL`;
      
      if (startDate && endDate) {
        whereClause = sql`${whereClause} AND ${services.data_agendamento} >= ${startDate} AND ${services.data_agendamento} <= ${endDate}`;
      }
      
      const byTypeResult = await db.select({
        type: services.tipo_servico,
        count: count(),
        totalCost: sum(services.custo),
        avgCost: avg(services.custo)
      })
      .from(services)
      .where(whereClause)
      .groupBy(services.tipo_servico);
      
      const byTechnicianResult = await db.select({
        technicianName: services.tecnico_nome,
        count: count(),
        totalCost: sum(services.custo),
        avgCost: avg(services.custo)
      })
      .from(services)
      .where(whereClause)
      .groupBy(services.tecnico_nome)
      .orderBy(sql`${sum(services.custo)} DESC`);
      
      const byBranchResult = await db.select({
        branch: machines.branch,
        count: count(services.id),
        totalCost: sum(services.custo),
        avgCost: avg(services.custo)
      })
      .from(services)
      .leftJoin(machines, eq(services.maquina_id, machines.id))
      .where(whereClause)
      .groupBy(machines.branch)
      .orderBy(sql`${sum(services.custo)} DESC`);
      
      const byPriorityResult = await db.select({
        priority: services.prioridade,
        count: count(),
        totalCost: sum(services.custo),
        avgCost: avg(services.custo)
      })
      .from(services)
      .where(whereClause)
      .groupBy(services.prioridade);
      
      return {
        byType: byTypeResult.map(row => ({
          type: row.type,
          count: row.count || 0,
          totalCost: row.totalCost ? parseFloat(row.totalCost) : 0,
          avgCost: row.avgCost ? parseFloat(row.avgCost) : 0
        })),
        byTechnician: byTechnicianResult.map(row => ({
          technicianName: row.technicianName || 'Desconhecido',
          count: row.count || 0,
          totalCost: row.totalCost ? parseFloat(row.totalCost) : 0,
          avgCost: row.avgCost ? parseFloat(row.avgCost) : 0
        })),
        byBranch: byBranchResult.map(row => ({
          branch: row.branch || 'Não especificada',
          count: row.count || 0,
          totalCost: row.totalCost ? parseFloat(row.totalCost) : 0,
          avgCost: row.avgCost ? parseFloat(row.avgCost) : 0
        })),
        byPriority: byPriorityResult.map(row => ({
          priority: row.priority || 'MEDIA',
          count: row.count || 0,
          totalCost: row.totalCost ? parseFloat(row.totalCost) : 0,
          avgCost: row.avgCost ? parseFloat(row.avgCost) : 0
        }))
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro na análise de custos:', error);
      return {
        byType: [],
        byTechnician: [],
        byBranch: [],
        byPriority: []
      };
    }
  }

  async getMachineMaintenanceHistory(machineId: string): Promise<Array<{
    service: Service;
    daysSinceLastService: number;
    totalCost: number;
  }>> {
    try {
      const servicesList = await this.getServicesByMachine(machineId);
      
      if (servicesList.length === 0) {
        return [];
      }
      
      const sortedServices = servicesList.sort((a, b) => {
        const dateA = a.dataAgendamento ? new Date(a.dataAgendamento) : new Date(0);
        const dateB = b.dataAgendamento ? new Date(b.dataAgendamento) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      const result = [];
      let lastServiceDate: Date | null = null;
      let totalCost = 0;
      
      for (const service of sortedServices) {
        const serviceDate = service.dataAgendamento ? new Date(service.dataAgendamento) : new Date();
        const daysSince = lastServiceDate 
          ? Math.floor((lastServiceDate.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const cost = parseFloat(service.custo) || 0;
        totalCost += cost;
        
        result.push({
          service,
          daysSinceLastService: daysSince,
          totalCost
        });
        
        lastServiceDate = serviceDate;
      }
      
      return result;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar histórico de manutenção da máquina:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();