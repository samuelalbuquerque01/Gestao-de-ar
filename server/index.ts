import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDatabase } from './init-db.js';
import { updateDatabase } from './update-db.js';
import { registerRoutes } from './routes.js';

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app = express();
const httpServer = createServer(app);
const isServerlessRuntime = process.env.VERCEL === '1';

let listening = false;
let bootstrapPromise: Promise<void> | null = null;

function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`[${formattedTime}] [${source}] ${message}`);
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesOrigin(origin: string, allowed: string) {
  if (allowed === '*') {
    return true;
  }

  if (!allowed.includes('*')) {
    return origin === allowed;
  }

  const pattern = `^${allowed.split('*').map(escapeRegex).join('.*')}$`;
  return new RegExp(pattern).test(origin);
}

function getAllowedOrigins() {
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (envOrigins.length > 0) {
    return envOrigins;
  }

  if (process.env.NODE_ENV === 'production') {
    const defaults = ['https://*.vercel.app'];

    if (process.env.PUBLIC_APP_URL) {
      defaults.push(process.env.PUBLIC_APP_URL);
    }

    if (process.env.VERCEL_URL) {
      defaults.push(`https://${process.env.VERCEL_URL}`);
    }

    return defaults;
  }

  return ['http://localhost:5000', 'http://127.0.0.1:5000'];
}

async function initializeDatabase() {
  try {
    await initDatabase();
    await updateDatabase();
  } catch (error) {
    console.error('[ERRO] Falha ao inicializar banco de dados:', error);
  }
}

function configureMiddlewares() {
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.some((allowed) => matchesOrigin(origin, allowed))) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
      limit: '10mb',
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const requestPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined;

    const originalResJson = res.json;
    res.json = function jsonOverride(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (requestPath.startsWith('/api')) {
        let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 100)}...`;
        }
        log(logLine);
      }
    });

    next();
  });
}

function configureFrontendFallback() {
  if (isServerlessRuntime) {
    // No Vercel, o frontend e servido pelo output estatico do projeto.
    return;
  }

  let frontendEnabled = false;
  let staticPath = '';

  if (process.env.NODE_ENV === 'production') {
    const possiblePaths = [
      path.resolve(process.cwd(), 'client/dist'),
      path.resolve(process.cwd(), 'dist'),
      path.resolve(process.cwd(), 'dist/public'),
      path.resolve(process.cwd(), 'public'),
    ];

    for (const possiblePath of possiblePaths) {
      if (!fs.existsSync(possiblePath)) {
        continue;
      }

      const files = fs.readdirSync(possiblePath);
      if (files.includes('index.html')) {
        staticPath = possiblePath;
        frontendEnabled = true;
        break;
      }
    }

    if (frontendEnabled) {
      app.use(express.static(staticPath));
      log('Frontend habilitado para producao');
    } else {
      app.get('/', (_req, res) => {
        res.json({
          message: 'API Gestao de Ar Condicionado',
          warning: 'Frontend nao encontrado - verifique se o build foi feito corretamente',
          api_endpoints: '/api/observacao',
          health_check: '/health',
        });
      });
    }
  }

  if (process.env.NODE_ENV === 'production' && frontendEnabled) {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }

      const indexPath = path.resolve(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }

      return res.status(404).json({
        error: 'Frontend nao encontrado',
        message: 'O arquivo index.html nao foi encontrado',
      });
    });
  } else if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          error: 'Rota API nao encontrada',
          path: req.path,
        });
      }

      return res.json({
        message: 'Frontend nao disponivel',
        reason: 'O build do frontend nao foi encontrado',
        api_documentation: '/api/observacao',
      });
    });
  } else {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          error: 'Rota API nao encontrada',
          path: req.path,
        });
      }

      return res.json({
        message: 'Frontend nao servido por este servidor em desenvolvimento',
        instruction: 'Execute o frontend separadamente: cd client && npm run dev',
        frontend_url: 'http://localhost:5000',
      });
    });
  }
}

function configureErrorHandler() {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
      success: false,
      error: message,
      environment: process.env.NODE_ENV,
    });

    console.error('[ERRO] Erro do servidor:', err);
  });
}

function getPublicBaseUrl(port: number) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${port}`;
}

function startHttpServer() {
  if (listening) {
    return;
  }

  const port = parseInt(process.env.PORT || '10000', 10);
  const publicBaseUrl = getPublicBaseUrl(port);

  httpServer.listen(port, () => {
    listening = true;
    log(`Servidor rodando na porta ${port}`);
    log(`Modo: ${process.env.NODE_ENV}`);
    log('Aplicacao pronta!');
    log(`API disponivel em: ${publicBaseUrl}/api/observacao`);
  });
}

export async function bootstrapServer(options?: { startListening?: boolean }) {
  const startListening = options?.startListening ?? false;

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      log('Iniciando servidor...');
      log(`Ambiente: ${process.env.NODE_ENV}`);

      configureMiddlewares();

      await initializeDatabase();
      await registerRoutes(httpServer, app);

      app.get('/api/observacao', (_req, res) => {
        res.json({
          success: true,
          message: 'API funcionando',
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          endpoints: [
            '/api/test',
            '/api/auth/login',
            '/api/auth/register',
            '/api/technicians',
            '/api/machines',
            '/api/services',
            '/api/dashboard/stats',
          ],
        });
      });

      app.get('/health', (_req, res) => {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'Gestao de Ar Condicionado',
          environment: process.env.NODE_ENV,
        });
      });

      configureFrontendFallback();
      configureErrorHandler();

    })();
  }

  await bootstrapPromise;

  if (startListening && !listening) {
    startHttpServer();
  }
}

if (!isServerlessRuntime) {
  void bootstrapServer({ startListening: true }).catch((error: any) => {
    console.error('[ERRO] Erro fatal ao iniciar servidor:');
    console.error('Mensagem:', error?.message);
    console.error('Stack:', error?.stack);
    process.exit(1);
  });
}

export { app };
export default app;
