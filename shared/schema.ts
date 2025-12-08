import { pgTable, text, varchar, integer, timestamp, pgEnum, serial, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ========== ENUMS ==========
export const machineTypeEnum = pgEnum("machine_type", [
  'SPLIT', 'WINDOW', 'CASSETE', 'PISO_TETO', 'PORTATIL', 'INVERTER'
]);

export const machineVoltageEnum = pgEnum("machine_voltage", [
  'V110', 'V220', 'BIVOLT'
]);

export const locationTypeEnum = pgEnum("location_type", [
  'SALA', 'QUARTO', 'ESCRITORIO', 'SALA_REUNIAO', 'OUTRO'
]);

export const machineStatusEnum = pgEnum("machine_status", [
  'ATIVO', 'INATIVO', 'MANUTENCAO', 'DEFEITO'
]);

export const serviceTypeEnum = pgEnum("service_type", [
  'PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA'
]);

export const serviceStatusEnum = pgEnum("service_status", [
  'AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE'
]);

export const priorityEnum = pgEnum("priority", [
  'URGENTE', 'ALTA', 'MEDIA', 'BAIXA'
]);

export const technicianStatusEnum = pgEnum("technician_status", [
  'ATIVO', 'INATIVO'
]);

// ========== TABLES ==========
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  role: text("role").default('technician'),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  especialidade: text("especialidade").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  status: technicianStatusEnum("status").default('ATIVO').notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").notNull().unique(),
  model: text("model").notNull(),
  brand: text("brand").notNull(),
  type: machineTypeEnum("type").notNull(),
  capacity: integer("capacity").notNull(),
  voltage: machineVoltageEnum("voltage").notNull(),
  locationType: locationTypeEnum("location_type").notNull(),
  location: text("location").notNull(),
  locationFloor: integer("location_floor"),
  branch: text("branch").notNull(),
  installationDate: timestamp("installation_date").notNull(),
  status: machineStatusEnum("status").default('ATIVO').notNull(),
  observacoes: text("observacoes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipo_servico: serviceTypeEnum("tipo_servico").notNull(),
  maquina_id: varchar("maquina_id").notNull()
    .references(() => machines.id, { onDelete: 'cascade' }),
  tecnico_id: varchar("tecnico_id").notNull()
    .references(() => technicians.id, { onDelete: 'restrict' }),
  tecnico_nome: text("tecnico_nome").notNull(),
  descricao_servico: text("descricao_servico").notNull(),
  descricao_problema: text("descricao_problema"),
  data_agendamento: timestamp("data_agendamento").notNull(),
  data_conclusao: timestamp("data_conclusao"),
  prioridade: priorityEnum("prioridade").default('MEDIA').notNull(),
  status: serviceStatusEnum("status").default('AGENDADO').notNull(),
  custo: numeric("custo", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceHistory = pgTable("service_history", {
  id: serial("id").primaryKey(),
  service_id: varchar("service_id").notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  status: serviceStatusEnum("status").notNull(),
  observacao: text("observacao"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: varchar("created_by")
    .references(() => users.id),
});

// ========== ZOD SCHEMAS ==========
export const insertUserSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  name: z.string().optional(),
  phone: z.string().optional(),
});

// Schema para máquinas que corresponde ao frontend
export const insertMachineSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  marca: z.string().min(1, "Marca é obrigatória"),
  tipo: z.enum(['SPLIT', 'WINDOW', 'CASSETE', 'PISO_TETO', 'PORTATIL', 'INVERTER']),
  capacidadeBTU: z.coerce.number().min(1000, "Capacidade inválida"),
  voltagem: z.enum(['V110', 'V220', 'BIVOLT']),
  localizacaoTipo: z.enum(['SALA', 'QUARTO', 'ESCRITORIO', 'SALA_REUNIAO', 'OUTRO']),
  localizacaoDescricao: z.string().min(1, "Localização é obrigatória"),
  localizacaoAndar: z.coerce.number().optional(),
  filial: z.string().min(1, "Filial é obrigatória"),
  dataInstalacao: z.string().min(1, "Data de instalação é obrigatória"),
  status: z.enum(['ATIVO', 'INATIVO', 'MANUTENCAO', 'DEFEITO']),
  observacoes: z.string().optional(),
});

export const insertTechnicianSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO')
});

export const insertServiceSchema = z.object({
  tipoServico: z.enum(['PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA']),
  maquinaId: z.string().min(1, "Máquina é obrigatória"),
  tecnicoId: z.string().min(1, "Técnico é obrigatório"),
  descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória"),
  descricaoProblema: z.string().optional(),
  dataAgendamento: z.string().or(z.date()),
  dataConclusao: z.string().or(z.date()).optional(),
  prioridade: z.enum(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']).optional(),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE']).optional(),
  custo: z.string().optional(),
  observacoes: z.string().optional(),
});

export const insertServiceHistorySchema = createInsertSchema(serviceHistory).omit({
  id: true,
  created_at: true,
});

// ========== TYPES ==========
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect & {
  password?: string; // Para compatibilidade com o frontend
};

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect & {
  email?: string;
};

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = {
  id: string;
  codigo: string;
  modelo: string;
  marca: string;
  tipo: 'SPLIT' | 'WINDOW' | 'CASSETE' | 'PISO_TETO' | 'PORTATIL' | 'INVERTER';
  capacidadeBTU: number;
  voltagem: 'V110' | 'V220' | 'BIVOLT';
  localizacaoTipo: 'SALA' | 'QUARTO' | 'ESCRITORIO' | 'SALA_REUNIAO' | 'OUTRO';
  localizacaoDescricao: string;
  localizacaoAndar?: number;
  filial: string;
  dataInstalacao: string;
  status: 'ATIVO' | 'INATIVO' | 'MANUTENCAO' | 'DEFEITO';
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect & {
  tipoServico?: string;
  maquinaId?: string;
  tecnicoId?: string;
  tecnicoNome?: string;
  descricaoServico?: string;
  descricaoProblema?: string;
  dataAgendamento?: string;
  dataConclusao?: string;
  custo?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;
export type ServiceHistory = typeof serviceHistory.$inferSelect;

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

// Tipos para o frontend
export type MachineType = 'SPLIT' | 'WINDOW' | 'CASSETE' | 'PISO_TETO' | 'PORTATIL' | 'INVERTER';
export type LocationType = 'SALA' | 'QUARTO' | 'ESCRITORIO' | 'SALA_REUNIAO' | 'OUTRO';
export type MachineStatus = 'ATIVO' | 'INATIVO' | 'MANUTENCAO' | 'DEFEITO';
export type ServiceType = 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'LIMPEZA' | 'VISTORIA';
export type ServiceStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'PENDENTE';
export type Priority = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA';