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
  
  // ========== SCHEMAS CUSTOMIZADOS ==========
  const machineRequestSchema = z.object({
    codigo: z.string().min(1, "Código é obrigatório"),
    modelo: z.string().min(1, "Modelo é obrigatório"),
    marca: z.string().min(1, "Marca é obrigatória"),
    tipo: z.enum(['SPLIT', 'WINDOW', 'CASSETE', 'PISO_TETO', 'PORTATIL', 'INVERTER']).optional().default('SPLIT'),
    capacidadeBTU: z.coerce.number().min(1000).optional().default(9000),
    voltagem: z.enum(['V110', 'V220', 'BIVOLT']).optional().default('V220'),
    localizacaoTipo: z.enum(['SALA', 'QUARTO', 'ESCRITORIO', 'SALA_REUNIAO', 'OUTRO']).optional().default('SALA'),
    localizacaoDescricao: z.string().min(1, "Localização é obrigatória"),
    localizacaoAndar: z.coerce.number().optional().default(0),
    filial: z.string().min(1, "Filial é obrigatória"),
    dataInstalacao: z.string().min(1, "Data de instalação é obrigatória"),
    status: z.enum(['ATIVO', 'INATIVO', 'MANUTENCAO', 'DEFEITO']).optional().default('ATIVO'),
    observacoes: z.string().optional()
  });

  const technicianRequestSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    especialidade: z.string().min(1, "Especialidade é obrigatória"),
    telefone: z.string().min(1, "Telefone é obrigatório"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO')
  });

  const serviceRequestSchema = z.object({
    tipoServico: z.enum(['PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'LIMPEZA', 'VISTORIA']),
    maquinaId: z.string().min(1, "Máquina é obrigatória"),
    tecnicoId: z.string().min(1, "Técnico é obrigatório"),
    descricaoServico: z.string().min(1, "Descrição do serviço é obrigatória"),
    descricaoProblema: z.string().optional(),
    dataAgendamento: z.string().min(1, "Data de agendamento é obrigatória"),
    horaAgendamento: z.string().optional(),
    prioridade: z.enum(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']).optional().default('MEDIA'),
    status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'PENDENTE']).optional().default('AGENDADO'),
    observacoes: z.string().optional()
  });

  // ========== MIDDLEWARE ==========
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'neuropsicocentro-dev-secret', (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido' });
      }
      req.user = user;
      next();
    });
  };
  
  // ========== AUTH ROUTES ==========
  
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API Neuropsicocentro funcionando!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  app.post('/api/auth/register', async (req, res) => {
    console.log('🔍 [REGISTER] Iniciando registro...');
    console.log('📥 [REGISTER] Body:', req.body);
    
    try {
      const validatedData = insertUserSchema.parse(req.body);
      console.log('✅ [REGISTER] Dados validados:', { 
        ...validatedData, 
        password: '***' 
      });
      
      const email = validatedData.email || '';
      
      let existingUser = null;
      if (email) {
        existingUser = await storage.getUserByEmail(email);
      }
      
      const existingByUsername = await storage.getUserByUsername(validatedData.username);
      
      if (existingUser) {
        console.log('❌ [REGISTER] Email já existe:', email);
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      
      if (existingByUsername) {
        console.log('❌ [REGISTER] Username já existe:', validatedData.username);
        return res.status(400).json({ error: 'Nome de usuário já existe' });
      }
      
      console.log('🔐 [REGISTER] Gerando hash da senha...');
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const userData = {
        username: validatedData.username,
        email: email,
        password: hashedPassword,
        name: validatedData.name || '',
        phone: validatedData.phone || ''
      };
      
      console.log('👤 [REGISTER] Criando usuário no banco...');
      const user = await storage.createUser(userData);
      console.log('✅ [REGISTER] Usuário criado ID:', user.id);
      
      console.log('🎫 [REGISTER] Gerando token JWT...');
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        process.env.JWT_SECRET || 'neuropsicocentro-dev-secret',
        { expiresIn: '24h' }
      );
      
      console.log('🎉 [REGISTER] Registro concluído com sucesso!');
      
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
      console.error('❌ [REGISTER] Erro detalhado:', error);
      console.error('❌ [REGISTER] Mensagem:', error.message);
      console.error('❌ [REGISTER] Stack:', error.stack);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
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
    console.log('🔍 [LOGIN] Tentativa de login...');
    console.log('📥 [LOGIN] Body:', req.body);
    
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      console.log('🔎 [LOGIN] Buscando usuário por email:', email);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log('❌ [LOGIN] Usuário não encontrado');
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      console.log('🔐 [LOGIN] Verificando senha...');
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        console.log('❌ [LOGIN] Senha incorreta');
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      console.log('🎫 [LOGIN] Gerando token...');
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        process.env.JWT_SECRET || 'neuropsicocentro-dev-secret',
        { expiresIn: '24h' }
      );
      
      console.log('✅ [LOGIN] Login bem-sucedido para:', user.email);
      
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
      console.error('❌ [LOGIN] Erro:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });
  
  // ========== MACHINES ROUTES ==========
  
  app.get('/api/machines', authenticateToken, async (req, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json({ success: true, data: machines });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar máquinas:', error);
      res.status(500).json({ error: 'Erro ao buscar máquinas' });
    }
  });
  
  app.get('/api/machines/:id', authenticateToken, async (req, res) => {
    try {
      const machine = await storage.getMachine(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: 'Máquina não encontrada' });
      }
      res.json({ success: true, data: machine });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar máquina:', error);
      res.status(500).json({ error: 'Erro ao buscar máquina' });
    }
  });
  
  app.post('/api/machines', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Criando nova máquina...');
    console.log('📥 [MACHINES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = machineRequestSchema.parse(req.body);
      
      console.log('✅ [MACHINES] Dados validados:', validatedData);
      
      const existingMachine = await storage.getMachineByCodigo(validatedData.codigo);
      if (existingMachine) {
        return res.status(400).json({ error: 'Já existe uma máquina com este código' });
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
      
      console.log('📝 [MACHINES] Dados para criação:', JSON.stringify(machineData, null, 2));
      
      const machine = await storage.createMachine(machineData);
      
      console.log('✅ [MACHINES] Máquina criada com ID:', machine.id);
      
      res.status(201).json({
        success: true,
        data: machine,
        message: 'Máquina cadastrada com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [MACHINES] Erro ao criar máquina:', error);
      console.error('❌ [MACHINES] Mensagem:', error.message);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar máquina',
        message: error.message
      });
    }
  });
  
  app.put('/api/machines/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Atualizando máquina:', req.params.id);
    console.log('📥 [MACHINES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = machineRequestSchema.partial().parse(req.body);
      
      console.log('✅ [MACHINES] Dados validados para atualização:', validatedData);
      
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
      
      console.log('📝 [MACHINES] Dados para atualização:', JSON.stringify(machineData, null, 2));
      
      const machine = await storage.updateMachine(req.params.id, machineData);
      
      if (!machine) {
        return res.status(404).json({ error: 'Máquina não encontrada' });
      }
      
      console.log('✅ [MACHINES] Máquina atualizada');
      
      res.json({
        success: true,
        data: machine,
        message: 'Máquina atualizada com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [MACHINES] Erro ao atualizar máquina:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ error: 'Erro ao atualizar máquina' });
    }
  });
  
  app.delete('/api/machines/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Deletando máquina:', req.params.id);
    
    try {
      const deleted = await storage.deleteMachine(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Máquina não encontrada' });
      }
      
      console.log('✅ [MACHINES] Máquina deletada');
      
      res.json({
        success: true,
        message: 'Máquina deletada com sucesso'
      });
      
    } catch (error) {
      console.error('❌ [MACHINES] Erro ao deletar máquina:', error);
      res.status(500).json({ error: 'Erro ao deletar máquina' });
    }
  });
  
  // ========== TECHNICIANS ROUTES ==========
  
  app.get('/api/technicians', authenticateToken, async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json({ success: true, data: technicians });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar técnicos:', error);
      res.status(500).json({ error: 'Erro ao buscar técnicos' });
    }
  });
  
  app.get('/api/technicians/:id', authenticateToken, async (req, res) => {
    try {
      const technician = await storage.getTechnician(req.params.id);
      if (!technician) {
        return res.status(404).json({ error: 'Técnico não encontrado' });
      }
      res.json({ success: true, data: technician });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar técnico:', error);
      res.status(500).json({ error: 'Erro ao buscar técnico' });
    }
  });
  
  app.post('/api/technicians', authenticateToken, async (req, res) => {
    console.log('🔍 [TECHNICIANS] Criando novo técnico...');
    console.log('📥 [TECHNICIANS] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = technicianRequestSchema.parse(req.body);
      
      console.log('✅ [TECHNICIANS] Dados validados:', validatedData);
      
      const technicianData = {
        nome: validatedData.nome,
        especialidade: validatedData.especialidade,
        telefone: validatedData.telefone,
        email: validatedData.email || '',
        status: validatedData.status
      };
      
      const technician = await storage.createTechnician(technicianData);
      
      console.log('✅ [TECHNICIANS] Técnico criado com ID:', technician.id);
      
      res.status(201).json({
        success: true,
        data: technician,
        message: 'Técnico cadastrado com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [TECHNICIANS] Erro ao criar técnico:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar técnico',
        message: error.message 
      });
    }
  });
  
  app.put('/api/technicians/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [TECHNICIANS] Atualizando técnico:', req.params.id);
    console.log('📥 [TECHNICIANS] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = technicianRequestSchema.partial().parse(req.body);
      
      console.log('✅ [TECHNICIANS] Dados validados para atualização:', validatedData);
      
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
        return res.status(404).json({ error: 'Técnico não encontrado' });
      }
      
      console.log('✅ [TECHNICIANS] Técnico atualizado');
      
      res.json({
        success: true,
        data: technician,
        message: 'Técnico atualizado com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [TECHNICIANS] Erro ao atualizar técnico:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ error: 'Erro ao atualizar técnico' });
    }
  });
  
  app.delete('/api/technicians/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [TECHNICIANS] Deletando técnico:', req.params.id);
    
    try {
      const deleted = await storage.deleteTechnician(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Técnico não encontrado' });
      }
      
      console.log('✅ [TECHNICIANS] Técnico deletado');
      
      res.json({
        success: true,
        message: 'Técnico deletado com sucesso'
      });
      
    } catch (error) {
      console.error('❌ [TECHNICIANS] Erro ao deletar técnico:', error);
      res.status(500).json({ error: 'Erro ao deletar técnico' });
    }
  });
  
  // ========== SERVICES ROUTES ==========
  
  app.get('/api/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços' });
    }
  });
  
  app.get('/api/services/:id', authenticateToken, async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }
      res.json({ success: true, data: service });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviço:', error);
      res.status(500).json({ error: 'Erro ao buscar serviço' });
    }
  });
  
  app.get('/api/machines/:machineId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByMachine(req.params.machineId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços da máquina:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços da máquina' });
    }
  });
  
  app.get('/api/technicians/:technicianId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByTechnician(req.params.technicianId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços do técnico:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços do técnico' });
    }
  });

  // POST criar novo serviço (VERSÃO CORRIGIDA - ÚNICA)
  app.post('/api/services', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Criando novo serviço...');
    console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = serviceRequestSchema.parse(req.body);
      console.log('✅ [SERVICES] Dados validados:', validatedData);
      
      // CORREÇÃO: Processar data corretamente
      let dataAgendamentoISO: string;
      const horaAgendamento = validatedData.horaAgendamento || '08:00';
      
      try {
        // Primeiro, tentar parsear como data ISO
        const dateFromISO = new Date(validatedData.dataAgendamento);
        
        if (!isNaN(dateFromISO.getTime())) {
          // Se for uma data ISO válida, extrair a data (YYYY-MM-DD)
          const dataStr = dateFromISO.toISOString().split('T')[0];
          // Combinar com a hora
          dataAgendamentoISO = `${dataStr}T${horaAgendamento}:00.000Z`;
          console.log('📅 [SERVICES] Data combinada a partir de ISO:', dataAgendamentoISO);
        } else {
          // Se não for ISO, tratar como data simples (YYYY-MM-DD)
          dataAgendamentoISO = `${validatedData.dataAgendamento}T${horaAgendamento}:00.000Z`;
          console.log('📅 [SERVICES] Data simples combinada com hora:', dataAgendamentoISO);
        }
        
        // Validar se a data é válida
        const finalDate = new Date(dataAgendamentoISO);
        if (isNaN(finalDate.getTime())) {
          throw new Error('Data inválida após processamento');
        }
        
      } catch (error) {
        console.error('❌ [SERVICES] Erro ao processar data:', error);
        // Fallback: usar data atual
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        dataAgendamentoISO = `${todayStr}T${horaAgendamento}:00.000Z`;
        console.log('📅 [SERVICES] Usando fallback (data atual):', dataAgendamentoISO);
      }
      
      console.log('📅 [SERVICES] Data final para armazenamento:', dataAgendamentoISO);
      
      // Preparar dados para o storage
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
      
      console.log('📝 [SERVICES] Dados para criação:', JSON.stringify(serviceData, null, 2));
      
      const service = await storage.createService(serviceData);
      
      console.log('✅ [SERVICES] Serviço criado com ID:', service.id);
      
      res.status(201).json({
        success: true,
        data: service,
        message: 'Serviço agendado com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [SERVICES] Erro ao criar serviço:', error);
      console.error('❌ [SERVICES] Stack:', error.stack);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao criar serviço',
        message: error.message 
      });
    }
  });

  // PUT atualizar serviço (VERSÃO CORRIGIDA - ÚNICA)
  app.put('/api/services/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Atualizando serviço:', req.params.id);
    console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const validatedData = serviceRequestSchema.partial().parse(req.body);
      console.log('✅ [SERVICES] Dados validados para atualização:', validatedData);
      
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
      
      // CORREÇÃO: Processar data_agendamento se fornecida
      if (validatedData.dataAgendamento) {
        const horaAgendamento = validatedData.horaAgendamento || '08:00';
        let dataAgendamentoISO: string;
        
        try {
          const dateFromISO = new Date(validatedData.dataAgendamento);
          
          if (!isNaN(dateFromISO.getTime())) {
            // Se for uma data ISO válida
            const dataStr = dateFromISO.toISOString().split('T')[0];
            dataAgendamentoISO = `${dataStr}T${horaAgendamento}:00.000Z`;
          } else {
            // Se for data simples (YYYY-MM-DD)
            dataAgendamentoISO = `${validatedData.dataAgendamento}T${horaAgendamento}:00.000Z`;
          }
          
          // Validar a data
          const finalDate = new Date(dataAgendamentoISO);
          if (!isNaN(finalDate.getTime())) {
            serviceData.data_agendamento = dataAgendamentoISO;
            console.log('📅 [SERVICES] Data para atualização:', dataAgendamentoISO);
          }
        } catch (error) {
          console.warn('⚠️ [SERVICES] Erro ao processar data para atualização:', error);
        }
      }
      
      // Remover campos undefined
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key] === undefined) {
          delete serviceData[key];
        }
      });
      
      console.log('📝 [SERVICES] Dados para atualização:', JSON.stringify(serviceData, null, 2));
      
      const service = await storage.updateService(req.params.id, serviceData);
      
      if (!service) {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }
      
      console.log('✅ [SERVICES] Serviço atualizado');
      
      res.json({
        success: true,
        data: service,
        message: 'Serviço atualizado com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [SERVICES] Erro ao atualizar serviço:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Erro de validação',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        error: 'Erro ao atualizar serviço',
        message: error.message 
      });
    }
  });
  
  app.delete('/api/services/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Deletando serviço:', req.params.id);
    
    try {
      const deleted = await storage.deleteService(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }
      
      console.log('✅ [SERVICES] Serviço deletado');
      
      res.json({
        success: true,
        message: 'Serviço deletado com sucesso'
      });
      
    } catch (error) {
      console.error('❌ [SERVICES] Erro ao deletar serviço:', error);
      res.status(500).json({ error: 'Erro ao deletar serviço' });
    }
  });
  
  // ========== DASHBOARD ROUTES ==========
  
  app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  });
  
  // ========== SERVICE HISTORY ROUTES ==========
  
  app.get('/api/services/:serviceId/history', authenticateToken, async (req, res) => {
    try {
      const history = await storage.getServiceHistory(req.params.serviceId);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar histórico do serviço:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico do serviço' });
    }
  });
  
  // ========== USER PROFILE ROUTES ==========
  
  app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, data: userWithoutPassword });
      
    } catch (error) {
      console.error('❌ [API] Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  });
  
  // ========== ADDITIONAL ROUTES ==========
  
  app.get('/api/machines/codigo/:codigo', authenticateToken, async (req, res) => {
    try {
      const machine = await storage.getMachineByCodigo(req.params.codigo);
      if (!machine) {
        return res.status(404).json({ error: 'Máquina não encontrada' });
      }
      res.json({ success: true, data: machine });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar máquina por código:', error);
      res.status(500).json({ error: 'Erro ao buscar máquina por código' });
    }
  });
  
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Gestão de Ar Condicionado API',
      version: '1.0.0'
    });
  });

  // ========== ROTAS DE RELATÓRIOS ==========

  app.get('/api/reports/summary', authenticateToken, async (req, res) => {
    try {
      console.log('📊 [REPORTS] Gerando relatório...');
      
      const {
        startDate,
        endDate,
        branchFilter = 'all',
        statusFilter = 'all',
        technicianId,
        machineId,
        serviceType
      } = req.query;
      
      console.log('📋 [REPORTS] Filtros:', {
        startDate,
        endDate,
        branchFilter,
        statusFilter,
        technicianId,
        machineId,
        serviceType
      });
      
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
        const branch = machine?.filial || 'Não especificada';
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
      
      const monthlyData = Object.values(servicesByMonth)
        .sort((a, b) => {
          const [aYear, aMonth] = a.label.split('/');
          const [bYear, bMonth] = b.label.split('/');
          return new Date(parseInt(aYear), aMonth.charCodeAt(0) - 97).getTime() - 
                 new Date(parseInt(bYear), bMonth.charCodeAt(0) - 97).getTime();
        });
      
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
      
      console.log('✅ [REPORTS] Relatório gerado:', {
        totalServices: response.summary.totalServices,
        filtros: response.filters
      });
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error: any) {
      console.error('❌ [REPORTS] Erro ao gerar relatório:', error);
      res.status(500).json({ 
        error: 'Erro ao gerar relatório',
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
        'Tipo de Serviço',
        'Descrição',
        'Data Agendamento',
        'Data Conclusão',
        'Técnico',
        'Status',
        'Prioridade',
        'Custo (R$)',
        'Código da Máquina',
        'Modelo',
        'Filial',
        'Localização',
        'Observações'
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
      console.error('❌ [REPORTS] Erro ao exportar CSV:', error);
      res.status(500).json({ 
        error: 'Erro ao exportar relatório',
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
      console.error('❌ [REPORTS] Erro ao buscar estatísticas em tempo real:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar estatísticas',
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
        return res.status(404).json({ error: 'Máquina não encontrada' });
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
      console.error('❌ [REPORTS] Erro ao buscar histórico da máquina:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar histórico',
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
      console.error('❌ [REPORTS] Erro na análise de custos:', error);
      res.status(500).json({ 
        error: 'Erro na análise de custos',
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
      title: 'Máquinas com Alto Custo de Manutenção',
      description: `Identificadas ${highCostMachines.length} máquinas com custo de manutenção elevado. Considere avaliar substituição ou contrato de manutenção preventiva.`,
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
      title: 'Manutenção Preventiva Pendente',
      description: `${machinesNeedingPreventive.length} máquinas estão há mais de 6 meses sem manutenção preventiva.`,
      details: machinesNeedingPreventive.map(machine => ({
        machine: machine.codigo,
        modelo: machine.modelo,
        localizacao: machine.localizacaoDescricao
      }))
    });
  }
  
  return recommendations;
}