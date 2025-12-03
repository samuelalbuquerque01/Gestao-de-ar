import { Client } from 'pg';

async function updateDatabase() {
  console.log('🔄 Atualizando banco de dados (adicionando colunas faltantes)...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para atualização');
    
    // Verificar se a coluna username existe na tabela users
    const checkUsername = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'username'
    `);
    
    if (checkUsername.rows.length === 0) {
      console.log('📝 Adicionando coluna username à tabela users...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN username VARCHAR(255);
        
        -- Tornar username único após adicionar
        ALTER TABLE users 
        ADD CONSTRAINT unique_username UNIQUE (username);
      `);
      console.log('✅ Coluna username adicionada à tabela users');
    } else {
      console.log('✅ Coluna username já existe na tabela users');
    }
    
    // Verificar se a coluna phone existe
    const checkPhone = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    if (checkPhone.rows.length === 0) {
      console.log('📝 Adicionando coluna phone à tabela users...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN phone VARCHAR(20);
      `);
      console.log('✅ Coluna phone adicionada à tabela users');
    } else {
      console.log('✅ Coluna phone já existe na tabela users');
    }
    
    console.log('🎉 Banco de dados atualizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabase().catch(console.error);
}

export { updateDatabase };