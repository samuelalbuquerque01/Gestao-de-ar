import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';

// Carregue o .env aqui também para garantir
dotenv.config();

// Use a DATABASE_URL do .env ou um valor padrão
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:1234@localhost:5432/neuropsicocentro_db';

console.log('🔌 [DATABASE] String de conexão (ocultada):', 
  connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: false,
  connectionTimeoutMillis: 10000,
});

// Adicione listeners para debug
pool.on('connect', () => {
  console.log('✅ [DATABASE] Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ [DATABASE] Erro na pool de conexões:', err.message);
});

// Teste a conexão ao inicializar
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ [DATABASE] Conexão testada com sucesso');
    console.log('📊 [DATABASE] Banco de dados:', client.database);
    console.log('👤 [DATABASE] Usuário:', client.user);
    console.log('🏠 [DATABASE] Host:', client.host);
    client.release();
  } catch (error: any) {
    console.error('❌ [DATABASE] Falha na conexão inicial:', error.message);
    console.error('🔧 [DATABASE] Dica: Verifique se:');
    console.error('   1. PostgreSQL está rodando');
    console.error('   2. Banco de dados existe');
    console.error('   3. Usuário/senha estão corretos');
    console.error('   4. Porta 5432 está aberta');
  }
})();

export const db = drizzle(pool, { schema });