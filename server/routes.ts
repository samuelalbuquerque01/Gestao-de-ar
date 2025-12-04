import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMachineSchema, insertTechnicianSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
      // Validação básica - usar nomes em PORTUGUÊS do frontend
      const { codigo, modelo, marca } = req.body;
      if (!codigo || !modelo || !marca) {
        return res.status(400).json({ 
          error: 'Código, modelo e marca são obrigatórios',
          received: { 
            codigo: codigo || 'não fornecido',
            modelo: modelo || 'não fornecido', 
            marca: marca || 'não fornecido' 
          }
        });
      }
      
      // Verifica se código já existe
      const existingMachine = await storage.getMachineByCodigo(codigo);
      if (existingMachine) {
        return res.status(400).json({ error: 'Já existe uma máquina com este código' });
      }
      
      // Preparar dados no formato CORRETO para o storage
      const machineData = {
        codigo: codigo,
        modelo: modelo,
        marca: marca,
        tipo: req.body.tipo || 'SPLIT',
        capacidadeBTU: parseInt(req.body.capacidadeBTU) || 9000,
        voltagem: req.body.voltagem || 'V220',
        localizacaoTipo: req.body.localizacaoTipo || 'SALA',
        localizacaoDescricao: req.body.localizacaoDescricao || '',
        localizacaoAndar: req.body.localizacaoAndar || 0,
        filial: req.body.filial || 'Matriz',
        dataInstalacao: req.body.dataInstalacao || new Date().toISOString().split('T')[0],
        status: req.body.status || 'ATIVO',
        observacoes: req.body.observacoes || ''
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
      console.error('❌ [MACHINES] Stack:', error.stack);
      
      res.status(500).json({ 
        error: 'Erro ao criar máquina',
        message: error.message,
        hint: 'Verifique se todos os campos obrigatórios foram preenchidos'
      });
    }
  });
  
  // PUT atualizar máquina (CORRIGIDO)
  app.put('/api/machines/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [MACHINES] Atualizando máquina:', req.params.id);
    console.log('📥 [MACHINES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Preparar dados no formato CORRETO
      const machineData = {
        codigo: req.body.codigo,
        modelo: req.body.modelo,
        marca: req.body.marca,
        tipo: req.body.tipo,
        capacidadeBTU: req.body.capacidadeBTU ? parseInt(req.body.capacidadeBTU) : undefined,
        voltagem: req.body.voltagem,
        localizacaoTipo: req.body.localizacaoTipo,
        localizacaoDescricao: req.body.localizacaoDescricao,
        localizacaoAndar: req.body.localizacaoAndar,
        filial: req.body.filial,
        dataInstalacao: req.body.dataInstalacao,
        status: req.body.status,
        observacoes: req.body.observacoes
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
      
    } catch (error) {
      console.error('❌ [MACHINES] Erro ao atualizar máquina:', error);
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
      // Validação - usar nomes em português
      const { nome, especialidade, telefone } = req.body;
      
      if (!nome || !especialidade || !telefone) {
        return res.status(400).json({ error: 'Nome, especialidade e telefone são obrigatórios' });
      }
      
      const technicianData = {
        nome: nome,
        especialidade: especialidade,
        telefone: telefone,
        email: req.body.email || '',
        status: req.body.status || 'ATIVO'
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
      const technicianData = {
        nome: req.body.nome,
        especialidade: req.body.especialidade,
        telefone: req.body.telefone,
        email: req.body.email,
        status: req.body.status
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
      
    } catch (error) {
      console.error('❌ [TECHNICIANS] Erro ao atualizar técnico:', error);
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
  
  // POST criar novo serviço (CORRIGIDO)
  app.post('/api/services', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Criando novo serviço...');
    console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      // Validação - usar nomes em português
      const { tipoServico, maquinaId, tecnicoId, descricaoServico, dataAgendamento } = req.body;
      
      if (!tipoServico || !maquinaId || !tecnicoId || !descricaoServico) {
        return res.status(400).json({ 
          error: 'Tipo de serviço, máquina, técnico e descrição são obrigatórios' 
        });
      }
      
      // Preparar dados
      const serviceData = {
        tipoServico: tipoServico,
        maquinaId: maquinaId,
        tecnicoId: tecnicoId,
        descricaoServico: descricaoServico,
        descricaoProblema: req.body.descricaoProblema || '',
        dataAgendamento: dataAgendamento || new Date().toISOString(),
        dataConclusao: req.body.dataConclusao,
        prioridade: req.body.prioridade || 'MEDIA',
        status: req.body.status || 'AGENDADO',
        custo: req.body.custo,
        observacoes: req.body.observacoes || ''
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
      res.status(500).json({ 
        error: 'Erro ao criar serviço',
        message: error.message 
      });
    }
  });
  
  // PUT atualizar serviço (CORRIGIDO)
  app.put('/api/services/:id', authenticateToken, async (req, res) => {
    console.log('🔍 [SERVICES] Atualizando serviço:', req.params.id);
    console.log('📥 [SERVICES] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const serviceData = {
        tipoServico: req.body.tipoServico,
        maquinaId: req.body.maquinaId,
        tecnicoId: req.body.tecnicoId,
        descricaoServico: req.body.descricaoServico,
        descricaoProblema: req.body.descricaoProblema,
        dataAgendamento: req.body.dataAgendamento,
        dataConclusao: req.body.dataConclusao,
        prioridade: req.body.prioridade,
        status: req.body.status,
        custo: req.body.custo,
        observacoes: req.body.observacoes
      };
      
      // Remover campos undefined
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key as keyof typeof serviceData] === undefined) {
          delete serviceData[key as keyof typeof serviceData];
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
      
    } catch (error) {
      console.error('❌ [SERVICES] Erro ao atualizar serviço:', error);
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
  
  // Rota para limpar dados de teste (apenas desenvolvimento)
  app.post('/api/dev/cleanup', authenticateToken, async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Apenas em desenvolvimento' });
    }
    
    try {
      // Limpar serviços
      await db.delete(services);
      // Limpar máquinas (exceto a de teste)
      await db.delete(machines).where(sql`codigo != 'AR-001'`);
      // Limpar técnicos (exceto o de teste)
      await db.delete(technicians).where(sql`nome != 'Carlos Silva'`);
      
      res.json({ success: true, message: 'Dados de teste limpos' });
    } catch (error) {
      console.error('❌ [API] Erro ao limpar dados:', error);
      res.status(500).json({ error: 'Erro ao limpar dados' });
    }
  });
  
  return httpServer;
}