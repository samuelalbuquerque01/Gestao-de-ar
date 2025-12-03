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
    
    // Verificar e corrigir tabela technicians se necessário
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
    
    // Verificar e corrigir tabela services se necessário
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
    
    // Verificar e corrigir descricao_servico
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