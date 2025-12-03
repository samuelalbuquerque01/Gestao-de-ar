// ========== CONFIGURAÇÃO .env ==========
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('🔧 [ENV] PORT:', process.env.PORT);
console.log('🔧 [ENV] NODE_ENV:', process.env.NODE_ENV);

// ========== IMPORTAÇÕES ==========
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// ========== CONFIGURAÇÃO CORS SIMPLIFICADA ==========
app.use(cors({
  origin: ['http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ========== MIDDLEWARE DE LOG ==========
app.use((req, res, next) => {
  console.log(`🌐 [API] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
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
    
    // Registra rotas
    await registerRoutes(httpServer, app);
    
    // Rota de debug
    app.get('/api/debug', (req, res) => {
      res.json({
        success: true,
        message: 'API funcionando',
        timestamp: new Date().toISOString(),
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
    
    // Rota de health check
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        success: false,
        error: message 
      });
      console.error("❌ Erro do servidor:", err);
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5001", 10);
    
    httpServer.listen(port, "127.0.0.1", () => {
      log(`✅ Servidor rodando em http://127.0.0.1:${port}`);
      log(`📁 Modo: ${process.env.NODE_ENV}`);
      log(`🌐 CORS permitido para: localhost:5000, 127.0.0.1:5000`);
      log(`🔌 Proxy Vite: localhost:5000 → 127.0.0.1:${port}`);
    });

  } catch (error) {
    console.error("❌ Erro fatal ao iniciar servidor:", error);
    process.exit(1);
  }
})();