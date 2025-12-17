import { Client } from 'pg';

async function fixInvalidDates() {
  console.log('🔧 Corrigindo datas inválidas no banco...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL para correção de datas');
    
    // 1. Corrigir datas Invalid Date em services
    console.log('📝 Corrigindo datas inválidas em services...');
    
    const invalidServices = await client.query(`
      SELECT id, data_agendamento 
      FROM services 
      WHERE data_agendamento IS NULL 
         OR data_agendamento::text = 'Invalid Date'
         OR data_agendamento::text = ''
         OR data_agendamento::text LIKE 'Invalid%'
    `);
    
    console.log(`📊 Encontrados ${invalidServices.rows.length} serviços com datas inválidas`);
    
    if (invalidServices.rows.length > 0) {
      for (const row of invalidServices.rows) {
        await client.query(`
          UPDATE services 
          SET data_agendamento = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [row.id]);
        console.log(`✅ Corrigido serviço ${row.id}`);
      }
    }
    
    // 2. Corrigir datas Invalid Date em machines
    console.log('📝 Corrigindo datas inválidas em machines...');
    
    const invalidMachines = await client.query(`
      SELECT id, installation_date 
      FROM machines 
      WHERE installation_date IS NULL 
         OR installation_date::text = 'Invalid Date'
         OR installation_date::text = ''
         OR installation_date::text LIKE 'Invalid%'
    `);
    
    console.log(`📊 Encontradas ${invalidMachines.rows.length} máquinas com datas inválidas`);
    
    if (invalidMachines.rows.length > 0) {
      for (const row of invalidMachines.rows) {
        await client.query(`
          UPDATE machines 
          SET installation_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [row.id]);
        console.log(`✅ Corrigida máquina ${row.id}`);
      }
    }
    
    // 3. Corrigir valores nulos em campos importantes
    console.log('📝 Corrigindo valores nulos em services...');
    
    await client.query(`
      UPDATE services 
      SET status = COALESCE(status, 'AGENDADO'),
          prioridade = COALESCE(prioridade, 'MEDIA'),
          tipo_servico = COALESCE(tipo_servico, 'PREVENTIVA'),
          updated_at = CURRENT_TIMESTAMP
      WHERE status IS NULL 
         OR prioridade IS NULL 
         OR tipo_servico IS NULL
    `);
    
    console.log('✅ Valores nulos corrigidos em services');
    
    // 4. Adicionar defaults para campos faltantes
    console.log('📝 Verificando campos obrigatórios...');
    
    // Verificar se tecnico_nome existe e corrigir se necessário
    const servicesWithoutTechName = await client.query(`
      SELECT s.id, s.tecnico_nome, t.nome as tech_name
      FROM services s
      LEFT JOIN technicians t ON s.tecnico_id = t.id
      WHERE s.tecnico_nome IS NULL OR s.tecnico_nome = ''
    `);
    
    if (servicesWithoutTechName.rows.length > 0) {
      console.log(`📊 Encontrados ${servicesWithoutTechName.rows.length} serviços sem nome do técnico`);
      
      for (const row of servicesWithoutTechName.rows) {
        await client.query(`
          UPDATE services 
          SET tecnico_nome = COALESCE($1, 'Desconhecido'),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [row.tech_name || 'Desconhecido', row.id]);
        console.log(`✅ Corrigido nome do técnico no serviço ${row.id}`);
      }
    }
    
    console.log('🎉 Todas as correções aplicadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir datas:', error);
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixInvalidDates().catch(console.error);
}

export { fixInvalidDates };