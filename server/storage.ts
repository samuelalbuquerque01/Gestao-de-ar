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

// Função auxiliar para converter strings em objetos Date
function parseDateFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const result = { ...data };
  
  // Campos que podem ser datas
  const dateFields = ['dataInstalacao', 'dataAgendamento', 'createdAt', 'updatedAt'];
  
  dateFields.forEach(field => {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        if (typeof result[field] === 'string') {
          // Tenta converter string para Date
          const date = new Date(result[field]);
          if (!isNaN(date.getTime())) {
            result[field] = date;
          } else {
            console.warn(`⚠️ [STORAGE] Não foi possível converter ${field}: "${result[field]}" para Date`);
          }
        }
        // Se já é Date, mantém como está
      } catch (error) {
        console.error(`❌ [STORAGE] Erro ao converter ${field}:`, error);
      }
    }
  });
  
  return result;
}

export class DatabaseStorage implements IStorage {
  // ========== USERS ==========
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log('🔍 [STORAGE] Buscando usuário por ID:', id);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
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
      return user;
      
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
      return user;
      
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
      
      const parsedData = parseDateFields(userData);
      
      const [user] = await db.insert(users)
        .values({
          ...parsedData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log('✅ [STORAGE] Usuário criado com ID:', user.id);
      return user;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar usuário:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  // ========== TECHNICIANS ==========
  async getTechnician(id: string): Promise<Technician | undefined> {
    const [tech] = await db.select().from(technicians).where(eq(technicians.id, id));
    return tech;
  }

  async getAllTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians).orderBy(technicians.nome);
  }

  async createTechnician(technicianData: InsertTechnician): Promise<Technician> {
    const parsedData = parseDateFields(technicianData);
    
    const [tech] = await db.insert(technicians).values({
      ...parsedData,
      updatedAt: new Date()
    }).returning();
    return tech;
  }

  async updateTechnician(id: string, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const parsedData = parseDateFields(technicianData);
    
    const [tech] = await db.update(technicians)
      .set({
        ...parsedData,
        updatedAt: new Date()
      })
      .where(eq(technicians.id, id))
      .returning();
    return tech;
  }

  async deleteTechnician(id: string): Promise<boolean> {
    const result = await db.delete(technicians).where(eq(technicians.id, id));
    return result.rowCount > 0;
  }

  // ========== MACHINES ==========
  async getMachine(id: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine;
  }

  async getMachineByCodigo(codigo: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.codigo, codigo));
    return machine;
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines).orderBy(machines.codigo);
  }

  async createMachine(machineData: InsertMachine): Promise<Machine> {
    const parsedData = parseDateFields(machineData);
    
    console.log('📝 [STORAGE] Dados da máquina (após parse):', {
      ...parsedData,
      dataInstalacao: parsedData.dataInstalacao instanceof Date 
        ? parsedData.dataInstalacao.toISOString() 
        : parsedData.dataInstalacao
    });
    
    try {
      const [machine] = await db.insert(machines).values({
        ...parsedData,
        updatedAt: new Date()
      }).returning();
      
      console.log('✅ [STORAGE] Máquina criada com ID:', machine.id);
      return machine;
    } catch (error: any) {
      console.error('❌ [STORAGE] Erro ao criar máquina:', error.message);
      console.error('❌ [STORAGE] Stack:', error.stack);
      throw error;
    }
  }

  async updateMachine(id: string, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    const parsedData = parseDateFields(machineData);
    
    const [machine] = await db.update(machines)
      .set({
        ...parsedData,
        updatedAt: new Date()
      })
      .where(eq(machines.id, id))
      .returning();
    return machine;
  }

  async deleteMachine(id: string): Promise<boolean> {
    const result = await db.delete(machines).where(eq(machines.id, id));
    return result.rowCount > 0;
  }

  // ========== SERVICES ==========
  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(desc(services.dataAgendamento));
  }

  async getServicesByMachine(machineId: string): Promise<Service[]> {
    return await db.select()
      .from(services)
      .where(eq(services.maquinaId, machineId))
      .orderBy(desc(services.dataAgendamento));
  }

  async getServicesByTechnician(technicianId: string): Promise<Service[]> {
    return await db.select()
      .from(services)
      .where(eq(services.tecnicoId, technicianId))
      .orderBy(desc(services.dataAgendamento));
  }

  async createService(serviceData: InsertService): Promise<Service> {
    const parsedData = parseDateFields(serviceData);
    
    console.log('📝 [STORAGE] Dados do serviço (após parse):', {
      ...parsedData,
      dataAgendamento: parsedData.dataAgendamento instanceof Date 
        ? parsedData.dataAgendamento.toISOString() 
        : parsedData.dataAgendamento
    });
    
    // Get technician name for denormalization
    const technician = await this.getTechnician(parsedData.tecnicoId);
    const tecnicoNome = technician?.nome || "Desconhecido";

    const [service] = await db.insert(services).values({
      ...parsedData,
      tecnicoNome,
      updatedAt: new Date()
    }).returning();
    
    // Add to history
    await this.addServiceHistory({
      serviceId: service.id,
      status: service.status,
      observacao: "Serviço criado"
    });
    
    console.log('✅ [STORAGE] Serviço criado com ID:', service.id);
    return service;
  }

  async updateService(id: string, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const parsedData = parseDateFields(serviceData);
    
    // If technician is being updated, get new name
    if (parsedData.tecnicoId) {
      const technician = await this.getTechnician(parsedData.tecnicoId);
      parsedData.tecnicoNome = technician?.nome || "Desconhecido";
    }

    const [service] = await db.update(services)
      .set({
        ...parsedData,
        updatedAt: new Date()
      })
      .where(eq(services.id, id))
      .returning();
    
    if (service && parsedData.status) {
      await this.addServiceHistory({
        serviceId: id,
        status: parsedData.status,
        observacao: "Status atualizado"
      });
    }
    
    return service;
  }

  async deleteService(id: string): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return result.rowCount > 0;
  }

  // ========== SERVICE HISTORY ==========
  async addServiceHistory(historyData: InsertServiceHistory): Promise<ServiceHistory> {
    const parsedData = parseDateFields(historyData);
    
    const [history] = await db.insert(serviceHistory).values(parsedData).returning();
    return history;
  }

  async getServiceHistory(serviceId: string): Promise<ServiceHistory[]> {
    return await db.select()
      .from(serviceHistory)
      .where(eq(serviceHistory.serviceId, serviceId))
      .orderBy(desc(serviceHistory.createdAt));
  }

  // ========== DASHBOARD STATS ==========
  async getDashboardStats(): Promise<{
    activeMachines: number;
    maintenanceMachines: number;
    defectMachines: number;
    pendingServices: number;
    completedServices: number;
  }> {
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
  }
}

export const storage = new DatabaseStorage();