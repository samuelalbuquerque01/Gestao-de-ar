import { Client } from 'pg';

async function initDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    //  CRIAR TABELA USERS 
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
    //  CRIAR TABELA TECHNICIANS (COM TODAS AS COLUNAS CORRETAS) 
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
    //  CRIAR TABELA MACHINES (COM TODAS AS COLUNAS CORRETAS) 
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
    //  CRIAR TABELA SERVICES (COM NOMES EM PORTUGUÃŠS) 
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_servico VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVA',
        maquina_id VARCHAR(255) NOT NULL,
        data_agendamento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tecnico_id VARCHAR(255) NOT NULL,
        tecnico_nome VARCHAR(255) NOT NULL DEFAULT 'TÃ©cnico',
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
    //  CRIAR TABELA SERVICE_HISTORY 
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
    //  CRIAR ÃNDICES 
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_maquina_id ON services(maquina_id);`);
    } catch (error: any) {
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_tecnico_id ON services(tecnico_id);`);
    } catch (error: any) {
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);`);
    } catch (error: any) {
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);`);
    } catch (error: any) {
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);`);
    } catch (error: any) {
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    } catch (error: any) {
    }
    //  VERIFICAR E CORRIGIR ESTRUTURA EXISTENTE 
    // 1. Verificar e adicionar coluna prioridade se nÃ£o existir
    const checkPrioridade = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'prioridade'
    `);
    
    if (checkPrioridade.rows.length === 0) {
      await client.query(`ALTER TABLE services ADD COLUMN prioridade VARCHAR(50) DEFAULT 'MEDIA' NOT NULL;`);
    }
    
    // 2. Verificar e corrigir tabela technicians
    const checkTechEmail = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'technicians' AND column_name = 'email'
    `);
    
    if (checkTechEmail.rows.length === 0) {
      await client.query(`ALTER TABLE technicians ADD COLUMN email VARCHAR(255);`);
    }
    
    // Verificar updated_at em technicians
    const checkTechUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'technicians' AND column_name = 'updated_at'
    `);
    
    if (checkTechUpdatedAt.rows.length === 0) {
      await client.query(`ALTER TABLE technicians ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    }
    
    // 3. Verificar e corrigir tabela services
    const checkServicesStructure = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'maquina_id'
    `);
    
    if (checkServicesStructure.rows.length === 0) {
      const checkMachineId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'machine_id'
      `);
      
      if (checkMachineId.rows.length > 0) {
        await client.query(`ALTER TABLE services RENAME COLUMN machine_id TO maquina_id;`);
      } else {
        await client.query(`ALTER TABLE services ADD COLUMN maquina_id VARCHAR(255);`);
      }
    }
    
    // Verificar descricao_servico
    const checkDescServico = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'descricao_servico'
    `);
    
    if (checkDescServico.rows.length === 0) {
      const checkDescription = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'description'
      `);
      
      if (checkDescription.rows.length > 0) {
        await client.query(`ALTER TABLE services RENAME COLUMN description TO descricao_servico;`);
      } else {
        await client.query(`ALTER TABLE services ADD COLUMN descricao_servico TEXT NOT NULL DEFAULT '';`);
      }
    }
    
    // Verificar data_agendamento
    const checkDataAgendamento = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'data_agendamento'
    `);
    
    if (checkDataAgendamento.rows.length === 0) {
      const checkScheduledDate = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'scheduled_date'
      `);
      
      if (checkScheduledDate.rows.length > 0) {
        await client.query(`ALTER TABLE services RENAME COLUMN scheduled_date TO data_agendamento;`);
      } else {
        await client.query(`ALTER TABLE services ADD COLUMN data_agendamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      }
    }
    
    // Verificar tecnico_id
    const checkTecnicoId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'tecnico_id'
    `);
    
    if (checkTecnicoId.rows.length === 0) {
      const checkTechnicianId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'technician_id'
      `);
      
      if (checkTechnicianId.rows.length > 0) {
        await client.query(`ALTER TABLE services RENAME COLUMN technician_id TO tecnico_id;`);
      } else {
        await client.query(`ALTER TABLE services ADD COLUMN tecnico_id VARCHAR(255);`);
      }
    }
    
    // Verificar e adicionar colunas faltantes em services
    const checkDataConclusao = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'data_conclusao'
    `);
    
    if (checkDataConclusao.rows.length === 0) {
      await client.query(`ALTER TABLE services ADD COLUMN data_conclusao TIMESTAMP;`);
    }
    
    const checkCusto = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'custo'
    `);
    
    if (checkCusto.rows.length === 0) {
      await client.query(`ALTER TABLE services ADD COLUMN custo NUMERIC(10, 2);`);
    }
    
    const checkServicesUpdatedAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'updated_at'
    `);
    
    if (checkServicesUpdatedAt.rows.length === 0) {
      await client.query(`ALTER TABLE services ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    }
    
    const checkDescProblema = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND column_name = 'descricao_problema'
    `);
    
    if (checkDescProblema.rows.length === 0) {
      await client.query(`ALTER TABLE services ADD COLUMN descricao_problema TEXT;`);
    }
    
    // 4. Verificar e corrigir foreign keys
    try {
      // Dropar constraints antigas se existirem
      await client.query(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_machine_id_fkey;`);
      await client.query(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_technician_id_fkey;`);
      
      // Criar constraints corretas
      await client.query(`
        ALTER TABLE services 
        ADD CONSTRAINT services_maquina_id_fkey 
        FOREIGN KEY (maquina_id) REFERENCES machines(id) ON DELETE CASCADE;
      `);
      await client.query(`
        ALTER TABLE services 
        ADD CONSTRAINT services_tecnico_id_fkey 
        FOREIGN KEY (tecnico_id) REFERENCES technicians(id) ON DELETE RESTRICT;
      `);
    } catch (error: any) {
    }
    
    // 5. Verificar e corrigir datas invÃ¡lidas
    try {
      // Corrigir datas invÃ¡lidas em machines
      const invalidMachineDates = await client.query(`
        SELECT id, installation_date 
        FROM machines 
        WHERE installation_date IS NULL 
           OR installation_date = 'Invalid Date'
           OR installation_date = ''
           OR installation_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      `);
      
      if (invalidMachineDates.rows.length > 0) {
        for (const row of invalidMachineDates.rows) {
          await client.query(`
            UPDATE machines 
            SET installation_date = CURRENT_TIMESTAMP 
            WHERE id = $1
          `, [row.id]);
        }
      }
      
      // Corrigir datas invÃ¡lidas em services
      const invalidServiceDates = await client.query(`
        SELECT id, data_agendamento 
        FROM services 
        WHERE data_agendamento IS NULL 
           OR data_agendamento = 'Invalid Date'
           OR data_agendamento = ''
           OR data_agendamento::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      `);
      
      if (invalidServiceDates.rows.length > 0) {
        for (const row of invalidServiceDates.rows) {
          await client.query(`
            UPDATE services 
            SET data_agendamento = CURRENT_TIMESTAMP 
            WHERE id = $1
          `, [row.id]);
        }
      }
    } catch (error: any) {
    }
    
    // 6. Criar dados de teste se necessÃ¡rio
    const checkTechCount = await client.query(`SELECT COUNT(*) as count FROM technicians;`);
    const techCount = parseInt(checkTechCount.rows[0]?.count || '0');
    
    const checkMachineCount = await client.query(`SELECT COUNT(*) as count FROM machines;`);
    const machineCount = parseInt(checkMachineCount.rows[0]?.count || '0');
    
    const checkServiceCount = await client.query(`SELECT COUNT(*) as count FROM services;`);
    const serviceCount = parseInt(checkServiceCount.rows[0]?.count || '0');
    
    if (techCount === 0) {
      await client.query(`
        INSERT INTO technicians (nome, especialidade, telefone, email, status) 
        VALUES ('Carlos Silva', 'Ar Condicionado', '(11) 99999-9999', 'carlos@teste.com', 'ATIVO')
        ON CONFLICT DO NOTHING;
      `);
    }
    
    if (machineCount === 0) {
      await client.query(`
        INSERT INTO machines (codigo, model, brand, type, capacity, voltage, location_type, location, branch, installation_date, status) 
        VALUES ('AR-001', 'Dual Inverter', 'LG', 'SPLIT', 9000, 'V220', 'SALA', 'Sala de ReuniÃµes 1', 'Matriz', CURRENT_TIMESTAMP, 'ATIVO')
        ON CONFLICT DO NOTHING;
      `);
    }
    
    if (serviceCount === 0 && techCount > 0 && machineCount > 0) {
      await client.query(`
        INSERT INTO services (
          tipo_servico, maquina_id, tecnico_id, tecnico_nome, 
          descricao_servico, data_agendamento, status, prioridade
        )
        SELECT 
          'PREVENTIVA',
          (SELECT id FROM machines LIMIT 1),
          (SELECT id FROM technicians LIMIT 1),
          (SELECT nome FROM technicians LIMIT 1),
          'ManutenÃ§Ã£o preventiva trimestral',
          CURRENT_TIMESTAMP + INTERVAL '7 days',
          'AGENDADO',
          'MEDIA'
        ON CONFLICT DO NOTHING;
      `);
    }
  } catch (error) {
    console.error('âŒ Erro ao inicializar banco de dados:', error);
  } finally {
    await client.end();
  }
}

export { initDatabase };

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch(console.error);
}

