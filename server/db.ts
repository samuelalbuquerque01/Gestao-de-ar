import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Carregue o .env aqui tamb?m para garantir
dotenv.config();

// Use a DATABASE_URL do .env ou um valor padr?o
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
  console.error('[ERRO] [DATABASE] Erro na pool de conexoes:', err.message);
});

// Teste a conexao ao inicializar
(async () => {
  try {
    const client = await pool.connect();
    client.release();
  } catch (error: any) {
    console.error('[ERRO] [DATABASE] Falha na conexao inicial:', error.message);
    console.error('[INIT] [DATABASE] Dica: Verifique se:');
    console.error('   1. PostgreSQL esta rodando');
    console.error('   2. Banco de dados existe');
    console.error('   3. Usuario/senha estao corretos');
    console.error('   4. Porta 5432 esta aberta');
  }
})();

export const db = drizzle(pool, { schema });

