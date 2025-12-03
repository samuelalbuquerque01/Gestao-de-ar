import { Client } from 'pg';

async function updateDatabase() {
  console.log('🔄 Atualizando banco de dados...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');
    
    console.log('\n📋 Verificando tabela users...');
    
    // Verificar se a tabela existe
    const usersExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    
    if (!usersExists.rows[0]?.exists) {
      console.log('❌ Tabela users não existe');
      return;
    }
    
    // Verificar/adicionar coluna role
    const checkRole = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (checkRole.rows.length === 0) {
      console.log('📝 Adicionando coluna role...');
      await client.query(`ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'technician';`);
      console.log('✅ Coluna role adicionada');
    }
    
    // Verificar/adicionar coluna updated_at
    const checkUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'updated_at'
    `);
    
    if (checkUpdatedAt.rows.length === 0) {
      console.log('📝 Adicionando coluna updated_at...');
      await client.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      console.log('✅ Coluna updated_at adicionada');
    }
    
    console.log('\n📊 Verificando outras tabelas...');
    
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
      }
    }
    
    console.log('\n🎉 Banco de dados atualizado!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  } finally {
    await client.end();
  }
}

export { updateDatabase };

if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabase().catch(console.error);
}