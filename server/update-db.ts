import { Client } from 'pg';

async function updateDatabase() {
  console.log('🔄 Atualizando banco de dados (ajustando schema)...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para atualização');
    
    // ========== ATUALIZAR TABELA USERS ==========
    console.log('\n📋 Verificando tabela users...');
    
    // 1. Verificar se existe coluna password_hash
    const checkPasswordHash = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    // 2. Verificar se existe coluna password
    const checkPassword = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    if (checkPasswordHash.rows.length > 0 && checkPassword.rows.length === 0) {
      console.log('📝 Renomeando password_hash para password...');
      await client.query(`
        ALTER TABLE users 
        RENAME COLUMN password_hash TO password;
      `);
      console.log('✅ Coluna renomeada: password_hash → password');
    } else if (checkPassword.rows.length > 0) {
      console.log('✅ Coluna password já existe');
    } else {
      console.log('📝 Adicionando coluna password...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';
      `);
      console.log('✅ Coluna password adicionada');
    }
    
    // 3. Verificar/adicionar coluna name
    const checkName = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'name'
    `);
    
    if (checkName.rows.length === 0) {
      console.log('📝 Adicionando coluna name...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN name VARCHAR(255);
      `);
      console.log('✅ Coluna name adicionada');
    } else {
      console.log('✅ Coluna name já existe');
    }
    
    // 4. Remover colunas não usadas no schema (se existirem)
    const checkRole = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (checkRole.rows.length > 0) {
      console.log('📝 Removendo coluna role (não está no schema)...');
      await client.query(`
        ALTER TABLE users 
        DROP COLUMN role;
      `);
      console.log('✅ Coluna role removida');
    }
    
    const checkUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'updated_at'
    `);
    
    if (checkUpdatedAt.rows.length > 0) {
      console.log('📝 Removendo coluna updated_at (não está no schema)...');
      await client.query(`
        ALTER TABLE users 
        DROP COLUMN updated_at;
      `);
      console.log('✅ Coluna updated_at removida');
    }
    
    // 5. Verificar estrutura final
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final da tabela users:');
    finalColumns.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // ========== VERIFICAR OUTRAS TABELAS ==========
    console.log('\n📋 Verificando outras tabelas...');
    
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
        console.log(`❌ Tabela ${table} não existe - será criada na próxima inicialização`);
      }
    }
    
    console.log('\n🎉 Banco de dados atualizado conforme schema!');
    
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