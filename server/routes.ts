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
  // Schema customizado para máquinas (português para frontend)
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

  // Schema customizado para técnicos
  const technicianRequestSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    especialidade: z.string().min(1, "Especialidade é obrigatória"),
    telefone: z.string().min(1, "Telefone é obrigatório"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO')
  });

  // Schema customizado para serviços
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
  
  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API Neuropsicocentro funcionando!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // Rota de registro
  app.post('/api/auth/register', async (req, res) => {
    console.log('🔍 [REGISTER] Iniciando registro...');
    console.log('📥 [REGISTER] Body:', req.body);
    
    try {
      // Valida dados
      const validatedData = insertUserSchema.parse(req.body);
      console.log('✅ [REGISTER] Dados validados:', { 
        ...validatedData, 
        password: '***' 
      });
      
      // Garante que email seja string vazia se não fornecido
      const email = validatedData.email || '';
      
      // Verifica se usuário já existe
      let existingUser = null;
      if (email) {
        existingUser = await storage.getUserByEmail(email);
      }
      
      // Também verifica por username
      const existingByUsername = await storage.getUserByUsername(validatedData.username);
      
      if (existingUser) {
        console.log('❌ [REGISTER] Email já existe:', email);
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      
      if (existingByUsername) {
        console.log('❌ [REGISTER] Username já existe:', validatedData.username);
        return res.status(400).json({ error: 'Nome de usuário já existe' });
      }
      
      // Hash da senha
      console.log('🔐 [REGISTER] Gerando hash da senha...');
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Prepara dados para criação
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
      
      // Gera token JWT
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
  
  // Rota de login
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
  
  // ========== MACHINES ROUTES (CRUD COMPLETO) ==========
  
  // GET todas as máquinas
  app.get('/api/machines', authenticateToken, async (req, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json({ success: true, data: machines });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar máquinas:', error);
      res.status(500).json({ error: 'Erro ao buscar máquinas' });
    }
  });
  
  // GET uma máquina específica
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
  
  // POST criar nova máquina (CORRIGIDO)
  app.post('/api/machines', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Criando nova máquina...');
    console.log('📥 [MACHINES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Valida com o schema customizado (português)
      const validatedData = machineRequestSchema.parse(req.body);
      
      console.log('✅ [MACHINES] Dados validados:', validatedData);
      
      // Verifica se código já existe
      const existingMachine = await storage.getMachineByCodigo(validatedData.codigo);
      if (existingMachine) {
        return res.status(400).json({ error: 'Já existe uma máquina com este código' });
      }
      
      // Converter para o formato do storage (que espera nomes em português)
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
      
      // Cria a máquina
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
  
  // PUT atualizar máquina (CORRIGIDO)
  app.put('/api/machines/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Atualizando máquina:', req.params.id);
    console.log('📥 [MACHINES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Valida com schema parcial (todos os campos opcionais)
      const validatedData = machineRequestSchema.partial().parse(req.body);
      
      console.log('✅ [MACHINES] Dados validados para atualização:', validatedData);
      
      // Converter para o formato do storage
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
      
      // Remover campos undefined
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
  
  // DELETE máquina
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
  
  // ========== TECHNICIANS ROUTES (CRUD COMPLETO) ==========
  
  // GET todos os técnicos
  app.get('/api/technicians', authenticateToken, async (req, res) => {
    try {
      const technicians = await storage.getAllTechnicians();
      res.json({ success: true, data: technicians });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar técnicos:', error);
      res.status(500).json({ error: 'Erro ao buscar técnicos' });
    }
  });
  
  // GET um técnico específico
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
  
  // POST criar novo técnico (CORRIGIDO)
  app.post('/api/technicians', authenticateToken, async (req, res) => {
    console.log('🔍 [TECHNICIANS] Criando novo técnico...');
    console.log('📥 [TECHNICIANS] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Valida com schema customizado
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
  
  // PUT atualizar técnico (CORRIGIDO)
  app.put('/api/technicians/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [TECHNICIANS] Atualizando técnico:', req.params.id);
    console.log('📥 [TECHNICIANS] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Valida com schema parcial
      const validatedData = technicianRequestSchema.partial().parse(req.body);
      
      console.log('✅ [TECHNICIANS] Dados validados para atualização:', validatedData);
      
      const technicianData = {
        nome: validatedData.nome,
        especialidade: validatedData.especialidade,
        telefone: validatedData.telefone,
        email: validatedData.email,
        status: validatedData.status
      };
      
      // Remover campos undefined
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
  
  // DELETE técnico
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
  
  // ========== SERVICES ROUTES (CRUD COMPLETO) ==========
  
  // GET todos os serviços (CORRIGIDO)
  app.get('/api/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços' });
    }
  });
  
  // GET um serviço específico
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
  
  // GET serviços por máquina (CORRIGIDO)
  app.get('/api/machines/:machineId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByMachine(req.params.machineId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços da máquina:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços da máquina' });
    }
  });
  
  // GET serviços por técnico (CORRIGIDO)
  app.get('/api/technicians/:technicianId/services', authenticateToken, async (req, res) => {
    try {
      const services = await storage.getServicesByTechnician(req.params.technicianId);
      res.json({ success: true, data: services });
    } catch (error) {
      console.error('❌ [API] Erro ao buscar serviços do técnico:', error);
      res.status(500).json({ error: 'Erro ao buscar serviços do técnico' });
    }
  });
  
  // Na rota POST /api/services (substitua completamente):

// POST criar novo serviço (CORRIGIDO)
app.post('/api/services', authenticateToken, async (req, res) => {
  console.log('🔍 [SERVICES] Criando novo serviço...');
  console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
  
  try {
    // Valida com schema customizado
    const validatedData = serviceRequestSchema.parse(req.body);
    
    console.log('✅ [SERVICES] Dados validados:', validatedData);
    
    // Combinar data e hora (remover Z se existir)
    const dateStr = validatedData.dataAgendamento.replace('Z', '');
    const timeStr = validatedData.horaAgendamento || '08:00';
    const dataAgendamento = `${dateStr}T${timeStr}:00`;
    
    console.log('📅 [SERVICES] Data agendamento combinada:', dataAgendamento);
    
    // Preparar dados
    const serviceData = {
      tipoServico: validatedData.tipoServico,
      maquinaId: validatedData.maquinaId,
      tecnicoId: validatedData.tecnicoId,
      descricaoServico: validatedData.descricaoServico,
      descricaoProblema: validatedData.descricaoProblema || '',
      dataAgendamento: dataAgendamento,
      prioridade: validatedData.prioridade,
      status: validatedData.status,
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

// Na rota PUT /api/services (substitua completamente):

// PUT atualizar serviço (CORRIGIDO)
app.put('/api/services/:id', authenticateToken, async (req, res) => {
  console.log('🔍 [SERVICES] Atualizando serviço:', req.params.id);
  console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
  
  try {
    // Valida com schema parcial
    const validatedData = serviceRequestSchema.partial().parse(req.body);
    
    console.log('✅ [SERVICES] Dados validados para atualização:', validatedData);
    
    // Preparar dados
    const serviceData: any = {
      tipoServico: validatedData.tipoServico,
      maquinaId: validatedData.maquinaId,
      tecnicoId: validatedData.tecnicoId,
      descricaoServico: validatedData.descricaoServico,
      descricaoProblema: validatedData.descricaoProblema,
      prioridade: validatedData.prioridade,
      status: validatedData.status,
      observacoes: validatedData.observacoes
    };
    
    // Combinar data e hora se data existir
    if (validatedData.dataAgendamento) {
      const dateStr = validatedData.dataAgendamento.replace('Z', '');
      const timeStr = validatedData.horaAgendamento || '08:00';
      serviceData.dataAgendamento = `${dateStr}T${timeStr}:00`;
      console.log('📅 [SERVICES] Data agendamento para atualização:', serviceData.dataAgendamento);
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
    
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});
  // PUT atualizar serviço (CORRIGIDO)
  app.put('/api/services/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Atualizando serviço:', req.params.id);
    console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Valida com schema parcial
      const validatedData = serviceRequestSchema.partial().parse(req.body);
      
      console.log('✅ [SERVICES] Dados validados para atualização:', validatedData);
      
      // Preparar dados
      const serviceData: any = {
        tipoServico: validatedData.tipoServico,
        maquinaId: validatedData.maquinaId,
        tecnicoId: validatedData.tecnicoId,
        descricaoServico: validatedData.descricaoServico,
        descricaoProblema: validatedData.descricaoProblema,
        prioridade: validatedData.prioridade,
        status: validatedData.status,
        observacoes: validatedData.observacoes
      };
      
      // Combinar data e hora se ambos existirem
      if (validatedData.dataAgendamento && validatedData.horaAgendamento) {
        serviceData.dataAgendamento = `${validatedData.dataAgendamento}T${validatedData.horaAgendamento}:00`;
      } else if (validatedData.dataAgendamento) {
        serviceData.dataAgendamento = `${validatedData.dataAgendamento}T08:00:00`;
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
      
      res.status(500).json({ error: 'Erro ao atualizar serviço' });
    }
  });
  
  // DELETE serviço
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
  
  // Dashboard stats
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
  
  // GET histórico de um serviço
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
  
  // GET perfil do usuário atual
  app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Remove senha da resposta
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, data: userWithoutPassword });
      
    } catch (error) {
      console.error('❌ [API] Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  });
  
  // ========== ADDITIONAL ROUTES ==========
  
  // GET máquina por código
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
  
  // GET check health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Gestão de Ar Condicionado API',
      version: '1.0.0'
    });
  });

  // ========== ROTAS DE RELATÓRIOS ==========

// Rota para gerar relatórios (similar à do frontend)
// Rota para gerar relatórios (CORRIGIDA COM DEBUG)
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 [REPORTS API] Iniciando geração de relatório...');
    
    const {
      startDate,
      endDate,
      branchFilter = 'all',
      statusFilter = 'all',
      technicianId,
      machineId,
      serviceType
    } = req.query;
    
    console.log('🔍 [REPORTS API] Filtros recebidos:', {
      startDate,
      endDate,
      branchFilter,
      statusFilter,
      technicianId,
      machineId,
      serviceType
    });
    
    // Obter todos os serviços
    const allServices = await storage.getAllServices();
    const allMachines = await storage.getAllMachines();
    
    console.log('📈 [REPORTS API] Total de serviços no banco:', allServices.length);
    console.log('📈 [REPORTS API] Total de máquinas no banco:', allMachines.length);
    
    // Debug: Mostrar filiais disponíveis
    const filiaisDisponiveis = Array.from(new Set(allMachines.map(m => m.filial)));
    console.log('🏢 [REPORTS API] Filiais disponíveis nas máquinas:', filiaisDisponiveis);
    console.log('🔍 [REPORTS API] Filtrando por filial:', branchFilter);
    
    // Filtrar serviços
    let filteredServices = allServices;
    
    // Debug antes do filtro
    console.log('🔍 [REPORTS API] Serviços antes do filtro:', allServices.length);
    
    // Filtrar por data
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      
      console.log('📅 [REPORTS API] Período de data:', start, 'até', end);
      
      filteredServices = filteredServices.filter(service => {
        const serviceDate = new Date(service.dataAgendamento);
        return serviceDate >= start && serviceDate <= end;
      });
      console.log('📅 [REPORTS API] Após filtro de data:', filteredServices.length);
    }
    
    // Filtrar por filial - AQUI ESTÁ O PROBLEMA!
    if (branchFilter && branchFilter !== 'all') {
      console.log('🏢 [REPORTS API] Aplicando filtro de filial:', branchFilter);
      
      // Debug: Verificar máquinas
      if (allMachines.length > 0) {
        console.log('🔍 [REPORTS API] Primeiras 3 máquinas:', allMachines.slice(0, 3).map(m => ({
          id: m.id,
          filial: m.filial
        })));
      }
      
      // Debug: Verificar serviços
      if (filteredServices.length > 0) {
        console.log('🔍 [REPORTS API] Primeiros 3 serviços:', filteredServices.slice(0, 3).map(s => ({
          id: s.id,
          maquinaId: s.maquinaId,
          tipoServico: s.tipoServico
        })));
      }
      
      filteredServices = filteredServices.filter(service => {
        const machine = allMachines.find(m => m.id === service.maquinaId);
        const match = machine?.filial === branchFilter;
        
        // Debug por serviço (apenas se não encontrar)
        if (!machine) {
          console.log(`❌ [REPORTS API] Serviço ${service.id}: Máquina não encontrada`);
        } else if (!match) {
          console.log(`❌ [REPORTS API] Serviço ${service.id}: Filial da máquina "${machine.filial}" não corresponde ao filtro "${branchFilter}"`);
        }
        
        return match;
      });
      
      console.log('🏢 [REPORTS API] Após filtro de filial:', filteredServices.length);
    }
    
    // FILTRO DE STATUS (mantenha o original)
    if (statusFilter && statusFilter !== 'all') {
      filteredServices = filteredServices.filter(service => 
        service.status === statusFilter
      );
    }
    
    // FILTRO DE TÉCNICO (mantenha o original)
    if (technicianId) {
      filteredServices = filteredServices.filter(service => 
        service.tecnicoId === technicianId
      );
    }
    
    // FILTRO DE MÁQUINA (mantenha o original)
    if (machineId) {
      filteredServices = filteredServices.filter(service => 
        service.maquinaId === machineId
      );
    }
    
    // FILTRO DE TIPO DE SERVIÇO (mantenha o original)
    if (serviceType) {
      filteredServices = filteredServices.filter(service => 
        service.tipoServico === serviceType
      );
    }
    
    console.log('✅ [REPORTS API] Total de serviços após todos os filtros:', filteredServices.length);
    
    // CONTINUE COM O RESTO DO SEU CÓDIGO ORIGINAL AQUI...
    // (o resto do código que gera as estatísticas, gráficos, etc.)

// Rota para exportar relatório em CSV
app.get('/api/reports/export/csv', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      branchFilter = 'all',
      statusFilter = 'all'
    } = req.query;
    
    // Obter serviços filtrados (usando a mesma lógica acima)
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
    
    // Preparar dados CSV
    const csvRows = [];
    
    // Cabeçalho
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
    
    // Dados
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
    
    // Configurar resposta
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

// Rota para estatísticas em tempo real
app.get('/api/reports/real-time-stats', authenticateToken, async (req, res) => {
  try {
    const allServices = await storage.getAllServices();
    const allMachines = await storage.getAllMachines();
    
    // Serviços do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayServices = allServices.filter(service => {
      const serviceDate = new Date(service.dataAgendamento);
      return serviceDate >= today && serviceDate < tomorrow;
    });
    
    // Serviços da semana
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekServices = allServices.filter(service => {
      const serviceDate = new Date(service.dataAgendamento);
      return serviceDate >= weekAgo;
    });
    
    // Máquinas com problemas
    const problemMachines = allMachines.filter(m => 
      m.status === 'DEFEITO' || m.status === 'MANUTENCAO'
    ).length;
    
    // Técnicos mais ativos da semana
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

// Rota para histórico de serviços por máquina
app.get('/api/reports/machine-history/:machineId', authenticateToken, async (req, res) => {
  try {
    const { machineId } = req.params;
    
    const services = await storage.getServicesByMachine(machineId);
    const machine = await storage.getMachine(machineId);
    
    if (!machine) {
      return res.status(404).json({ error: 'Máquina não encontrada' });
    }
    
    // Estatísticas da máquina
    const totalServices = services.length;
    const completedServices = services.filter(s => s.status === 'CONCLUIDO').length;
    const maintenanceCost = services.reduce((sum, service) => {
      const cost = parseFloat(service.custo) || 0;
      return sum + cost;
    }, 0);
    
    // Histórico de problemas
    const problemServices = services.filter(s => 
      s.tipoServico === 'CORRETIVA' || s.descricaoProblema
    );
    
    // Próxima manutenção preventiva sugerida
    const lastPreventive = services
      .filter(s => s.tipoServico === 'PREVENTIVA' && s.status === 'CONCLUIDO')
      .sort((a, b) => new Date(b.dataConclusao || b.dataAgendamento).getTime() - 
                     new Date(a.dataConclusao || a.dataAgendamento).getTime())[0];
    
    let nextPreventiveDate = null;
    if (lastPreventive) {
      const lastDate = new Date(lastPreventive.dataConclusao || lastPreventive.dataAgendamento);
      nextPreventiveDate = new Date(lastDate);
      nextPreventiveDate.setMonth(nextPreventiveDate.getMonth() + 3); // Sugere em 3 meses
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

// Rota para relatório de custos
app.get('/api/reports/cost-analysis', authenticateToken, async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      branchFilter = 'all',
      groupBy = 'month' // month, branch, type, technician
    } = req.query;
    
    const allServices = await storage.getAllServices();
    const allMachines = await storage.getAllMachines();
    const allTechnicians = await storage.getAllTechnicians();
    
    let filteredServices = allServices;
    
    // Aplicar filtros de data
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      
      filteredServices = filteredServices.filter(service => {
        const serviceDate = new Date(service.dataAgendamento);
        return serviceDate >= start && serviceDate <= end;
      });
    }
    
    // Aplicar filtro de filial
    if (branchFilter && branchFilter !== 'all') {
      filteredServices = filteredServices.filter(service => {
        const machine = allMachines.find(m => m.id === service.maquinaId);
        return machine?.filial === branchFilter;
      });
    }
    
    // Agrupar por período escolhido
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
        
        // Detalhamento por tipo
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
    
    // Calcular totais
    const totalCost = filteredServices.reduce((sum, service) => {
      return sum + (parseFloat(service.custo) || 0);
    }, 0);
    
    const avgCostPerService = filteredServices.length > 0 ? totalCost / filteredServices.length : 0;
    
    // Serviços mais caros
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
    
    // Custo por técnico
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

// Função auxiliar para gerar recomendações de custos
function generateCostRecommendations(services: any[], machines: any[]) {
  const recommendations = [];
  
  // Análise de custo por máquina
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
  
  // Identificar máquinas com alto custo de manutenção
  const highCostMachines = Object.values(costByMachine)
    .filter((item: any) => item.totalCost > 1000) // Exemplo: máquinas com custo > R$1000
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
  
  // Identificar serviços preventivos em falta
  const machinesNeedingPreventive = machines.filter(machine => {
    const lastPreventive = services
      .filter(s => s.maquinaId === machine.id && s.tipoServico === 'PREVENTIVA')
      .sort((a, b) => new Date(b.dataAgendamento).getTime() - new Date(a.dataAgendamento).getTime())[0];
    
    if (!lastPreventive) return true;
    
    const lastDate = new Date(lastPreventive.dataAgendamento);
    const monthsSince = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsSince > 6; // Mais de 6 meses sem manutenção preventiva
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
  
  return httpServer;
}