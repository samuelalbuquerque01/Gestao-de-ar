import { Client } from 'pg';

async function initDatabase() {
  console.log('🚀 Inicializando banco de dados...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para inicialização');
    
    // Criar tabela users COM username
    console.log('📦 Criando tabela users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,      -- COLUNA ADICIONADA
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),                          -- COLUNA ADICIONADA
        role VARCHAR(50) DEFAULT 'technician',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela users criada/verificada (com username)');
    
    // Criar tabela technicians
    console.log('📦 Criando tabela technicians...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        specialization VARCHAR(255),
        experience_years INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela technicians criada/verificada');
    
    // Criar tabela machines
    console.log('📦 Criando tabela machines...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        model VARCHAR(255) NOT NULL,
        brand VARCHAR(255) NOT NULL,
        capacity VARCHAR(50),
        installation_date DATE,
        location TEXT,
        status VARCHAR(50) DEFAULT 'active',
        last_maintenance_date DATE,
        next_maintenance_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela machines criada/verificada');
    
    // Criar tabela services
    console.log('📦 Criando tabela services...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
        technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
        service_type VARCHAR(100) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        completed_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        priority VARCHAR(50) DEFAULT 'medium',
        cost DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela services criada/verificada');
    
    console.log('🎉 Todas as tabelas foram criadas/verificadas com sucesso!');
    
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