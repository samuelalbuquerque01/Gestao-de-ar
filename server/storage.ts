import { 
  type User, type InsertUser,
  type Technician, type InsertTechnician,
  type Machine, type InsertMachine,
  type Service, type InsertService,
  type ServiceHistory, type InsertServiceHistory
} from "../shared/schema.js";
import { db } from "./db.js";
import { 
  users, technicians, machines, services, serviceHistory 
} from "../shared/schema.js";
import { eq, and, desc, sql, count, gte, lte, sum, avg } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  
  getTechnician(id: string): Promise<Technician | undefined>;
  getAllTechnicians(): Promise<Technician[]>;
  createTechnician(technicianData: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: string): Promise<boolean>;
  
  getMachine(id: string): Promise<Machine | undefined>;
  getMachineByCodigo(codigo: string): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  getMachinesByStatus(status: string): Promise<Machine[]>;
  getMachinesByBranch(branch: string): Promise<Machine[]>;
  createMachine(machineData: InsertMachine): Promise<Machine>;
  updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<boolean>;
  
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
  
  addServiceHistory(historyData: InsertServiceHistory): Promise<ServiceHistory>;
  getServiceHistory(serviceId: string): Promise<ServiceHistory[]>;
  
  getDashboardStats(): Promise<{
    activeMachines: number;
    maintenanceMachines: number;
    defectMachines: number;
    pendingServices: number;
    completedServices: number;
    totalCost: number;
    avgServiceCost: number;
  }>;
  
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

function mapDbToCamelCase(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = JSON.parse(JSON.stringify(data));
  if (tableName === 'users') {
    if ('password_hash' in result) {
      result.password = result.password_hash;
    }
    
    if ('created_at' in result) {
      result.createdAt = result.created_at;
    }
    
    if ('updated_at' in result) {
      result.updatedAt = result.updated_at;
    }
    
    if ('is_active' in result) {
      result.isActive = result.is_active;
    }
    
    const keysToDelete = [
      'password_hash', 'created_at', 'updated_at', 'is_active'
    ];
    
    keysToDelete.forEach(key => {
      if (key in result) {
        delete result[key];
      }
    });
  } else if (tableName === 'services') {
    if ('tipo_servico' in result) {
      result.tipoServico = result.tipo_servico;
    }
    if ('maquina_id' in result) result.maquinaId = result.maquina_id;
    if ('tecnico_id' in result) result.tecnicoId = result.tecnico_id;
    if ('tecnico_nome' in result) result.tecnicoNome = result.tecnico_nome;
    if ('descricao_servico' in result) result.descricaoServico = result.descricao_servico;
    if ('descricao_problema' in result) result.descricaoProblema = result.descricao_problema;
    if ('data_agendamento' in result) result.dataAgendamento = result.data_agendamento;
    if ('data_conclusao' in result) result.dataConclusao = result.data_conclusao;
    
    if ('prioridade' in result) {
      result.prioridade = result.prioridade;
    } else {
    }
    
    if ('status' in result) {
      result.status = result.status;
    } else {
    }
    
    if ('custo' in result) result.custo = result.custo;
    if ('observacoes' in result) result.observacoes = result.observacoes;
    if ('created_at' in result) result.createdAt = result.created_at;
    if ('updated_at' in result) result.updatedAt = result.updated_at;
    
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

function mapCamelToDb(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = JSON.parse(JSON.stringify(data));
  
  if (tableName === 'users') {
    if ('password' in result) {
      result.password_hash = result.password;
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
    console.error('[ERRO] [anyToDate] Erro ao converter para Date:', error, 'Valor:', dateValue);
    return null;
  }
}

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
    console.error('[ERRO] [safeDateToISO] Erro:', error);
    return '';
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (user) {
        const mappedUser = mapDbToCamelCase(user, 'users');
        return mappedUser;
      }
      
      return undefined;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao buscar usuario por ID:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (!username || username.trim() === '') {
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.username, String(username).trim()));
      
      if (user) {
        const mappedUser = mapDbToCamelCase(user, 'users');
        return mappedUser;
      }
      return undefined;
      
    } catch (error: any) {
      console.error('[ERRO] [STORAGE] Erro ao buscar por username:', error.message);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (!email || email.trim() === '') {
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, String(email).trim()));
      
      if (user) {
        return mapDbToCamelCase(user, 'users');
      }
      
      return undefined;
      
    } catch (error: any) {
      console.error('[ERRO] [STORAGE] Erro ao buscar por email:', error.message);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const dbData = mapCamelToDb(userData, 'users');
      
      const [user] = await db.insert(users)
        .values({
          ...dbData,
          role: userData.role || 'technician',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      return mapDbToCamelCase(user, 'users');
    } catch (error: any) {
      console.error('[ERRO] [STORAGE] Erro ao criar usuario:', error.message);
      throw error;
    }
  }

  async getTechnician(id: string): Promise<Technician | undefined> {
    try {
      const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
      return tech ? mapDbToCamelCase(tech, 'technicians') : undefined;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao buscar tecnico:', error);
      return undefined;
    }
  }

  async getAllTechnicians(): Promise<Technician[]> {
    try {
      const techs = await db.select().from(technicians).orderBy(technicians.nome);
      return techs.map(tech => mapDbToCamelCase(tech, 'technicians'));
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao buscar tecnicos:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao criar tecnico:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao atualizar tecnico:', error);
      return undefined;
    }
  }

  async deleteTechnician(id: string): Promise<boolean> {
    try {
      const result = await db.delete(technicians).where(eq(technicians.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao deletar tecnico:', error);
      return false;
    }
  }

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
      console.error('[ERRO] [STORAGE] Erro ao buscar maquina:', error);
      return undefined;
    }
  }

  async getMachineByCodigo(codigo: string): Promise<Machine | undefined> {
    try {
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
      console.error('[ERRO] [STORAGE] Erro ao buscar maquina por c?digo:', error.message);
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
          console.error(`[ERRO] [STORAGE] Erro ao processar dataInstalacao da maquina ${machine.id}:`, error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar maquinas:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar maquinas por status:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar maquinas por filial:', error);
      return [];
    }
  }

  async createMachine(machineData: InsertMachine): Promise<Machine> {
    try {
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
      const [machine] = await db.insert(machines).values({
        ...dbData,
        updated_at: new Date()
      }).returning();
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
      console.error('[ERRO] [STORAGE] Erro ao criar maquina:', error.message);
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
      const [machine] = await db.update(machines)
        .set(updateData)
        .where(eq(machines.id, id))
        .returning();
      
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
      console.error('[ERRO] [STORAGE] Erro ao atualizar maquina:', error);
      return undefined;
    }
  }

  async deleteMachine(id: string): Promise<boolean> {
    try {
      const result = await db.delete(machines).where(eq(machines.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao deletar maquina:', error);
      return false;
    }
  }

  async getService(id: string): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      if (!service) {
        return undefined;
      }
      
      const mappedService = mapDbToCamelCase(service, 'services');
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servico:', error);
      return undefined;
    }
  }

  async getAllServices(): Promise<Service[]> {
    try {
      const servicesList = await db.select().from(services).orderBy(desc(services.data_agendamento));
      const mappedServices = servicesList.map(service => {
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
      
      if (mappedServices.length > 0) {
      }
      
      return mappedServices;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos por maquina:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos por tecnico:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos por data:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos por status:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos por tipo:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos conclu?dos:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar servicos com custos:', error);
      return [];
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    try {
      const technician = await this.getTechnician(serviceData.tecnico_id);
      const tecnicoNome = technician?.nome || "Desconhecido";
      
      let dataAgendamento: Date | null = null;
      
      if (serviceData.data_agendamento) {
        dataAgendamento = anyToDate(serviceData.data_agendamento);
      }
      
      if (!dataAgendamento) {
        dataAgendamento = new Date();
      }
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
      const [service] = await db.insert(services).values({
        ...processedData,
        updated_at: new Date()
      }).returning();
      await this.addServiceHistory({
        serviceId: service.id,
        status: service.status || 'AGENDADO',
        observacao: "Servico criado"
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
      console.error('[ERRO] [STORAGE] Erro ao criar servico:', error.message);
      throw error;
    }
  }

  async updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const updateData: any = {};
      
      if (serviceData.tipo_servico !== undefined) updateData.tipo_servico = serviceData.tipo_servico;
      if (serviceData.maquina_id !== undefined) updateData.maquina_id = serviceData.maquina_id;
      if (serviceData.tecnico_id !== undefined) {
        updateData.tecnico_id = serviceData.tecnico_id;
        const technician = await this.getTechnician(serviceData.tecnico_id);
        updateData.tecnico_nome = technician?.nome || "Desconhecido";
      }
      if (serviceData.descricao_servico !== undefined) updateData.descricao_servico = serviceData.descricao_servico;
      if (serviceData.descricao_problema !== undefined) updateData.descricao_problema = serviceData.descricao_problema;
      
      if (serviceData.status !== undefined) {
        updateData.status = serviceData.status;
      } else {
      }
      
      if (serviceData.prioridade !== undefined) {
        updateData.prioridade = serviceData.prioridade;
      } else {
      }
      
      if (serviceData.data_agendamento !== undefined) {
        const parsedDate = anyToDate(serviceData.data_agendamento);
        if (parsedDate) {
          updateData.data_agendamento = parsedDate;
        } else {
        }
      }
      
      if (serviceData.data_conclusao !== undefined) {
        if (serviceData.data_conclusao) {
          const parsedDate = anyToDate(serviceData.data_conclusao);
          if (parsedDate) {
            updateData.data_conclusao = parsedDate;
          }
        } else {
          updateData.data_conclusao = null;
        }
      }
      
      if (serviceData.custo !== undefined) updateData.custo = serviceData.custo;
      if (serviceData.observacoes !== undefined) updateData.observacoes = serviceData.observacoes;
      
      updateData.updated_at = new Date();
      if (Object.keys(updateData).length === 0) {
        return undefined;
      }
      
      const [service] = await db.update(services)
        .set(updateData)
        .where(eq(services.id, id))
        .returning();
      
      if (!service) {
        return undefined;
      }
      
      if (serviceData.status) {
        await this.addServiceHistory({
          serviceId: id,
          status: serviceData.status,
          observacao: "Status atualizado"
        });
      }
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
      console.error('[ERRO] [STORAGE UPDATE] Erro ao atualizar servico:', error.message);
      return undefined;
    }
  }

  async deleteService(id: string): Promise<boolean> {
    try {
      const result = await db.delete(services).where(eq(services.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao deletar servico:', error);
      return false;
    }
  }

  async addServiceHistory(historyData: InsertServiceHistory): Promise<ServiceHistory> {
    try {
      const dbData = mapCamelToDb(historyData, 'service_history');
      
      const [history] = await db.insert(serviceHistory).values(dbData).returning();
      return mapDbToCamelCase(history, 'service_history');
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao adicionar historico:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar historico:', error);
      return [];
    }
  }

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
      console.error('[ERRO] [STORAGE] Erro ao buscar estatisticas:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar estatisticas de tipos de servico:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar desempenho de tecnicos:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar estatisticas mensais:', error);
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
        branch: row.branch || 'Nao especificada',
        machineCount: row.machineCount || 0,
        activeMachines: row.activeMachines || 0,
        totalServices: row.totalServices || 0,
        totalCost: row.totalCost ? parseFloat(row.totalCost) : 0
      }));
    } catch (error) {
      console.error('[ERRO] [STORAGE] Erro ao buscar estatisticas por filial:', error);
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
          branch: row.branch || 'Nao especificada',
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
      console.error('[ERRO] [STORAGE] Erro na analise de custos:', error);
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
      console.error('[ERRO] [STORAGE] Erro ao buscar historico de manutencao da maquina:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();


