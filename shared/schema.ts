import { pgTable, text, varchar, integer, timestamp, pgEnum, serial } from "drizzle-orm/pg-core";
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
  modelo: text("modelo").notNull(),
  marca: text("marca").notNull(),
  tipo: machineTypeEnum("tipo").notNull(),
  capacidade_btu: integer("capacidade_btu").notNull(),
  voltagem: machineVoltageEnum("voltagem").notNull(),
  localizacao_tipo: locationTypeEnum("localizacao_tipo").notNull(),
  localizacao_descricao: text("localizacao_descricao").notNull(),
  localizacao_andar: integer("localizacao_andar"),
  filial: text("filial").notNull(),
  data_instalacao: timestamp("data_instalacao").notNull(),
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
  data_agendamento: timestamp("data_agendamento").notNull(),
  tecnico_id: varchar("tecnico_id").notNull()
    .references(() => technicians.id, { onDelete: 'restrict' }),
  tecnico_nome: text("tecnico_nome").notNull(),
  descricao_servico: text("descricao_servico").notNull(),
  descricao_problema: text("descricao_problema"),
  prioridade: priorityEnum("prioridade").default('MEDIA').notNull(),
  status: serviceStatusEnum("status").default('AGENDADO').notNull(),
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

export const insertTechnicianSchema = createInsertSchema(technicians).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  tecnico_nome: true,
  created_at: true,
  updated_at: true,
});

export const insertServiceHistorySchema = createInsertSchema(serviceHistory).omit({
  id: true,
  created_at: true,
});

// ========== TYPES ==========
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

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