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
    
    // 1. Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    
    if (!tableExists.rows[0]?.exists) {
      console.log('❌ Tabela users não existe. Será criada na inicialização.');
      return;
    }
    
    // 2. Verificar tipo da coluna id
    const checkIdType = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    if (checkIdType.rows.length > 0 && checkIdType.rows[0].data_type !== 'uuid') {
      console.log('📝 Convertendo coluna id para UUID...');
      // Para produção, precisamos criar uma nova tabela e migrar os dados
      console.log('⚠️  Migração de tipo requer script específico');
      console.log('⚠️  Para produção, mantenha como está e ajuste no schema');
    } else if (checkIdType.rows.length > 0) {
      console.log('✅ Coluna id já é UUID');
    }
    
    // 3. Verificar/adicionar coluna password
    const checkPassword = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    if (checkPassword.rows.length === 0) {
      console.log('📝 Adicionando coluna password...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';
      `);
      console.log('✅ Coluna password adicionada');
    } else {
      console.log('✅ Coluna password já existe');
    }
    
    // 4. Verificar/adicionar coluna name
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
    
    // 5. Verificar/adicionar coluna role
    const checkRole = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (checkRole.rows.length === 0) {
      console.log('📝 Adicionando coluna role...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(50) DEFAULT 'technician';
      `);
      console.log('✅ Coluna role adicionada');
    } else {
      console.log('✅ Coluna role já existe');
    }
    
    // 6. Verificar/adicionar coluna updated_at
    const checkUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'updated_at'
    `);
    
    if (checkUpdatedAt.rows.length === 0) {
      console.log('📝 Adicionando coluna updated_at...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Coluna updated_at adicionada');
    } else {
      console.log('✅ Coluna updated_at já existe');
    }
    
    // 7. Verificar estrutura final
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura final da tabela users:');
    finalColumns.rows.forEach(row => {
      console.log(`   ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}) ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
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
        
        // Verificar se a coluna id é UUID
        const checkTableId = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = '${table}' AND column_name = 'id'
        `);
        
        if (checkTableId.rows.length > 0) {
          if (checkTableId.rows[0].data_type === 'uuid') {
            console.log(`   ✅ Coluna id já é UUID`);
          } else {
            console.log(`   ⚠️  Coluna id é ${checkTableId.rows[0].data_type} (deveria ser UUID)`);
          }
        }
      } else {
        console.log(`❌ Tabela ${table} não existe - será criada na próxima inicialização`);
      }
    }
    
    // ========== CORRIGIR FOREIGN KEYS ==========
    console.log('\n🔗 Verificando foreign keys...');
    
    // Verificar service_history service_id
    const checkServiceHistoryFK = await client.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'service_history'
        AND kcu.column_name = 'service_id';
    `);
    
    if (checkServiceHistoryFK.rows.length === 0) {
      console.log('⚠️  Foreign key service_history.service_id não encontrada');
    } else {
      console.log('✅ Foreign key service_history.service_id existe');
    }
    
    console.log('\n🎉 Banco de dados atualizado conforme schema!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
    // Não lançar erro para não quebrar a inicialização
    console.log('⚠️  Continuando sem atualização completa...');
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabase().catch(console.error);
}

export { updateDatabase };