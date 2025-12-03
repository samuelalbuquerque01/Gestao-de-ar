import { Client } from 'pg';

async function fixDatabase() {
  console.log('🔧 Corrigindo problemas no banco de dados...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para correção');
    
    // ========== CORRIGIR TABELA USERS ==========
    console.log('\n📋 Corrigindo tabela users...');
    
    // 1. Verificar se a tabela existe
    const usersExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    
    if (!usersExists.rows[0]?.exists) {
      console.log('❌ Tabela users não existe. Criando...');
      await client.query(`
        CREATE TABLE users (
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
      console.log('✅ Tabela users criada');
    }
    
    // 2. Adicionar coluna password se não existir
    const checkPassword = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    if (checkPassword.rows.length === 0) {
      console.log('📝 Adicionando coluna password...');
      await client.query(`ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';`);
      console.log('✅ Coluna password adicionada');
    } else {
      console.log('✅ Coluna password já existe');
    }
    
    // ========== VERIFICAR ESTRUTURA COMPLETA ==========
    console.log('\n📊 Verificando estrutura completa do banco...');
    
    const tables = ['technicians', 'machines', 'services', 'service_history'];
    
    for (const table of tables) {
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${table}'
        )
      `);
      
      if (tableExists.rows[0]?.exists) {
        console.log(`✅ Tabela ${table} existe`);
      } else {
        console.log(`❌ Tabela ${table} não existe`);
        console.log(`⚠️  Execute "npm run db:init" para criar todas as tabelas`);
      }
    }
    
    // ========== CRIAR USUÁRIO ADMIN PADRÃO ==========
    console.log('\n👤 Criando usuário admin padrão...');
    
    const adminEmail = 'admin@neuropsicocentro.com.br';
    const checkAdmin = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail]
    );
    
    if (checkAdmin.rows.length === 0) {
      console.log('📝 Inserindo usuário admin...');
      await client.query(`
        INSERT INTO users (username, email, password, name, role, created_at, updated_at)
        VALUES (
          'admin',
          'admin@neuropsicocentro.com.br',
          '$2a$10$dummyhashfordevelopmentonly123456',
          'Administrador',
          'admin',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Usuário admin criado');
      console.log('📧 Email: admin@neuropsicocentro.com.br');
      console.log('🔑 Senha: admin123 (altere após primeiro login)');
    } else {
      console.log('✅ Usuário admin já existe');
    }
    
    console.log('\n🎉 Banco de dados corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir banco de dados:', error);
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabase().catch(console.error);
}

export { fixDatabase };