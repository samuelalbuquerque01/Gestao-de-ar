import { Client } from 'pg';

async function initDatabase() {
  console.log('🚀 Inicializando banco de dados conforme schema...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para inicialização');
    
    // ========== CRIAR TABELA USERS (conforme schema) ==========
    console.log('\n📦 Criando tabela users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Tabela users criada/verificada (conforme schema)');
    
    // ========== CRIAR TABELA TECHNICIANS ==========
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
    
    // ========== CRIAR TABELA MACHINES ==========
    console.log('\n📦 Criando tabela machines...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
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
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_servico VARCHAR(50) NOT NULL,
        maquina_id VARCHAR(255) NOT NULL,
        data_agendamento TIMESTAMP NOT NULL,
        tecnico_id VARCHAR(255) NOT NULL,
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
    console.log('\n📊 Criando índices para melhor performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_maquina_id ON services(maquina_id);
      CREATE INDEX IF NOT EXISTS idx_services_tecnico_id ON services(tecnico_id);
      CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
      CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
      CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);
    `);
    console.log('✅ Índices criados');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
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