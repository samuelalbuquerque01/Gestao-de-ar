import { Client } from 'pg';

async function initDatabase() {
  console.log('🚀 Inicializando banco de dados conforme schema...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para inicialização');
    
    // ========== CRIAR TABELA USERS ==========
    console.log('\n📦 Criando tabela users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        role VARCHAR(50) DEFAULT 'technician'
      );
    `);
    console.log('✅ Tabela users criada/verificada');
    
    // Verificar se a coluna password existe
    const checkPassword = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    if (checkPassword.rows.length === 0) {
      console.log('📝 Adicionando coluna password...');
      await client.query(`ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';`);
      console.log('✅ Coluna password adicionada');
    }
    
    // ========== CRIAR TABELA TECHNICIANS ==========
    console.log('\n📦 Criando tabela technicians...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    
    // ========== CRIAR TABELA MACHINES ==========
    console.log('\n📦 Criando tabela machines...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(255) UNIQUE NOT NULL,
        modelo VARCHAR(255) NOT NULL,
        marca VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        capacidade_btu INTEGER NOT NULL,
        voltagem VARCHAR(50) NOT NULL,
        localizacao_tipo VARCHAR(50) NOT NULL,
        localizacao_descricao TEXT NOT NULL,
        localizacao_andar INTEGER,
        filial VARCHAR(255) NOT NULL,
        data_instalacao TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'ATIVO' NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabela machines criada/verificada');
    
    // ========== CRIAR TABELA SERVICES ==========
    console.log('\n📦 Criando tabela services...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_servico VARCHAR(50) NOT NULL,
        maquina_id UUID NOT NULL,
        data_agendamento TIMESTAMP NOT NULL,
        tecnico_id UUID NOT NULL,
        tecnico_nome VARCHAR(255) NOT NULL,
        descricao_servico TEXT NOT NULL,
        descricao_problema TEXT,
        prioridade VARCHAR(50) DEFAULT 'MEDIA' NOT NULL,
        status VARCHAR(50) DEFAULT 'AGENDADO' NOT NULL,
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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL,
        status VARCHAR(50) NOT NULL,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by VARCHAR(255),
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabela service_history criada/verificada');
    
    console.log('\n🎉 Todas as tabelas foram criadas/verificadas com sucesso!');
    
    // ========== CRIAR ÍNDICES (COM VERIFICAÇÃO) ==========
    console.log('\n📊 Criando índices para melhor performance...');
    
    // Verificar se a tabela services existe antes de criar índices
    const servicesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'services'
      )
    `);
    
    if (servicesTableExists.rows[0]?.exists) {
      // Verificar se a coluna maquina_id existe antes de criar o índice
      const checkMaquinaId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'maquina_id'
      `);
      
      if (checkMaquinaId.rows.length > 0) {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_maquina_id ON services(maquina_id);`);
        console.log('✅ Índice idx_services_maquina_id criado');
      } else {
        console.log('⚠️  Coluna maquina_id não existe na tabela services');
      }
      
      const checkTecnicoId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'tecnico_id'
      `);
      
      if (checkTecnicoId.rows.length > 0) {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_tecnico_id ON services(tecnico_id);`);
        console.log('✅ Índice idx_services_tecnico_id criado');
      }
      
      const checkStatus = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'status'
      `);
      
      if (checkStatus.rows.length > 0) {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);`);
        console.log('✅ Índice idx_services_status criado');
      }
    }
    
    // Índices para máquinas
    const machinesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'machines'
      )
    `);
    
    if (machinesTableExists.rows[0]?.exists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);`);
      console.log('✅ Índice idx_machines_status criado');
    }
    
    // Índices para service_history
    const serviceHistoryExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'service_history'
      )
    `);
    
    if (serviceHistoryExists.rows[0]?.exists) {
      const checkServiceId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'service_history' AND column_name = 'service_id'
      `);
      
      if (checkServiceId.rows.length > 0) {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);`);
        console.log('✅ Índice idx_service_history_service_id criado');
      }
    }
    
    // Índices para users
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    
    if (usersTableExists.rows[0]?.exists) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
      console.log('✅ Índices para users criados');
    }
    
    console.log('✅ Índices criados/verificados');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    // Não lançar erro para não quebrar o servidor
    console.log('⚠️  Continuando sem inicialização completa do banco...');
  } finally {
    await client.end();
  }
}

// Exportar para uso em outros arquivos
export { initDatabase };

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch(console.error);
}