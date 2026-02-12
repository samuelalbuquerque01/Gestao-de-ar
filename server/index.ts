//  CONFIGURACAO .env 
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Configuracao de ambiente simplificada para producao
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

// Carrega variaveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
//  INICIALIZACAO DO BANCO 
import { initDatabase } from './init-db.js';
import { updateDatabase } from './update-db.js'; // IMPORTE A ATUALIZACAO

async function initializeDatabase() {
  try {
    await initDatabase(); // Cria tabelas se nao existirem
    await updateDatabase(); // Adiciona colunas faltantes
  } catch (error) {
    console.error('[ERRO] Falha ao inicializar banco de dados:', error);
    // Nao saia do processo, apenas log o erro
  }
}

//  IMPORTACOES 
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

//  CONFIGURACAO CORS 
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://gestao-de-ar.onrender.com',
      'https://*.onrender.com'
    ]
  : ['http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisicoes sem origem
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.startsWith('*')) {
        const domain = allowed.replace('*.', '');
        return origin.endsWith(domain);
      }
      return origin === allowed;
    })) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

//  MIDDLEWARE DE LOG 
app.use((req, res, next) => {
  next();
});

//  MIDDLEWARES 
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '10mb'
  }),
);

app.use(express.urlencoded({ extended: false }));

//  LOGGING 
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 100)}...`;
      }
      log(logLine);
    }
  });

  next();
});

//  INICIALIZACAO 
(async () => {
  try {
    log('[INIT] [INIT] Iniciando servidor...');
    log(`[INFO] Ambiente: ${process.env.NODE_ENV}`);
    
//  INICIALIZACAO 
    await initializeDatabase();
    
    // Registra rotas de API
    await registerRoutes(httpServer, app);
    
    // Rota de observacao da API
    app.get('/api/observacao', (req, res) => {
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
          '/api/dashboard/stats'
        ]
      });
    });
    
    // Rota de health check (OBRIGATORIA para Render)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Gestao de Ar Condicionado',
        environment: process.env.NODE_ENV
      });
    });

//  CONFIGURACAO DO FRONTEND 
    let frontendEnabled = false;
    let staticPath = '';
    
    if (process.env.NODE_ENV === "production") {
      // Possiveis locais onde o frontend pode estar
      const possiblePaths = [
        path.resolve(process.cwd(), 'client/dist'),
        path.resolve(process.cwd(), 'dist'),
        path.resolve(process.cwd(), 'dist/public'),
        path.resolve(process.cwd(), 'public'),
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          const files = fs.readdirSync(possiblePath);
          if (files.includes('index.html')) {
            staticPath = possiblePath;
            frontendEnabled = true;
            break;
          }
        }
      }
      
      if (frontendEnabled) {
        app.use(express.static(staticPath));
        log('[OK] Frontend habilitado para producao');
      } else {
        // Rota raiz informativa
        app.get('/', (req, res) => {
          res.json({
            message: 'API Gestao de Ar Condicionado',
            warning: 'Frontend nao encontrado - verifique se o build foi feito corretamente',
            api_endpoints: '/api/observacao',
            health_check: '/health'
          });
        });
      }
    }

    //  ROTAS FALLBACK 
    if (process.env.NODE_ENV === "production" && frontendEnabled) {
      // Em producao com frontend: Serve o frontend para todas as rotas nao-API
      app.get('*', (req, res, next) => {
        // Se e uma rota de API, passa para o proximo middleware (error handler)
        if (req.path.startsWith('/api')) {
          return next();
        }
        
        // Serve o index.html para todas as outras rotas
        const indexPath = path.resolve(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).json({
            error: 'Frontend nao encontrado',
            message: 'O arquivo index.html nao foi encontrado'
          });
        }
      });
    } else if (process.env.NODE_ENV === "production") {
      // Em producao sem frontend: Apenas API
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ 
            error: 'Rota API nao encontrada',
            path: req.path 
          });
        }
        
        res.json({
          message: 'Frontend nao disponivel',
          reason: 'O build do frontend nao foi encontrado',
          api_documentation: '/api/observacao'
        });
      });
    } else {
      // Em desenvolvimento: Informa que o frontend roda separadamente
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          // Rota API nao encontrada
          return res.status(404).json({ 
            error: 'Rota API nao encontrada',
            path: req.path 
          });
        }
        
        res.json({
          message: 'Frontend nao servido por este servidor em desenvolvimento',
          instruction: 'Execute o frontend separadamente: cd client && npm run dev',
          frontend_url: 'http://localhost:5000'
        });
      });
    }

    // Error handler - So ? alcancado para rotas /api nao tratadas
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        success: false,
        error: message,
        environment: process.env.NODE_ENV
      });
      console.error("[ERRO] Erro do servidor:", err);
    });

    const port = parseInt(process.env.PORT || "10000", 10);
    
    // Render nao precisa de host especifico
    httpServer.listen(port, () => {
      log(`[OK] Servidor rodando na porta ${port}`);
      log(`[INFO] Modo: ${process.env.NODE_ENV}`);
      log(`[START] Aplicacao pronta!`);
      
      if (process.env.NODE_ENV === 'production' && frontendEnabled) {
        log(`[WEB] Frontend disponivel em: https://gestao-de-ar.onrender.com`);
      }
      log(`[WEB] API disponivel em: https://gestao-de-ar.onrender.com/api/observacao`);
    });

  } catch (error: any) {
    console.error("[ERRO] Erro fatal ao iniciar servidor:");
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
})();

