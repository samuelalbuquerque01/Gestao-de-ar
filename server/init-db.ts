import { Client } from 'pg';

async function initDatabase() {
  console.log('🚀 Inicializando banco de dados...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');
    
    // ========== CRIAR TABELA USERS ==========
    console.log('\n📦 Criando tabela users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'technician',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabela users criada/verificada');
    
    // ========== CRIAR TABELA TECHNICIANS (COM TODAS AS COLUNAS CORRETAS) ==========
    console.log('\n📦 Criando tabela technicians...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        especialidade VARCHAR(255) NOT NULL,
        telefone VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ATIVO' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabela technicians criada/verificada');
    
    // ========== CRIAR TABELA MACHINES (COM TODAS AS COLUNAS CORRETAS) ==========
    console.log('\n📦 Criando tabela machines...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(255) UNIQUE NOT NULL,
        model VARCHAR(255) NOT NULL,
        brand VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'SPLIT',
        capacity INTEGER NOT NULL DEFAULT 9000,
        voltage VARCHAR(50) NOT NULL DEFAULT 'V220',
        location_type VARCHAR(50) NOT NULL DEFAULT 'SALA',
        location TEXT NOT NULL,
        location_floor INTEGER,
        branch VARCHAR(255) NOT NULL DEFAULT 'Matriz',
        installation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'ATIVO' NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabela machines criada/verificada');
    
    // ========== CRIAR TABELA SERVICES (COM NOMES EM PORTUGUÊS) ==========
    console.log('\n📦 Criando tabela services...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_servico VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVA',
        maquina_id VARCHAR(255) NOT NULL,
        data_agendamento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tecnico_id VARCHAR(255) NOT NULL,
        tecnico_nome VARCHAR(255) NOT NULL DEFAULT 'Técnico',
        descricao_servico TEXT NOT NULL,
        descricao_problema TEXT,
        prioridade VARCHAR(50) DEFAULT 'MEDIA' NOT NULL,
        status VARCHAR(50) DEFAULT 'AGENDADO' NOT NULL,
        custo NUMERIC(10, 2),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (maquina_id) REFERENCES machines(id) ON DELETE CASCADE,
        FOREIGN KEY (tecnico_id) REFERENCES technicians(id) ON DELETE RESTRICT
      );
    `);
    console.log('✅ Tabela services criada/verificada');
    
    // ========== CRIAR TABELA SERVICE_HISTORY ==========
    console.log('\n📦 Criando tabela service_history...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_history (
        id SERIAL PRIMARY KEY,
        service_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by VARCHAR(255),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabela service_history criada/verificada');
    
    console.log('\n🎉 Todas as tabelas foram criadas/verificadas com sucesso!');
    
    // ========== CRIAR ÍNDICES ==========
    console.log('\n📊 Criando índices...');
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_maquina_id ON services(maquina_id);`);
      console.log('✅ Índice idx_services_maquina_id criado');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índice idx_services_maquina_id:', error.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_tecnico_id ON services(tecnico_id);`);
      console.log('✅ Índice idx_services_tecnico_id criado');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índice idx_services_tecnico_id:', error.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);`);
      console.log('✅ Índice idx_services_status criado');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índice idx_services_status:', error.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);`);
      console.log('✅ Índice idx_machines_status criado');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índice idx_machines_status:', error.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);`);
      console.log('✅ Índice idx_service_history_service_id criado');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índice idx_service_history_service_id:', error.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
      console.log('✅ Índices para users criados');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar índices para users:', error.message);
    }
    
    console.log('✅ Índices criados/verificados');
    
    // ========== VERIFICAR E CORRIGIR ESTRUTURA EXISTENTE ==========
    console.log('\n🔍 Verificando e corrigindo estrutura existente...');
    
    // 1. Verificar e corrigir tabela technicians
    const checkTechEmail = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'technicians' AND column_name = 'email'
    `);
    
    if (checkTechEmail.rows.length === 0) {
      console.log('📝 Adicionando coluna email à tabela technicians...');
      await client.query(`ALTER TABLE technicians ADD COLUMN email VARCHAR(255);`);
      console.log('✅ Coluna email adicionada à technicians');
    }
    
    // Verificar updated_at em technicians
    const checkTechUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'technicians' AND column_name = 'updated_at'
    `);
    
    if (checkTechUpdatedAt.rows.length === 0) {
      console.log('📝 Adicionando updated_at à technicians...');
      await client.query(`ALTER TABLE technicians ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      console.log('✅ updated_at adicionado à technicians');
    }
    
    // 2. Verificar e corrigir tabela services
    const checkServicesStructure = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'maquina_id'
    `);
    
    if (checkServicesStructure.rows.length === 0) {
      console.log('📝 Verificando se services tem machine_id...');
      const checkMachineId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'machine_id'
      `);
      
      if (checkMachineId.rows.length > 0) {
        console.log('🔄 Renomeando machine_id para maquina_id...');
        await client.query(`ALTER TABLE services RENAME COLUMN machine_id TO maquina_id;`);
        console.log('✅ machine_id renomeado para maquina_id');
      } else {
        console.log('📝 Adicionando coluna maquina_id à services...');
        await client.query(`ALTER TABLE services ADD COLUMN maquina_id VARCHAR(255);`);
        console.log('✅ Coluna maquina_id adicionada à services');
      }
    }
    
    // Verificar descricao_servico
    const checkDescServico = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'descricao_servico'
    `);
    
    if (checkDescServico.rows.length === 0) {
      console.log('📝 Verificando se services tem description...');
      const checkDescription = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'description'
      `);
      
      if (checkDescription.rows.length > 0) {
        console.log('🔄 Renomeando description para descricao_servico...');
        await client.query(`ALTER TABLE services RENAME COLUMN description TO descricao_servico;`);
        console.log('✅ description renomeado para descricao_servico');
      } else {
        console.log('📝 Adicionando coluna descricao_servico à services...');
        await client.query(`ALTER TABLE services ADD COLUMN descricao_servico TEXT NOT NULL DEFAULT '';`);
        console.log('✅ Coluna descricao_servico adicionada à services');
      }
    }
    
    // Verificar data_agendamento
    const checkDataAgendamento = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'data_agendamento'
    `);
    
    if (checkDataAgendamento.rows.length === 0) {
      console.log('📝 Verificando se services tem scheduled_date...');
      const checkScheduledDate = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'scheduled_date'
      `);
      
      if (checkScheduledDate.rows.length > 0) {
        console.log('🔄 Renomeando scheduled_date para data_agendamento...');
        await client.query(`ALTER TABLE services RENAME COLUMN scheduled_date TO data_agendamento;`);
        console.log('✅ scheduled_date renomeado para data_agendamento');
      } else {
        console.log('📝 Adicionando coluna data_agendamento à services...');
        await client.query(`ALTER TABLE services ADD COLUMN data_agendamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
        console.log('✅ Coluna data_agendamento adicionada à services');
      }
    }
    
    // Verificar tecnico_id
    const checkTecnicoId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'tecnico_id'
    `);
    
    if (checkTecnicoId.rows.length === 0) {
      console.log('📝 Verificando se services tem technician_id...');
      const checkTechnicianId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'technician_id'
      `);
      
      if (checkTechnicianId.rows.length > 0) {
        console.log('🔄 Renomeando technician_id para tecnico_id...');
        await client.query(`ALTER TABLE services RENAME COLUMN technician_id TO tecnico_id;`);
        console.log('✅ technician_id renomeado para tecnico_id');
      } else {
        console.log('📝 Adicionando coluna tecnico_id à services...');
        await client.query(`ALTER TABLE services ADD COLUMN tecnico_id VARCHAR(255);`);
        console.log('✅ Coluna tecnico_id adicionada à services');
      }
    }
    
    // Verificar e adicionar colunas faltantes em services
    const checkDataConclusao = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'data_conclusao'
    `);
    
    if (checkDataConclusao.rows.length === 0) {
      console.log('📝 Adicionando data_conclusao à services...');
      await client.query(`ALTER TABLE services ADD COLUMN data_conclusao TIMESTAMP;`);
      console.log('✅ data_conclusao adicionado à services');
    }
    
    const checkCusto = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'custo'
    `);
    
    if (checkCusto.rows.length === 0) {
      console.log('📝 Adicionando custo à services...');
      await client.query(`ALTER TABLE services ADD COLUMN custo NUMERIC(10, 2);`);
      console.log('✅ custo adicionado à services');
    }
    
    const checkServicesUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'updated_at'
    `);
    
    if (checkServicesUpdatedAt.rows.length === 0) {
      console.log('📝 Adicionando updated_at à services...');
      await client.query(`ALTER TABLE services ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      console.log('✅ updated_at adicionado à services');
    }
    
    const checkDescProblema = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'descricao_problema'
    `);
    
    if (checkDescProblema.rows.length === 0) {
      console.log('📝 Adicionando descricao_problema à services...');
      await client.query(`ALTER TABLE services ADD COLUMN descricao_problema TEXT;`);
      console.log('✅ descricao_problema adicionado à services');
    }
    
    // 3. Verificar e corrigir foreign keys
    console.log('\n🔗 Verificando e criando foreign keys...');
    
    try {
      // Dropar constraints antigas se existirem
      await client.query(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_machine_id_fkey;`);
      await client.query(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_technician_id_fkey;`);
      
      // Criar constraints corretas
      await client.query(`
        ALTER TABLE services 
        ADD CONSTRAINT services_maquina_id_fkey 
        FOREIGN KEY (maquina_id) REFERENCES machines(id) ON DELETE CASCADE;
      `);
      console.log('✅ FK services_maquina_id_fkey criada/verificada');
      
      await client.query(`
        ALTER TABLE services 
        ADD CONSTRAINT services_tecnico_id_fkey 
        FOREIGN KEY (tecnico_id) REFERENCES technicians(id) ON DELETE RESTRICT;
      `);
      console.log('✅ FK services_tecnico_id_fkey criada/verificada');
    } catch (error: any) {
      console.log('⚠️  Não foi possível criar foreign keys:', error.message);
    }
    
    // 4. Criar dados de teste se necessário
    console.log('\n🧪 Verificando dados de teste...');
    
    const checkTechCount = await client.query(`SELECT COUNT(*) as count FROM technicians;`);
    const techCount = parseInt(checkTechCount.rows[0]?.count || '0');
    
    const checkMachineCount = await client.query(`SELECT COUNT(*) as count FROM machines;`);
    const machineCount = parseInt(checkMachineCount.rows[0]?.count || '0');
    
    const checkServiceCount = await client.query(`SELECT COUNT(*) as count FROM services;`);
    const serviceCount = parseInt(checkServiceCount.rows[0]?.count || '0');
    
    if (techCount === 0) {
      console.log('📝 Inserindo técnico de teste...');
      await client.query(`
        INSERT INTO technicians (nome, especialidade, telefone, email, status) 
        VALUES ('Carlos Silva', 'Ar Condicionado', '(11) 99999-9999', 'carlos@teste.com', 'ATIVO')
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Técnico de teste inserido');
    }
    
    if (machineCount === 0) {
      console.log('📝 Inserindo máquina de teste...');
      await client.query(`
        INSERT INTO machines (codigo, model, brand, type, capacity, voltage, location_type, location, branch, installation_date, status) 
        VALUES ('AR-001', 'Dual Inverter', 'LG', 'SPLIT', 9000, 'V220', 'SALA', 'Sala de Reuniões 1', 'Matriz', CURRENT_TIMESTAMP, 'ATIVO')
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Máquina de teste inserida');
    }
    
    if (serviceCount === 0 && techCount > 0 && machineCount > 0) {
      console.log('📝 Inserindo serviço de teste...');
      await client.query(`
        INSERT INTO services (
          tipo_servico, maquina_id, tecnico_id, tecnico_nome, 
          descricao_servico, data_agendamento, status, prioridade
        )
        SELECT 
          'PREVENTIVA',
          (SELECT id FROM machines LIMIT 1),
          (SELECT id FROM technicians LIMIT 1),
          (SELECT nome FROM technicians LIMIT 1),
          'Manutenção preventiva trimestral',
          CURRENT_TIMESTAMP + INTERVAL '7 days',
          'AGENDADO',
          'MEDIA'
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Serviço de teste inserido');
    }
    
    console.log('\n🎉 Banco de dados inicializado e corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    await client.end();
  }
}

export { initDatabase };

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch(console.error);
}