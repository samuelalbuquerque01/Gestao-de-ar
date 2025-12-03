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
import { eq, and, desc, like, sql, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Technicians
  getTechnician(id: string): Promise<Technician | undefined>;
  getAllTechnicians(): Promise<Technician[]>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: string, technician: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: string): Promise<boolean>;
  
  // Machines
  getMachine(id: string): Promise<Machine | undefined>;
  getMachineByCodigo(codigo: string): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: string, machine: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<boolean>;
  
  // Services
  getService(id: string): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  getServicesByMachine(machineId: string): Promise<Service[]>;
  getServicesByTechnician(technicianId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;
  
  // Dashboard Stats
  getDashboardStats(): Promise<{
    activeMachines: number;
    maintenanceMachines: number;
    defectMachines: number;
    pendingServices: number;
    completedServices: number;
  }>;
}

// Função auxiliar para converter snake_case para camelCase
function mapDbToCamelCase(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = { ...data };
  
  // Mapeamentos específicos por tabela
  if (tableName === 'users') {
    if (result.password_hash) result.password = result.password_hash;
    if (result.created_at) result.createdAt = result.created_at;
    if (result.updated_at) result.updatedAt = result.updated_at;
    delete result.password_hash;
    delete result.created_at;
    delete result.updated_at;
  }
  
  if (tableName === 'technicians') {
    if (result.created_at) result.createdAt = result.created_at;
    if (result.updated_at) result.updatedAt = result.updated_at;
    delete result.created_at;
    delete result.updated_at;
  }
  
  if (tableName === 'machines') {
    if (result.capacidade_btu) result.capacidadeBTU = result.capacidade_btu;
    if (result.localizacao_tipo) result.localizacaoTipo = result.localizacao_tipo;
    if (result.localizacao_descricao) result.localizacaoDescricao = result.localizacao_descricao;
    if (result.localizacao_andar) result.localizacaoAndar = result.localizacao_andar;
    if (result.data_instalacao) result.dataInstalacao = result.data_instalacao;
    if (result.created_at) result.createdAt = result.created_at;
    if (result.updated_at) result.updatedAt = result.updated_at;
    
    delete result.capacidade_btu;
    delete result.localizacao_tipo;
    delete result.localizacao_descricao;
    delete result.localizacao_andar;
    delete result.data_instalacao;
    delete result.created_at;
    delete result.updated_at;
  }
  
  if (tableName === 'services') {
    if (result.tipo_servico) result.tipoServico = result.tipo_servico;
    if (result.maquina_id) result.maquinaId = result.maquina_id;
    if (result.data_agendamento) result.dataAgendamento = result.data_agendamento;
    if (result.tecnico_id) result.tecnicoId = result.tecnico_id;
    if (result.tecnico_nome) result.tecnicoNome = result.tecnico_nome;
    if (result.descricao_servico) result.descricaoServico = result.descricao_servico;
    if (result.descricao_problema) result.descricaoProblema = result.descricao_problema;
    if (result.created_at) result.createdAt = result.created_at;
    if (result.updated_at) result.updatedAt = result.updated_at;
    
    delete result.tipo_servico;
    delete result.maquina_id;
    delete result.data_agendamento;
    delete result.tecnico_id;
    delete result.tecnico_nome;
    delete result.descricao_servico;
    delete result.descricao_problema;
    delete result.created_at;
    delete result.updated_at;
  }
  
  if (tableName === 'service_history') {
    if (result.service_id) result.serviceId = result.service_id;
    if (result.created_at) result.createdAt = result.created_at;
    if (result.created_by) result.createdBy = result.created_by;
    delete result.service_id;
    delete result.created_at;
    delete result.created_by;
  }
  
  return result;
}

// Função auxiliar para converter camelCase para snake_case
function mapCamelToDb(data: any, tableName: string): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = { ...data };
  
  if (tableName === 'users') {
    if (result.password) result.password_hash = result.password;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    delete result.password;
    delete result.createdAt;
    delete result.updatedAt;
  }
  
  if (tableName === 'technicians') {
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    delete result.createdAt;
    delete result.updatedAt;
  }
  
  if (tableName === 'machines') {
    if (result.capacidadeBTU) result.capacidade_btu = result.capacidadeBTU;
    if (result.localizacaoTipo) result.localizacao_tipo = result.localizacaoTipo;
    if (result.localizacaoDescricao) result.localizacao_descricao = result.localizacaoDescricao;
    if (result.localizacaoAndar !== undefined) result.localizacao_andar = result.localizacaoAndar;
    if (result.dataInstalacao) result.data_instalacao = result.dataInstalacao;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    
    delete result.capacidadeBTU;
    delete result.localizacaoTipo;
    delete result.localizacaoDescricao;
    delete result.localizacaoAndar;
    delete result.dataInstalacao;
    delete result.createdAt;
    delete result.updatedAt;
  }
  
  if (tableName === 'services') {
    if (result.tipoServico) result.tipo_servico = result.tipoServico;
    if (result.maquinaId) result.maquina_id = result.maquinaId;
    if (result.dataAgendamento) result.data_agendamento = result.dataAgendamento;
    if (result.tecnicoId) result.tecnico_id = result.tecnicoId;
    if (result.tecnicoNome) result.tecnico_nome = result.tecnicoNome;
    if (result.descricaoServico) result.descricao_servico = result.descricaoServico;
    if (result.descricaoProblema) result.descricao_problema = result.descricaoProblema;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    
    delete result.tipoServico;
    delete result.maquinaId;
    delete result.dataAgendamento;
    delete result.tecnicoId;
    delete result.tecnicoNome;
    delete result.descricaoServico;
    delete result.descricaoProblema;
    delete result.createdAt;
    delete result.updatedAt;
  }
  
  if (tableName === 'service_history') {
    if (result.serviceId) result.service_id = result.serviceId;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.createdBy) result.created_by = result.createdBy;
    delete result.serviceId;
    delete result.createdAt;
    delete result.createdBy;
  }
  
  return result;
}

export class DatabaseStorage implements IStorage {
  // ========== USERS ==========
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por ID:', id);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ? mapDbToCamelCase(user, 'users') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar usuário por ID:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por username:', username);
      
      if (!username || username.trim() === '') {
        console.log('⚠️  [STORAGE] Username vazio, retornando undefined');
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.username, String(username).trim()));
      console.log('📋 [STORAGE] Resultado:', user ? `Encontrado: ${user.username}` : 'Não encontrado');
      return user ? mapDbToCamelCase(user, 'users') : undefined;
      
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar por username:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por email:', email || '(vazio)');
      
      if (!email || email.trim() === '') {
        console.log('⚠️  [STORAGE] Email vazio, retornando undefined');
        return undefined;
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, String(email).trim()));
      console.log('📋 [STORAGE] Resultado:', user ? `Encontrado: ${user.email}` : 'Não encontrado');
      return user ? mapDbToCamelCase(user, 'users') : undefined;
      
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar por email:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      return undefined;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      console.log('👤 [STORAGE] Criando usuário:', userData.username);
      console.log('📝 [STORAGE] Dados do usuário:', {
        ...userData,
        password: '***[HASHED]***'
      });
      
      // Converter para snake_case para o banco
      const dbData = mapCamelToDb(userData, 'users');
      
      const [user] = await db.insert(users)
        .values({
          ...dbData,
          role: 'technician',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      
      console.log('✅ [STORAGE] Usuário criado com ID:', user.id);
      return mapDbToCamelCase(user, 'users');
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar usuário:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
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
      return machine ? mapDbToCamelCase(machine, 'machines') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquina:', error);
      return undefined;
    }
  }

  async getMachineByCodigo(codigo: string): Promise<Machine | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando máquina por código:', codigo);
      const [machine] = await db.select().from(machines).where(eq(machines.codigo, codigo));
      return machine ? mapDbToCamelCase(machine, 'machines') : undefined;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar máquina por código:', error.message);
      return undefined;
    }
  }

  async getAllMachines(): Promise<Machine[]> {
    try {
      const machinesList = await db.select().from(machines).orderBy(machines.codigo);
      return machinesList.map(machine => mapDbToCamelCase(machine, 'machines'));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar máquinas:', error);
      return [];
    }
  }

  async createMachine(machineData: InsertMachine): Promise<Machine> {
    try {
      const dbData = mapCamelToDb(machineData, 'machines');
      
      console.log('📝 [STORAGE] Dados da máquina (convertidos):', dbData);
      
      const [machine] = await db.insert(machines).values({
        ...dbData,
        updated_at: new Date()
      }).returning();
      
      console.log('✅ [STORAGE] Máquina criada com ID:', machine.id);
      return mapDbToCamelCase(machine, 'machines');
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar máquina:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  async updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    try {
      const dbData = mapCamelToDb(machineData, 'machines');
      
      const [machine] = await db.update(machines)
        .set({
          ...dbData,
          updated_at: new Date()
        })
        .where(eq(machines.id, id))
        .returning();
      return machine ? mapDbToCamelCase(machine, 'machines') : undefined;
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
      const [service] = await db.select().from(services).where(eq(services.id, id));
      return service ? mapDbToCamelCase(service, 'services') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviço:', error);
      return undefined;
    }
  }

  async getAllServices(): Promise<Service[]> {
    try {
      const servicesList = await db.select().from(services).orderBy(desc(services.data_agendamento));
      return servicesList.map(service => mapDbToCamelCase(service, 'services'));
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
      return servicesList.map(service => mapDbToCamelCase(service, 'services'));
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
      return servicesList.map(service => mapDbToCamelCase(service, 'services'));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por técnico:', error);
      return [];
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    try {
      const dbData = mapCamelToDb(serviceData, 'services');
      
      console.log('📝 [STORAGE] Dados do serviço (convertidos):', dbData);
      
      // Get technician name for denormalization
      const technician = await this.getTechnician(dbData.tecnico_id);
      const tecnicoNome = technician?.nome || "Desconhecido";

      const [service] = await db.insert(services).values({
        ...dbData,
        tecnico_nome: tecnicoNome,
        updated_at: new Date()
      }).returning();
      
      // Add to history
      await this.addServiceHistory({
        serviceId: service.id,
        status: service.status,
        observacao: "Serviço criado"
      });
      
      console.log('✅ [STORAGE] Serviço criado com ID:', service.id);
      return mapDbToCamelCase(service, 'services');
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar serviço:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  async updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const dbData = mapCamelToDb(serviceData, 'services');
      
      // If technician is being updated, get new name
      if (dbData.tecnico_id) {
        const technician = await this.getTechnician(dbData.tecnico_id);
        dbData.tecnico_nome = technician?.nome || "Desconhecido";
      }

      const [service] = await db.update(services)
        .set({
          ...dbData,
          updated_at: new Date()
        })
        .where(eq(services.id, id))
        .returning();
      
      if (service && dbData.status) {
        await this.addServiceHistory({
          serviceId: id,
          status: dbData.status,
          observacao: "Status atualizado"
        });
      }
      
      return service ? mapDbToCamelCase(service, 'services') : undefined;
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao atualizar serviço:', error);
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
  }> {
    try {
      // Get machine counts
      const [activeResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'ATIVO'));
      
      const [maintenanceResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'MANUTENCAO'));
      
      const [defectResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'DEFEITO'));
      
      // Get service counts
      const [pendingResult] = await db.select({ count: count() })
        .from(services)
        .where(sql`status IN ('AGENDADO', 'PENDENTE')`);
      
      const [completedResult] = await db.select({ count: count() })
        .from(services)
        .where(eq(services.status, 'CONCLUIDO'));
      
      return {
        activeMachines: activeResult?.count || 0,
        maintenanceMachines: maintenanceResult?.count || 0,
        defectMachines: defectResult?.count || 0,
        pendingServices: pendingResult?.count || 0,
        completedServices: completedResult?.count || 0,
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar estatísticas:', error);
      return {
        activeMachines: 0,
        maintenanceMachines: 0,
        defectMachines: 0,
        pendingServices: 0,
        completedServices: 0,
      };
    }
  }
}

export const storage = new DatabaseStorage();