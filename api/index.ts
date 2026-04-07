import app, { bootstrapServer } from '../server/index.js';

export default async function handler(req: any, res: any) {
  try {
    await bootstrapServer();
    return app(req, res);
  } catch (error: any) {
    console.error('[VERCEL] Falha ao inicializar API:', error);
    return res.status(500).json({
      success: false,
      error: 'Falha ao inicializar API',
      message: error?.message || 'Erro desconhecido',
    });
  }
}
