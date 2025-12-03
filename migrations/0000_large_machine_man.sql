CREATE TYPE "public"."location_type" AS ENUM('SALA', 'QUARTO', 'ESCRITORIO', 'SALA_REUNIAO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."machine_status" AS ENUM('ATIVO', 'INATIVO', 'MANUTENCAO', 'DEFEITO');--> statement-breakpoint
CREATE TYPE "public"."machine_type" AS ENUM('SPLIT', 'WINDOW', 'CASSETE', 'PISO_TETO', 'PORTATIL', 'INVERTER');--> statement-breakpoint
CREATE TYPE "public"."machine_voltage" AS ENUM('V110', 'V220', 'BIVOLT');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('URGENTE', 'ALTA', 'MEDIA', 'BAIXA');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA');--> statement-breakpoint
CREATE TYPE "public"."technician_status" AS ENUM('ATIVO', 'INATIVO');--> statement-breakpoint
CREATE TABLE "machines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"modelo" text NOT NULL,
	"marca" text NOT NULL,
	"tipo" "machine_type" NOT NULL,
	"capacidade_btu" integer NOT NULL,
	"voltagem" "machine_voltage" NOT NULL,
	"localizacao_tipo" "location_type" NOT NULL,
	"localizacao_descricao" text NOT NULL,
	"localizacao_andar" integer,
	"filial" text NOT NULL,
	"data_instalacao" timestamp NOT NULL,
	"status" "machine_status" DEFAULT 'ATIVO' NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "machines_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "service_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" varchar NOT NULL,
	"status" "service_status" NOT NULL,
	"observacao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_servico" "service_type" NOT NULL,
	"maquina_id" varchar NOT NULL,
	"data_agendamento" timestamp NOT NULL,
	"tecnico_id" varchar NOT NULL,
	"tecnico_nome" text NOT NULL,
	"descricao_servico" text NOT NULL,
	"descricao_problema" text,
	"prioridade" "priority" DEFAULT 'MEDIA' NOT NULL,
	"status" "service_status" DEFAULT 'AGENDADO' NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"especialidade" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"status" "technician_status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_maquina_id_machines_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tecnico_id_technicians_id_fk" FOREIGN KEY ("tecnico_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE no action;