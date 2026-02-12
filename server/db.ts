import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Carregue o .env aqui tambÃ©m para garantir
dotenv.config();

// Use a DATABASE_URL do .env ou um valor padrÃ£o
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:1234@localhost:5432/neuropsicocentro_db';
const pool = new Pool({
  connectionString,
  ssl: false,
  connectionTimeoutMillis: 10000,
});

// Adicione listeners para observacao
pool.on('connect', () => {
});

pool.on('error', (err) => {
  console.error('âŒ [DATABASE] Erro na pool de conexÃµes:', err.message);
});

// Teste a conexÃ£o ao inicializar
(async () => {
  try {
    const client = await pool.connect();
    client.release();
  } catch (error: any) {
    console.error('âŒ [DATABASE] Falha na conexÃ£o inicial:', error.message);
    console.error('ðŸ”§ [DATABASE] Dica: Verifique se:');
    console.error('   1. PostgreSQL estÃ¡ rodando');
    console.error('   2. Banco de dados existe');
    console.error('   3. UsuÃ¡rio/senha estÃ£o corretos');
    console.error('   4. Porta 5432 estÃ¡ aberta');
  }
})();

export const db = drizzle(pool, { schema });

