import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMachineSchema, insertTechnicianSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const machineRequestSchema = z.object({
    codigo: z.string().min(1, "C?digo ? obrigat?rio"),
    modelo: z.string().min(1, "Modelo ? obrigat?rio"),
    marca: z.string().min(1, "Marca ? obrigat?ria"),
    tipo: z.enum(['SPLIT', 'WINDOW', 'CASSETE', 'PISO_TETO', 'PORTATIL', 'INVERTER']).optional().default('SPLIT'),
    capacidadeBTU: z.coerce.number().min(1000).optional().default(9000),
    voltagem: z.enum(['V110', 'V220', 'BIVOLT']).optional().default('V220'),
    localizacaoTipo: z.enum(['SALA', 'QUARTO', 'ESCRITORIO', 'SALA_REUNIAO', 'OUTRO']).optional().default('SALA'),
    localizacaoDescricao: z.string().min(1, "Localizacao e obrigatoria"),
    localizacaoAndar: z.coerce.number().optional().default(0),
    filial: z.string().min(1, "Filial ? obrigat?ria"),
    dataInstalacao: z.string().min(1, "Data de instalacao e obrigatoria"),
    status: z.enum(['ATIVO', 'INATIVO', 'MANUTENCAO', 'DEFEITO']).optional().default('ATIVO'),
    observacoes: z.string().optional()
  });

  const technicianRequestSchema = z.object({
    nome: z.string().min(1, "Nome ? obrigat?rio"),
    especialidade: z.string().min(1, "Especialidade ? obrigat?ria"),
    telefone: z.string().min(1, "Telefone ? obrigat?rio"),
    email: z.string().email("Email invalido").optional().or(z.literal('')),
    status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO')
  });

  const serviceRequestSchema = z.object({
    tipoServico: z.enum(['PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA']),
    maquinaId: z.string().min(1, "Maquina ? obrigat?ria"),
    tecnicoId: z.string().min(1, "Tecnico ? obrigat?rio"),
    descricaoServico: z.string().min(1, "Descricao do servico e obrigatoria"),
    descricaoProblema: z.string().optional(),
    dataAgendamento: z.string().min(1, "Data de agendamento ? obrigat?ria"),
    horaAgendamento: z.string().optional(),
    prioridade: z.enum(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']).optional().default('MEDIA'),
    status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE']).optional().default('AGENDADO'),
    observacoes: z.string().optional()
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'neuropsicocentro-dev-secret', (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token invalido' });
      }
      req.user = user;
      next();
    });
  };
  
  
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API Neuropsicocentro funcionando!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const email = validatedData.email || '';
      
      let existingUser = null;
      if (email) {
        existingUser = await storage.getUserByEmail(email);
      }
      
      const existingByUsername = await storage.getUserByUsername(validatedData.username);
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }
      
      if (existingByUsername) {
        return res.status(400).json({ error: 'Nome de usuario ja existe' });
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const userData = {
        username: validatedData.username,
        email: email,
        password: hashedPassword,
        name: validatedData.name || '',
        phone: validatedData.phone || ''
      };
      const user = await storage.createUser(userData);
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        process.env.JWT_SECRET || 'neuropsicocentro-dev-secret',
        { expiresIn: '24h' }
      );
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            phone: user.phone
          },
          token
        }
      });
      
    } catch (error: any) {
      console.error('[ERRO] [REGISTER] Erro detalhado:', error);
      console.error('[ERRO] [REGISTER] Mensagem:', error.message);
      console.error('[ERRO] [REGISTER] Stack:', error.stack);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro interno no servidor',
        message: error.message
      });
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha s?o obrigat?rios' });
      }
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: 'Credenciais invalidas' });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais invalidas' });
      }
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        process.env.JWT_SECRET || 'neuropsicocentro-dev-secret',
        { expiresIn: '24h' }
      );
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            phone: user.phone
          },
          token
        }
      });
      
    } catch (error: any) {
      console.error('[ERRO] [LOGIN] Erro:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });
  
  
  app.get('/api/machines', authenticateToken, async (req, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json({ success: true, data: machines });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar maquinas:', error);
      res.status(500).json({ error: 'Erro ao buscar maquinas' });
    }
  });
  
  app.get('/api/machines/:id', authenticateToken, async (req, res) => {
    try {
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: 'Maquina nao encontrada' });
      }
      res.json({ success: true, data: machine });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar maquina:', error);
      res.status(500).json({ error: 'Erro ao buscar maquina' });
    }
  });
  
  app.post('/api/machines', authenticateToken, async (req, res) => {
    try {
      const validatedData = machineRequestSchema.parse(req.body);
      const existingMachine = await storage.getMachineByCodigo(validatedData.codigo);
      if (existingMachine) {
        return res.status(400).json({ error: 'Ja existe uma maquina com este c?digo' });
      }
      
      const machineData = {
        codigo: validatedData.codigo,
        modelo: validatedData.modelo,
        marca: validatedData.marca,
        tipo: validatedData.tipo,
        capacidadeBTU: validatedData.capacidadeBTU,
        voltagem: validatedData.voltagem,
        localizacaoTipo: validatedData.localizacaoTipo,
        localizacaoDescricao: validatedData.localizacaoDescricao,
        localizacaoAndar: validatedData.localizacaoAndar,
        filial: validatedData.filial,
        dataInstalacao: validatedData.dataInstalacao,
        status: validatedData.status,
        observacoes: validatedData.observacoes || ''
      };
      const machine = await storage.createMachine(machineData);
      res.status(201).json({
        success: true,
        data: machine,
        message: 'Maquina cadastrada com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [MACHINES] Erro ao criar maquina:', error);
      console.error('[ERRO] [MACHINES] Mensagem:', error.message);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar maquina',
        message: error.message
      });
    }
  });
  
  app.put('/api/machines/:id', authenticateToken, async (req, res) => {
    try {
      const validatedData = machineRequestSchema.partial().parse(req.body);
      const machineData = {
        codigo: validatedData.codigo,
        modelo: validatedData.modelo,
        marca: validatedData.marca,
        tipo: validatedData.tipo,
        capacidadeBTU: validatedData.capacidadeBTU,
        voltagem: validatedData.voltagem,
        localizacaoTipo: validatedData.localizacaoTipo,
        localizacaoDescricao: validatedData.localizacaoDescricao,
        localizacaoAndar: validatedData.localizacaoAndar,
        filial: validatedData.filial,
        dataInstalacao: validatedData.dataInstalacao,
        status: validatedData.status,
        observacoes: validatedData.observacoes
      };
      
      Object.keys(machineData).forEach(key => {
        if (machineData[key as keyof typeof machineData] === undefined) {
          delete machineData[key as keyof typeof machineData];
        }
      });
      const machine = await storage.updateMachine(req.params.id, machineData);
      
      if (!machine) {
        return res.status(404).json({ error: 'Maquina nao encontrada' });
      }
      res.json({
        success: true,
        data: machine,
        message: 'Maquina atualizada com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [MACHINES] Erro ao atualizar maquina:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ error: 'Erro ao atualizar maquina' });
    }
  });
  
  app.delete('/api/machines/:id', authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteMachine(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Maquina nao encontrada' });
      }
      res.json({
        success: true,
        message: 'Maquina deletada com sucesso'
      });
      
    } catch (error) {
      console.error('[ERRO] [MACHINES] Erro ao deletar maquina:', error);
      res.status(500).json({ error: 'Erro ao deletar maquina' });
    }
  });
  
  
  app.get('/api/technicians', authenticateToken, async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json({ success: true, data: technicians });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar tecnicos:', error);
      res.status(500).json({ error: 'Erro ao buscar tecnicos' });
    }
  });
  
  app.get('/api/technicians/:id', authenticateToken, async (req, res) => {
    try {
      const technician = await storage.getTechnician(req.params.id);
      if (!technician) {
        return res.status(404).json({ error: 'Tecnico nao encontrado' });
      }
      res.json({ success: true, data: technician });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar tecnico:', error);
      res.status(500).json({ error: 'Erro ao buscar tecnico' });
    }
  });
  
  app.post('/api/technicians', authenticateToken, async (req, res) => {
    try {
      const validatedData = technicianRequestSchema.parse(req.body);
      const technicianData = {
        nome: validatedData.nome,
        especialidade: validatedData.especialidade,
        telefone: validatedData.telefone,
        email: validatedData.email || '',
        status: validatedData.status
      };
      
      const technician = await storage.createTechnician(technicianData);
      res.status(201).json({
        success: true,
        data: technician,
        message: 'Tecnico cadastrado com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [TECHNICIANS] Erro ao criar tecnico:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar tecnico',
        message: error.message 
      });
    }
  });
  
  app.put('/api/technicians/:id', authenticateToken, async (req, res) => {
    try {
      const validatedData = technicianRequestSchema.partial().parse(req.body);
      const technicianData = {
        nome: validatedData.nome,
        especialidade: validatedData.especialidade,
        telefone: validatedData.telefone,
        email: validatedData.email,
        status: validatedData.status
      };
      
      Object.keys(technicianData).forEach(key => {
        if (technicianData[key as keyof typeof technicianData] === undefined) {
          delete technicianData[key as keyof typeof technicianData];
        }
      });
      
      const technician = await storage.updateTechnician(req.params.id, technicianData);
      
      if (!technician) {
        return res.status(404).json({ error: 'Tecnico nao encontrado' });
      }
      res.json({
        success: true,
        data: technician,
        message: 'Tecnico atualizado com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [TECHNICIANS] Erro ao atualizar tecnico:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ error: 'Erro ao atualizar tecnico' });
    }
  });
  
  app.delete('/api/technicians/:id', authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteTechnician(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Tecnico nao encontrado' });
      }
      res.json({
        success: true,
        message: 'Tecnico deletado com sucesso'
      });
      
    } catch (error) {
      console.error('[ERRO] [TECHNICIANS] Erro ao deletar tecnico:', error);
      res.status(500).json({ error: 'Erro ao deletar tecnico' });
    }
  });
  
  
  app.get('/api/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar servicos:', error);
      res.status(500).json({ error: 'Erro ao buscar servicos' });
    }
  });
  
  app.get('/api/services/:id', authenticateToken, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Servico nao encontrado' });
      }
      res.json({ success: true, data: service });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar servico:', error);
      res.status(500).json({ error: 'Erro ao buscar servico' });
    }
  });
  
  app.get('/api/machines/:machineId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByMachine(req.params.machineId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar servicos da maquina:', error);
      res.status(500).json({ error: 'Erro ao buscar servicos da maquina' });
    }
  });
  
  app.get('/api/technicians/:technicianId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByTechnician(req.params.technicianId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar servicos do tecnico:', error);
      res.status(500).json({ error: 'Erro ao buscar servicos do tecnico' });
    }
  });

  app.post('/api/services', authenticateToken, async (req, res) => {
    try {
      const validatedData = serviceRequestSchema.parse(req.body);
      let dataAgendamentoISO: string;
      const horaAgendamento = validatedData.horaAgendamento || '08:00';
      
      try {
        const dateFromISO = new Date(validatedData.dataAgendamento);
        
        if (!isNaN(dateFromISO.getTime())) {
          const dateStr = validatedData.dataAgendamento.split('T')[0];
          
          const localDateTime = `${dateStr}T${horaAgendamento}:00`;
          const combinedDate = new Date(localDateTime);
          
          if (!isNaN(combinedDate.getTime())) {
            dataAgendamentoISO = combinedDate.toISOString();
          } else {
            throw new Error('Data combinada invalida');
          }
        } else {
          dataAgendamentoISO = `${validatedData.dataAgendamento}T${horaAgendamento}:00.000Z`;
        }
        
      } catch (error) {
        console.error('[ERRO] [SERVICES] Erro ao processar data:', error);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        dataAgendamentoISO = `${todayStr}T${horaAgendamento}:00.000Z`;
      }
      const serviceData = {
        tipo_servico: validatedData.tipoServico,
        maquina_id: validatedData.maquinaId,
        tecnico_id: validatedData.tecnicoId,
        descricao_servico: validatedData.descricaoServico,
        descricao_problema: validatedData.descricaoProblema || '',
        data_agendamento: dataAgendamentoISO,
        prioridade: validatedData.prioridade || 'MEDIA',
        status: validatedData.status || 'AGENDADO',
        observacoes: validatedData.observacoes || ''
      };
      const service = await storage.createService(serviceData);
      res.status(201).json({
        success: true,
        data: service,
        message: 'Servico agendado com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [SERVICES] Erro ao criar servico:', error);
      console.error('[ERRO] [SERVICES] Stack:', error.stack);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar servico',
        message: error.message 
      });
    }
  });

  app.put('/api/services/:id', authenticateToken, async (req, res) => {
    try {
      const validatedData = serviceRequestSchema.partial().parse(req.body);
      const serviceData: any = {
        tipo_servico: validatedData.tipoServico,
        maquina_id: validatedData.maquinaId,
        tecnico_id: validatedData.tecnicoId,
        descricao_servico: validatedData.descricaoServico,
        descricao_problema: validatedData.descricaoProblema,
        prioridade: validatedData.prioridade,
        status: validatedData.status,
        observacoes: validatedData.observacoes
      };
      
      if (validatedData.dataAgendamento) {
        const horaAgendamento = validatedData.horaAgendamento || '08:00';
        let dataAgendamentoISO: string;
        
        try {
          const dateFromISO = new Date(validatedData.dataAgendamento);
          
          if (!isNaN(dateFromISO.getTime())) {
            const dateStr = validatedData.dataAgendamento.split('T')[0];
            
            const localDateTime = `${dateStr}T${horaAgendamento}:00`;
            const combinedDate = new Date(localDateTime);
            
            if (!isNaN(combinedDate.getTime())) {
              dataAgendamentoISO = combinedDate.toISOString();
            } else {
              dataAgendamentoISO = validatedData.dataAgendamento;
            }
          } else {
            dataAgendamentoISO = `${validatedData.dataAgendamento}T${horaAgendamento}:00.000Z`;
          }
          
          const finalDate = new Date(dataAgendamentoISO);
          if (!isNaN(finalDate.getTime())) {
            serviceData.data_agendamento = dataAgendamentoISO;
          } else {
            console.warn('[AVISO] [SERVICES] Data invalida apos processamento');
          }
        } catch (error) {
          console.warn('[AVISO] [SERVICES] Erro ao processar data para atualizacao:', error);
        }
      }
      
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key] === undefined) {
          delete serviceData[key];
        }
      });
      const service = await storage.updateService(req.params.id, serviceData);
      
      if (!service) {
        return res.status(404).json({ error: 'Servico nao encontrado' });
      }
      res.json({
        success: true,
        data: service,
        message: 'Servico atualizado com sucesso'
      });
      
    } catch (error: any) {
      console.error('[ERRO] [SERVICES] Erro ao atualizar servico:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validacao',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao atualizar servico',
        message: error.message 
      });
    }
  });
  
  app.delete('/api/services/:id', authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteService(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Servico nao encontrado' });
      }
      res.json({
        success: true,
        message: 'Servico deletado com sucesso'
      });
      
    } catch (error) {
      console.error('[ERRO] [SERVICES] Erro ao deletar servico:', error);
      res.status(500).json({ error: 'Erro ao deletar servico' });
    }
  });
  
  
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar estatisticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatisticas' });
    }
  });
  
  
  app.get('/api/services/:serviceId/history', authenticateToken, async (req, res) => {
    try {
      const history = await storage.getServiceHistory(req.params.serviceId);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar historico do servico:', error);
      res.status(500).json({ error: 'Erro ao buscar historico do servico' });
    }
  });
  
  
  app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, data: userWithoutPassword });
      
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  });
  
  
  app.get('/api/machines/codigo/:codigo', authenticateToken, async (req, res) => {
    try {
      const machine = await storage.getMachineByCodigo(req.params.codigo);
      if (!machine) {
        return res.status(404).json({ error: 'Maquina nao encontrada' });
      }
      res.json({ success: true, data: machine });
    } catch (error) {
      console.error('[ERRO] [API] Erro ao buscar maquina por c?digo:', error);
      res.status(500).json({ error: 'Erro ao buscar maquina por c?digo' });
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Gestao de Ar Condicionado API',
      version: '1.0.0'
    });
  });


  app.get('/api/reports/summary', authenticateToken, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        branchFilter = 'all',
        statusFilter = 'all',
        technicianId,
        machineId,
        serviceType
      } = req.query;
      const allServices = await storage.getAllServices();
      const allMachines = await storage.getAllMachines();
      
      let filteredServices = allServices;
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        filteredServices = filteredServices.filter(service => {
          const serviceDate = new Date(service.dataAgendamento);
          return serviceDate >= start && serviceDate <= end;
        });
      }
      
      if (branchFilter && branchFilter !== 'all') {
        filteredServices = filteredServices.filter(service => {
          const machine = allMachines.find(m => m.id === service.maquinaId);
          return machine?.filial === branchFilter;
        });
      }
      
      if (statusFilter && statusFilter !== 'all') {
        filteredServices = filteredServices.filter(service => 
          service.status === statusFilter
        );
      }
      
      if (technicianId) {
        filteredServices = filteredServices.filter(service => 
          service.tecnicoId === technicianId
        );
      }
      
      if (machineId) {
        filteredServices = filteredServices.filter(service => 
          service.maquinaId === machineId
        );
      }
      
      if (serviceType) {
        filteredServices = filteredServices.filter(service => 
          service.tipoServico === serviceType
        );
      }
      
      const servicesByType = filteredServices.reduce((acc, service) => {
        const type = service.tipoServico || 'OUTRO';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const servicesByStatus = filteredServices.reduce((acc, service) => {
        const status = service.status || 'AGENDADO';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const servicesByTechnician = filteredServices.reduce((acc, service) => {
        const tech = service.tecnicoNome || 'Desconhecido';
        acc[tech] = (acc[tech] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const servicesByBranch = filteredServices.reduce((acc, service) => {
        const machine = allMachines.find(m => m.id === service.maquinaId);
        const branch = machine?.filial || 'Nao especificada';
        acc[branch] = (acc[branch] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const totalServices = filteredServices.length;
      const completedServices = filteredServices.filter(s => s.status === 'CONCLUIDO').length;
      const pendingServices = filteredServices.filter(s => 
        s.status === 'AGENDADO' || s.status === 'EM_ANDAMENTO' || s.status === 'PENDENTE'
      ).length;
      const canceledServices = filteredServices.filter(s => s.status === 'CANCELADO').length;
      
      const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
      
      const totalCost = filteredServices.reduce((sum, service) => {
        const cost = parseFloat(service.custo) || 0;
        return sum + cost;
      }, 0);
      
      const avgCostPerService = totalServices > 0 ? totalCost / totalServices : 0;
      
      const topTechnicians = Object.entries(servicesByTechnician)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const servicesByMachine = filteredServices.reduce((acc, service) => {
        const machine = allMachines.find(m => m.id === service.maquinaId);
        const machineName = machine ? `${machine.codigo} - ${machine.modelo}` : 'Desconhecida';
        acc[machineName] = (acc[machineName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topMachines = Object.entries(servicesByMachine)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const servicesByMonth = filteredServices.reduce((acc, service) => {
        const date = new Date(service.dataAgendamento);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            label: monthLabel,
            completed: 0,
            pending: 0,
            total: 0
          };
        }
        
        acc[monthKey].total++;
        if (service.status === 'CONCLUIDO') {
          acc[monthKey].completed++;
        } else if (service.status === 'AGENDADO' || service.status === 'EM_ANDAMENTO' || service.status === 'PENDENTE') {
          acc[monthKey].pending++;
        }
        
        return acc;
      }, {} as Record<string, { label: string; completed: number; pending: number; total: number }>);
      
      const monthlyData = Object.entries(servicesByMonth)
        .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
        .map(([, value]) => value);
      
      const urgentServices = filteredServices.filter(s => 
        s.prioridade === 'URGENTE' || s.prioridade === 'ALTA'
      ).length;
      
      const response = {
        summary: {
          totalServices,
          completedServices,
          pendingServices,
          canceledServices,
          completionRate: parseFloat(completionRate.toFixed(2)),
          totalCost: parseFloat(totalCost.toFixed(2)),
          avgCostPerService: parseFloat(avgCostPerService.toFixed(2)),
          urgentServices
        },
        breakdown: {
          byType: Object.entries(servicesByType).map(([name, count]) => ({ name, count })),
          byStatus: Object.entries(servicesByStatus).map(([name, count]) => ({ name, count })),
          byBranch: Object.entries(servicesByBranch).map(([name, count]) => ({ name, count })),
          monthlyData,
          topTechnicians,
          topMachines
        },
        services: filteredServices.map(service => {
          const machine = allMachines.find(m => m.id === service.maquinaId);
          return {
            id: service.id,
            tipoServico: service.tipoServico,
            descricaoServico: service.descricaoServico,
            dataAgendamento: service.dataAgendamento,
            dataConclusao: service.dataConclusao,
            tecnicoNome: service.tecnicoNome,
            status: service.status,
            prioridade: service.prioridade,
            custo: service.custo,
            machineCodigo: machine?.codigo,
            machineModelo: machine?.modelo,
            machineFilial: machine?.filial,
            machineLocalizacao: machine?.localizacaoDescricao
          };
        }),
        filters: {
          startDate,
          endDate,
          branchFilter,
          statusFilter,
          technicianId,
          machineId,
          serviceType
        }
      };
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      console.error('[ERRO] [REPORTS] Erro ao gerar relat?rio:', error);
      res.status(500).json({ 
        error: 'Erro ao gerar relat?rio',
        message: error.message 
      });
    }
  });

  app.get('/api/reports/export/csv', authenticateToken, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        branchFilter = 'all',
        statusFilter = 'all'
      } = req.query;
      
      const allServices = await storage.getAllServices();
      const allMachines = await storage.getAllMachines();
      
      let filteredServices = allServices;
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        filteredServices = filteredServices.filter(service => {
          const serviceDate = new Date(service.dataAgendamento);
          return serviceDate >= start && serviceDate <= end;
        });
      }
      
      if (branchFilter && branchFilter !== 'all') {
        filteredServices = filteredServices.filter(service => {
          const machine = allMachines.find(m => m.id === service.maquinaId);
          return machine?.filial === branchFilter;
        });
      }
      
      if (statusFilter && statusFilter !== 'all') {
        filteredServices = filteredServices.filter(service => 
          service.status === statusFilter
        );
      }
      
      const csvRows = [];
      
      csvRows.push([
        'ID',
        'Tipo de Servico',
        'Descricao',
        'Data Agendamento',
        'Data Conclus?o',
        'Tecnico',
        'Status',
        'Prioridade',
        'Custo (R$)',
        'C?digo da Maquina',
        'Modelo',
        'Filial',
        'Localizacao',
        'Observacoes'
      ].join(','));
      
      filteredServices.forEach(service => {
        const machine = allMachines.find(m => m.id === service.maquinaId);
        
        const row = [
          service.id,
          `"${service.tipoServico || ''}"`,
          `"${service.descricaoServico || ''}"`,
          new Date(service.dataAgendamento).toISOString(),
          service.dataConclusao ? new Date(service.dataConclusao).toISOString() : '',
          `"${service.tecnicoNome || ''}"`,
          service.status || '',
          service.prioridade || '',
          service.custo || '0',
          `"${machine?.codigo || ''}"`,
          `"${machine?.modelo || ''}"`,
          `"${machine?.filial || ''}"`,
          `"${machine?.localizacaoDescricao || ''}"`,
          `"${service.observacoes || ''}"`
        ].join(',');
        
        csvRows.push(row);
      });
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_servicos_${new Date().toISOString().split('T')[0]}.csv`);
      
      res.send(csvContent);
      
    } catch (error: any) {
      console.error('[ERRO] [REPORTS] Erro ao exportar CSV:', error);
      res.status(500).json({ 
        error: 'Erro ao exportar relat?rio',
        message: error.message 
      });
    }
  });

  app.get('/api/reports/real-time-stats', authenticateToken, async (req, res) => {
    try {
      const allServices = await storage.getAllServices();
      const allMachines = await storage.getAllMachines();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayServices = allServices.filter(service => {
        const serviceDate = new Date(service.dataAgendamento);
        return serviceDate >= today && serviceDate < tomorrow;
      });
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weekServices = allServices.filter(service => {
        const serviceDate = new Date(service.dataAgendamento);
        return serviceDate >= weekAgo;
      });
      
      const problemMachines = allMachines.filter(m => 
        m.status === 'DEFEITO' || m.status === 'MANUTENCAO'
      ).length;
      
      const weekServicesByTech = weekServices.reduce((acc, service) => {
        const tech = service.tecnicoNome || 'Desconhecido';
        acc[tech] = (acc[tech] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topActiveTechs = Object.entries(weekServicesByTech)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      const response = {
        today: {
          total: todayServices.length,
          completed: todayServices.filter(s => s.status === 'CONCLUIDO').length,
          pending: todayServices.filter(s => s.status === 'AGENDADO' || s.status === 'EM_ANDAMENTO').length
        },
        week: {
          total: weekServices.length,
          completed: weekServices.filter(s => s.status === 'CONCLUIDO').length,
          completionRate: weekServices.length > 0 ? 
            (weekServices.filter(s => s.status === 'CONCLUIDO').length / weekServices.length) * 100 : 0
        },
        machines: {
          total: allMachines.length,
          active: allMachines.filter(m => m.status === 'ATIVO').length,
          problems: problemMachines
        },
        technicians: {
          total: (await storage.getAllTechnicians()).length,
          active: topActiveTechs.length,
          topActive: topActiveTechs
        },
        alerts: {
          urgentServices: allServices.filter(s => s.prioridade === 'URGENTE' && s.status !== 'CONCLUIDO').length,
          overdueServices: allServices.filter(s => {
            const serviceDate = new Date(s.dataAgendamento);
            return serviceDate < new Date() && s.status === 'AGENDADO';
          }).length
        }
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      console.error('[ERRO] [REPORTS] Erro ao buscar estatisticas em tempo real:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar estatisticas',
        message: error.message 
      });
    }
  });

  app.get('/api/reports/machine-history/:machineId', authenticateToken, async (req, res) => {
    try {
      const { machineId } = req.params;
      
      const services = await storage.getServicesByMachine(machineId);
      const machine = await storage.getMachine(machineId);
      
      if (!machine) {
        return res.status(404).json({ error: 'Maquina nao encontrada' });
      }
      
      const totalServices = services.length;
      const completedServices = services.filter(s => s.status === 'CONCLUIDO').length;
      const maintenanceCost = services.reduce((sum, service) => {
        const cost = parseFloat(service.custo) || 0;
        return sum + cost;
      }, 0);
      
      const problemServices = services.filter(s => 
        s.tipoServico === 'CORRETIVA' || s.descricaoProblema
      );
      
      const lastPreventive = services
        .filter(s => s.tipoServico === 'PREVENTIVA' && s.status === 'CONCLUIDO')
        .sort((a, b) => new Date(b.dataConclusao || b.dataAgendamento).getTime() - 
                       new Date(a.dataConclusao || a.dataAgendamento).getTime())[0];
      
      let nextPreventiveDate = null;
      if (lastPreventive) {
        const lastDate = new Date(lastPreventive.dataConclusao || lastPreventive.dataAgendamento);
        nextPreventiveDate = new Date(lastDate);
        nextPreventiveDate.setMonth(nextPreventiveDate.getMonth() + 3);
      }
      
      const response = {
        machine: {
          id: machine.id,
          codigo: machine.codigo,
          modelo: machine.modelo,
          marca: machine.marca,
          status: machine.status,
          localizacao: machine.localizacaoDescricao,
          filial: machine.filial,
          instalacao: machine.dataInstalacao
        },
        stats: {
          totalServices,
          completedServices,
          completionRate: totalServices > 0 ? (completedServices / totalServices) * 100 : 0,
          totalCost: maintenanceCost,
          avgCostPerService: totalServices > 0 ? maintenanceCost / totalServices : 0,
          problemCount: problemServices.length
        },
        preventiveMaintenance: {
          last: lastPreventive ? {
            date: lastPreventive.dataConclusao || lastPreventive.dataAgendamento,
            technician: lastPreventive.tecnicoNome
          } : null,
          nextSuggested: nextPreventiveDate ? nextPreventiveDate.toISOString() : null
        },
        services: services.map(service => ({
          id: service.id,
          tipoServico: service.tipoServico,
          descricaoServico: service.descricaoServico,
          descricaoProblema: service.descricaoProblema,
          dataAgendamento: service.dataAgendamento,
          dataConclusao: service.dataConclusao,
          tecnicoNome: service.tecnicoNome,
          status: service.status,
          prioridade: service.prioridade,
          custo: service.custo,
          observacoes: service.observacoes
        }))
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      console.error('[ERRO] [REPORTS] Erro ao buscar historico da maquina:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar historico',
        message: error.message 
      });
    }
  });

  app.get('/api/reports/cost-analysis', authenticateToken, async (req, res) => {
    try {
      const { 
        startDate,
        endDate,
        branchFilter = 'all',
        groupBy = 'month'
      } = req.query;
      
      const allServices = await storage.getAllServices();
      const allMachines = await storage.getAllMachines();
      const allTechnicians = await storage.getAllTechnicians();
      
      let filteredServices = allServices;
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        filteredServices = filteredServices.filter(service => {
          const serviceDate = new Date(service.dataAgendamento);
          return serviceDate >= start && serviceDate <= end;
        });
      }
      
      if (branchFilter && branchFilter !== 'all') {
        filteredServices = filteredServices.filter(service => {
          const machine = allMachines.find(m => m.id === service.maquinaId);
          return machine?.filial === branchFilter;
        });
      }
      
      let costAnalysis = {};
      
      if (groupBy === 'month') {
        costAnalysis = filteredServices.reduce((acc, service) => {
          const date = new Date(service.dataAgendamento);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          
          const cost = parseFloat(service.custo) || 0;
          
          if (!acc[monthKey]) {
            acc[monthKey] = {
              label: monthLabel,
              totalCost: 0,
              serviceCount: 0,
              avgCost: 0,
              breakdown: {}
            };
          }
          
          acc[monthKey].totalCost += cost;
          acc[monthKey].serviceCount++;
          acc[monthKey].avgCost = acc[monthKey].totalCost / acc[monthKey].serviceCount;
          
          const serviceType = service.tipoServico;
          if (!acc[monthKey].breakdown[serviceType]) {
            acc[monthKey].breakdown[serviceType] = {
              cost: 0,
              count: 0
            };
          }
          acc[monthKey].breakdown[serviceType].cost += cost;
          acc[monthKey].breakdown[serviceType].count++;
          
          return acc;
        }, {} as Record<string, any>);
      }
      
      const totalCost = filteredServices.reduce((sum, service) => {
        return sum + (parseFloat(service.custo) || 0);
      }, 0);
      
      const avgCostPerService = filteredServices.length > 0 ? totalCost / filteredServices.length : 0;
      
      const expensiveServices = filteredServices
        .map(service => ({
          id: service.id,
          descricao: service.descricaoServico,
          tipo: service.tipoServico,
          tecnico: service.tecnicoNome,
          data: service.dataAgendamento,
          custo: parseFloat(service.custo) || 0
        }))
        .sort((a, b) => b.custo - a.custo)
        .slice(0, 10);
      
      const costByTechnician = filteredServices.reduce((acc, service) => {
        const techName = service.tecnicoNome;
        const cost = parseFloat(service.custo) || 0;
        
        if (!acc[techName]) {
          acc[techName] = {
            totalCost: 0,
            serviceCount: 0
          };
        }
        
        acc[techName].totalCost += cost;
        acc[techName].serviceCount++;
        
        return acc;
      }, {} as Record<string, any>);
      
      const response = {
        summary: {
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalServices: filteredServices.length,
          avgCostPerService: parseFloat(avgCostPerService.toFixed(2)),
          period: {
            start: startDate,
            end: endDate
          }
        },
        costAnalysis: Object.values(costAnalysis),
        breakdown: {
          byType: filteredServices.reduce((acc, service) => {
            const type = service.tipoServico;
            const cost = parseFloat(service.custo) || 0;
            
            if (!acc[type]) {
              acc[type] = {
                totalCost: 0,
                serviceCount: 0
              };
            }
            
            acc[type].totalCost += cost;
            acc[type].serviceCount++;
            
            return acc;
          }, {} as Record<string, any>),
          byTechnician: costByTechnician
        },
        expensiveServices,
        recommendations: generateCostRecommendations(filteredServices, allMachines)
      };
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      console.error('[ERRO] [REPORTS] Erro na analise de custos:', error);
      res.status(500).json({ 
        error: 'Erro na analise de custos',
        message: error.message 
      });
    }
  });
  
  return httpServer;
}

function generateCostRecommendations(services: any[], machines: any[]) {
  const recommendations = [];
  
  const costByMachine = services.reduce((acc, service) => {
    const machine = machines.find(m => m.id === service.maquinaId);
    if (!machine) return acc;
    
    const machineKey = machine.codigo;
    const cost = parseFloat(service.custo) || 0;
    
    if (!acc[machineKey]) {
      acc[machineKey] = {
        machine,
        totalCost: 0,
        serviceCount: 0,
        lastServiceDate: null
      };
    }
    
    acc[machineKey].totalCost += cost;
    acc[machineKey].serviceCount++;
    
    const serviceDate = new Date(service.dataAgendamento);
    if (!acc[machineKey].lastServiceDate || serviceDate > acc[machineKey].lastServiceDate) {
      acc[machineKey].lastServiceDate = serviceDate;
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  const highCostMachines = Object.values(costByMachine)
    .filter((item: any) => item.totalCost > 1000)
    .sort((a: any, b: any) => b.totalCost - a.totalCost);
  
  if (highCostMachines.length > 0) {
    recommendations.push({
      type: 'HIGH_COST_MACHINE',
      title: 'Maquinas com Alto Custo de Manutencao',
      description: `Identificadas ${highCostMachines.length} maquinas com custo de manutencao elevado. Considere avaliar substituicao ou contrato de manutencao preventiva.`,
      details: highCostMachines.map((item: any) => ({
        machine: item.machine.codigo,
        totalCost: item.totalCost.toFixed(2),
        serviceCount: item.serviceCount,
        avgCost: (item.totalCost / item.serviceCount).toFixed(2)
      }))
    });
  }
  
  const machinesNeedingPreventive = machines.filter(machine => {
    const lastPreventive = services
      .filter(s => s.maquinaId === machine.id && s.tipoServico === 'PREVENTIVA')
      .sort((a, b) => new Date(b.dataAgendamento).getTime() - new Date(a.dataAgendamento).getTime())[0];
    
    if (!lastPreventive) return true;
    
    const lastDate = new Date(lastPreventive.dataAgendamento);
    const monthsSince = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsSince > 6;
  });
  
  if (machinesNeedingPreventive.length > 0) {
    recommendations.push({
      type: 'PREVENTIVE_MAINTENANCE',
      title: 'Manutencao Preventiva Pendente',
      description: `${machinesNeedingPreventive.length} maquinas estao ha mais de 6 meses sem manutencao preventiva.`,
      details: machinesNeedingPreventive.map(machine => ({
        machine: machine.codigo,
        modelo: machine.modelo,
        localizacao: machine.localizacaoDescricao
      }))
    });
  }
  
  return recommendations;
}


