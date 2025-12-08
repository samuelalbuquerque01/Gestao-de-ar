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

// Função auxiliar para converter snake_case para camelCase COM CORREÇÕES
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
  
  // CORREÇÃO CRÍTICA PARA MACHINES
  if (tableName === 'machines') {
    // Converter campos do banco para nomes que o frontend espera
    if (result.model !== undefined) result.modelo = result.model;
    if (result.brand !== undefined) result.marca = result.brand;
    if (result.type !== undefined) result.tipo = result.type;
    if (result.capacity !== undefined) result.capacidadeBTU = result.capacity;
    if (result.voltage !== undefined) result.voltagem = result.voltage;
    if (result.locationType !== undefined) result.localizacaoTipo = result.locationType;
    if (result.location !== undefined) result.localizacaoDescricao = result.location;
    if (result.locationFloor !== undefined) result.localizacaoAndar = result.locationFloor;
    if (result.branch !== undefined) result.filial = result.branch;
    if (result.installationDate !== undefined) result.dataInstalacao = result.installationDate;
    if (result.observacoes !== undefined) result.observacoes = result.observacoes;
    if (result.createdAt !== undefined) result.createdAt = result.createdAt;
    if (result.updatedAt !== undefined) result.updatedAt = result.updatedAt;
    
    // Preservar status como está
    if (result.status !== undefined) result.status = result.status;
    
    // Remover campos do banco para evitar confusão
    delete result.model;
    delete result.brand;
    delete result.type;
    delete result.capacity;
    delete result.voltage;
    delete result.locationType;
    delete result.location;
    delete result.locationFloor;
    delete result.branch;
    delete result.installationDate;
  }
  
  if (tableName === 'services') {
    if (result.tipo_servico) result.tipoServico = result.tipo_servico;
    if (result.maquina_id) result.maquinaId = result.maquina_id;
    if (result.tecnico_id) result.tecnicoId = result.tecnico_id;
    if (result.tecnico_nome) result.tecnicoNome = result.tecnico_nome;
    if (result.descricao_servico) result.descricaoServico = result.descricao_servico;
    if (result.descricao_problema) result.descricaoProblema = result.descricao_problema;
    if (result.data_agendamento) result.dataAgendamento = result.data_agendamento;
    if (result.data_conclusao) result.dataConclusao = result.data_conclusao;
    if (result.custo) result.custo = result.custo.toString();
    if (result.created_at) result.createdAt = result.created_at;
    if (result.updated_at) result.updatedAt = result.updated_at;
    
    delete result.tipo_servico;
    delete result.maquina_id;
    delete result.tecnico_id;
    delete result.tecnico_nome;
    delete result.descricao_servico;
    delete result.descricao_problema;
    delete result.data_agendamento;
    delete result.data_conclusao;
    delete result.custo;
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

// Função auxiliar para converter camelCase para snake_case COM CORREÇÕES
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
  
  // CORREÇÃO CRÍTICA PARA MACHINES
  if (tableName === 'machines') {
    // Converter campos do frontend para nomes do banco
    if (result.modelo !== undefined) result.model = result.modelo;
    if (result.marca !== undefined) result.brand = result.marca;
    if (result.tipo !== undefined) result.type = result.tipo;
    if (result.capacidadeBTU !== undefined) result.capacity = Number(result.capacidadeBTU);
    if (result.voltagem !== undefined) result.voltage = result.voltagem;
    if (result.localizacaoTipo !== undefined) result.locationType = result.localizacaoTipo;
    if (result.localizacaoDescricao !== undefined) result.location = result.localizacaoDescricao;
    if (result.localizacaoAndar !== undefined) result.locationFloor = result.localizacaoAndar;
    if (result.filial !== undefined) result.branch = result.filial;
    if (result.dataInstalacao !== undefined) result.installationDate = result.dataInstalacao;
    if (result.observacoes !== undefined) result.observacoes = result.observacoes;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    
    // Status já está no formato correto
    if (result.status !== undefined) result.status = result.status;
    
    // Remover campos do frontend
    delete result.modelo;
    delete result.marca;
    delete result.tipo;
    delete result.capacidadeBTU;
    delete result.voltagem;
    delete result.localizacaoTipo;
    delete result.localizacaoDescricao;
    delete result.localizacaoAndar;
    delete result.filial;
    delete result.dataInstalacao;
    delete result.createdAt;
    delete result.updatedAt;
  }
  
  if (tableName === 'services') {
    if (result.tipoServico) result.tipo_servico = result.tipoServico;
    if (result.maquinaId) result.maquina_id = result.maquinaId;
    if (result.tecnicoId) result.tecnico_id = result.tecnicoId;
    if (result.tecnicoNome) result.tecnico_nome = result.tecnicoNome;
    if (result.descricaoServico) result.descricao_servico = result.descricaoServico;
    if (result.descricaoProblema) result.descricao_problema = result.descricaoProblema;
    if (result.dataAgendamento) result.data_agendamento = result.dataAgendamento;
    if (result.dataConclusao) result.data_conclusao = result.dataConclusao;
    if (result.custo) result.custo = result.custo;
    if (result.createdAt) result.created_at = result.createdAt;
    if (result.updatedAt) result.updated_at = result.updatedAt;
    
    delete result.tipoServico;
    delete result.maquinaId;
    delete result.tecnicoId;
    delete result.tecnicoNome;
    delete result.descricaoServico;
    delete result.descricaoProblema;
    delete result.dataAgendamento;
    delete result.dataConclusao;
    delete result.custo;
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

// Função auxiliar para validar e formatar datas
function safeDateToISO(dateValue: any): string {
  if (!dateValue) return new Date().toISOString();
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
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
      console.log('🔍 [STORAGE] Buscando máquina por ID:', id);
      const [machine] = await db.select().from(machines).where(eq(machines.id, id));
      
      if (!machine) {
        console.log('⚠️  [STORAGE] Máquina não encontrada');
        return undefined;
      }
      
      console.log('📋 [STORAGE] Máquina encontrada no banco:', {
        id: machine.id,
        codigo: machine.codigo,
        model: machine.model,
        brand: machine.brand
      });
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      console.log('📋 [STORAGE] Máquina mapeada:', {
        id: mappedMachine.id,
        codigo: mappedMachine.codigo,
        modelo: mappedMachine.modelo,
        marca: mappedMachine.marca
      });
      
      return mappedMachine;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar máquina:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      return undefined;
    }
  }

  async getMachineByCodigo(codigo: string): Promise<Machine | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando máquina por código:', codigo);
      const [machine] = await db.select().from(machines).where(eq(machines.codigo, codigo));
      
      if (!machine) {
        console.log('⚠️  [STORAGE] Máquina não encontrada por código');
        return undefined;
      }
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      console.log('✅ [STORAGE] Máquina encontrada por código:', mappedMachine.codigo);
      
      return mappedMachine;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar máquina por código:', error.message);
      return undefined;
    }
  }

  async getAllMachines(): Promise<Machine[]> {
    try {
      console.log('🔍 [STORAGE] Buscando todas as máquinas...');
      
      const machinesList = await db.select().from(machines).orderBy(machines.codigo);
      
      console.log('📊 [STORAGE] Máquinas encontradas no banco:', machinesList.length);
      
      if (machinesList.length > 0) {
        console.log('📋 [STORAGE] Primeira máquina no banco:', {
          id: machinesList[0].id,
          codigo: machinesList[0].codigo,
          model: machinesList[0].model,
          brand: machinesList[0].brand,
          type: machinesList[0].type
        });
      }
      
      const mappedMachines = machinesList.map(machine => {
        const mapped = mapDbToCamelCase(machine, 'machines');
        console.log('📝 [STORAGE] Mapeando:', {
          original: { model: machine.model, brand: machine.brand },
          mapped: { modelo: mapped.modelo, marca: mapped.marca }
        });
        return mapped;
      });
      
      console.log('✅ [STORAGE] Máquinas mapeadas:', mappedMachines.length);
      
      return mappedMachines;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao buscar máquinas:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      return [];
    }
  }

  async createMachine(machineData: InsertMachine): Promise<Machine> {
    try {
      console.log('📝 [STORAGE] Criando máquina com dados:', JSON.stringify(machineData, null, 2));
      
      // Converter para formato do banco
      const dbData = mapCamelToDb(machineData, 'machines');
      
      console.log('📝 [STORAGE] Dados convertidos para banco:', JSON.stringify(dbData, null, 2));
      
      const [machine] = await db.insert(machines).values({
        ...dbData,
        updated_at: new Date()
      }).returning();
      
      console.log('✅ [STORAGE] Máquina criada com ID:', machine.id);
      console.log('📋 [STORAGE] Dados criados no banco:', {
        id: machine.id,
        codigo: machine.codigo,
        model: machine.model,
        brand: machine.brand
      });
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      console.log('📋 [STORAGE] Máquina mapeada para retorno:', {
        id: mappedMachine.id,
        codigo: mappedMachine.codigo,
        modelo: mappedMachine.modelo,
        marca: mappedMachine.marca
      });
      
      return mappedMachine;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar máquina:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  async updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    try {
      console.log('📝 [STORAGE] Atualizando máquina:', id);
      console.log('📝 [STORAGE] Dados recebidos:', JSON.stringify(machineData, null, 2));
      
      const dbData = mapCamelToDb(machineData, 'machines');
      
      // Garantir que updated_at seja atualizado
      dbData.updated_at = new Date();
      
      console.log('📝 [STORAGE] Dados para atualização no banco:', JSON.stringify(dbData, null, 2));
      
      const [machine] = await db.update(machines)
        .set(dbData)
        .where(eq(machines.id, id))
        .returning();
      
      if (!machine) {
        console.log('⚠️  [STORAGE] Máquina não encontrada para atualização');
        return undefined;
      }
      
      console.log('✅ [STORAGE] Máquina atualizada');
      
      const mappedMachine = mapDbToCamelCase(machine, 'machines');
      return mappedMachine;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao atualizar máquina:', error.message);
      return undefined;
    }
  }

  async deleteMachine(id: string): Promise<boolean> {
    try {
      console.log('🗑️  [STORAGE] Deletando máquina:', id);
      
      const result = await db.delete(machines).where(eq(machines.id, id));
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        console.log('✅ [STORAGE] Máquina deletada');
      } else {
        console.log('⚠️  [STORAGE] Máquina não encontrada para deletar');
      }
      
      return deleted;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao deletar máquina:', error.message);
      return false;
    }
  }

  // ========== SERVICES ==========
  async getService(id: string): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      if (!service) return undefined;
      
      return {
        ...mapDbToCamelCase(service, 'services'),
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviço:', error);
      return undefined;
    }
  }

  async getAllServices(): Promise<Service[]> {
    try {
      const servicesList = await db.select().from(services).orderBy(desc(services.data_agendamento));
      return servicesList.map(service => ({
        ...mapDbToCamelCase(service, 'services'),
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      }));
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
      return servicesList.map(service => ({
        ...mapDbToCamelCase(service, 'services'),
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      }));
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
      return servicesList.map(service => ({
        ...mapDbToCamelCase(service, 'services'),
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      }));
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao buscar serviços por técnico:', error);
      return [];
    }
  }

  async createService(serviceData: InsertService): Promise<Service> {
    try {
      console.log('📝 [STORAGE] Criando serviço com dados:', JSON.stringify(serviceData, null, 2));
      
      // Obter nome do técnico
      const technician = await this.getTechnician(serviceData.tecnico_id);
      const tecnicoNome = technician?.nome || "Desconhecido";
      
      // Processar dados
      const processedData = {
        tipo_servico: serviceData.tipoServico || 'PREVENTIVA',
        maquina_id: serviceData.maquinaId,
        tecnico_id: serviceData.tecnicoId,
        tecnico_nome: tecnicoNome,
        descricao_servico: serviceData.descricaoServico || '',
        descricao_problema: serviceData.descricaoProblema || '',
        data_agendamento: serviceData.dataAgendamento && !isNaN(new Date(serviceData.dataAgendamento).getTime())
          ? new Date(serviceData.dataAgendamento)
          : new Date(),
        data_conclusao: serviceData.dataConclusao 
          ? new Date(serviceData.dataConclusao)
          : undefined,
        prioridade: serviceData.prioridade || 'MEDIA',
        status: serviceData.status || 'AGENDADO',
        custo: serviceData.custo || null,
        observacoes: serviceData.observacoes || ''
      };
      
      console.log('📝 [STORAGE] Dados processados para banco:', JSON.stringify(processedData, null, 2));
      
      const [service] = await db.insert(services).values({
        ...processedData,
        updated_at: new Date()
      }).returning();
      
      // Adicionar ao histórico
      await this.addServiceHistory({
        serviceId: service.id,
        status: service.status || 'AGENDADO',
        observacao: "Serviço criado"
      });
      
      console.log('✅ [STORAGE] Serviço criado com ID:', service.id);
      
      // Retornar no formato correto
      return {
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      };
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar serviço:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  async updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    try {
      const updateData: any = {};
      
      // Mapear campos do frontend para o banco
      if (serviceData.tipoServico !== undefined) updateData.tipo_servico = serviceData.tipoServico;
      if (serviceData.maquinaId !== undefined) updateData.maquina_id = serviceData.maquinaId;
      if (serviceData.tecnicoId !== undefined) {
        updateData.tecnico_id = serviceData.tecnicoId;
        // Buscar nome do técnico se o ID mudou
        const technician = await this.getTechnician(serviceData.tecnicoId);
        updateData.tecnico_nome = technician?.nome || "Desconhecido";
      }
      if (serviceData.descricaoServico !== undefined) updateData.descricao_servico = serviceData.descricaoServico;
      if (serviceData.descricaoProblema !== undefined) updateData.descricao_problema = serviceData.descricaoProblema;
      if (serviceData.dataAgendamento !== undefined) {
        const date = new Date(serviceData.dataAgendamento);
        if (!isNaN(date.getTime())) {
          updateData.data_agendamento = date;
        } else {
          console.warn('⚠️ [STORAGE] Data inválida para serviço:', serviceData.dataAgendamento);
        }
      }
      if (serviceData.dataConclusao !== undefined) {
        updateData.data_conclusao = serviceData.dataConclusao ? new Date(serviceData.dataConclusao) : null;
      }
      if (serviceData.prioridade !== undefined) updateData.prioridade = serviceData.prioridade;
      if (serviceData.status !== undefined) updateData.status = serviceData.status;
      if (serviceData.custo !== undefined) updateData.custo = serviceData.custo;
      if (serviceData.observacoes !== undefined) updateData.observacoes = serviceData.observacoes;
      
      updateData.updated_at = new Date();
      
      console.log('📝 [STORAGE] Atualizando serviço:', id);
      console.log('📝 [STORAGE] Dados de atualização:', JSON.stringify(updateData, null, 2));
      
      const [service] = await db.update(services)
        .set(updateData)
        .where(eq(services.id, id))
        .returning();
      
      if (!service) return undefined;
      
      // Adicionar ao histórico se status mudou
      if (serviceData.status) {
        await this.addServiceHistory({
          serviceId: id,
          status: serviceData.status,
          observacao: "Status atualizado"
        });
      }
      
      console.log('✅ [STORAGE] Serviço atualizado com ID:', service.id);
      
      // Retornar no formato correto
      return {
        id: service.id,
        tipoServico: service.tipo_servico || 'PREVENTIVA',
        maquinaId: service.maquina_id || '',
        tecnicoId: service.tecnico_id || '',
        tecnicoNome: service.tecnico_nome || 'Desconhecido',
        descricaoServico: service.descricao_servico || '',
        descricaoProblema: service.descricao_problema || '',
        dataAgendamento: safeDateToISO(service.data_agendamento),
        dataConclusao: service.data_conclusao 
          ? safeDateToISO(service.data_conclusao)
          : undefined,
        prioridade: service.prioridade || 'MEDIA',
        status: service.status || 'AGENDADO',
        custo: service.custo ? service.custo.toString() : '',
        observacoes: service.observacoes || '',
        createdAt: service.created_at || new Date(),
        updatedAt: service.updated_at || new Date()
      };
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
      // Contar máquinas por status
      const [activeResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'ATIVO'));
      
      const [maintenanceResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'MANUTENCAO'));
      
      const [defectResult] = await db.select({ count: count() })
        .from(machines)
        .where(eq(machines.status, 'DEFEITO'));
      
      // Contar serviços por status
      const [pendingResult] = await db.select({ count: count() })
        .from(services)
        .where(sql`status IN ('AGENDADO', 'PENDENTE', 'EM_ANDAMENTO')`);
      
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