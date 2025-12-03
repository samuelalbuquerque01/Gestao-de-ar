// ========== CONFIGURAÇÃO .env ==========
import dotenv from 'dotenv';
import path from 'path';

// Configuração de ambiente simplificada para produção
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

// Carrega variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log('🔧 [ENV] PORT:', process.env.PORT);
console.log('🔧 [ENV] NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 [ENV] Node Version:', process.version);

// ========== IMPORTAÇÕES ==========
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// ========== CONFIGURAÇÃO CORS ==========
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://gestao-ar-condicionado.onrender.com',
      'https://*.onrender.com'
    ]
  : ['http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origem
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
      console.log(`❌ [CORS] Origem bloqueada: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ========== MIDDLEWARE DE LOG ==========
app.use((req, res, next) => {
  console.log(`🌐 [${process.env.NODE_ENV?.toUpperCase()}] ${req.method} ${req.path}`);
  next();
});

// ========== MIDDLEWARES ==========
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

// ========== LOGGING ==========
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
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

// ========== INICIALIZAÇÃO ==========
(async () => {
  try {
    log('🔧 [INIT] Iniciando servidor...');
    log(`📁 Ambiente: ${process.env.NODE_ENV}`);
    
    // Registra rotas
    await registerRoutes(httpServer, app);
    
    // Rota de debug
    app.get('/api/debug', (req, res) => {
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
    
    // Rota de health check (OBRIGATÓRIA para Render)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Gestão de Ar Condicionado',
        environment: process.env.NODE_ENV
      });
    });

    // Rota raiz
    app.get('/', (req, res) => {
      res.json({
        message: 'API Gestão de Ar Condicionado',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        documentation: '/api/debug',
        health: '/health'
      });
    });

    // Serve arquivos estáticos em produção
    if (process.env.NODE_ENV === "production") {
      const staticPath = path.resolve(process.cwd(), 'client/dist');
      console.log(`📂 Servindo arquivos estáticos de: ${staticPath}`);
      
      app.use(express.static(staticPath));
      
      // Fallback para SPA
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(staticPath, 'index.html'));
      });
      
      log('✅ Modo produção: arquivos estáticos habilitados');
    }

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        success: false,
        error: message,
        environment: process.env.NODE_ENV
      });
      console.error("❌ Erro do servidor:", err);
    });

    const port = parseInt(process.env.PORT || "10000", 10);
    
    // Render não precisa de host específico
    httpServer.listen(port, () => {
      log(`✅ Servidor rodando na porta ${port}`);
      log(`📁 Modo: ${process.env.NODE_ENV}`);
      log(`🚀 Aplicação pronta!`);
      log(`🔗 URL Local: http://localhost:${port}`);
      
      if (process.env.NODE_ENV === 'production') {
        log(`🌐 Acesse externamente na porta: ${port}`);
      }
    });

  } catch (error: any) {
    console.error("❌ Erro fatal ao iniciar servidor:");
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
})();