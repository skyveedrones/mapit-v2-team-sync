import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { tusRouter } from "../tusUploadRoute";
import { imageProxyRouter } from "../imageProxy";
import { initializeRedisClient, createPerUserRateLimiter, createUploadRateLimiter, createConcurrentRequestsLimiter, closeRedisClient } from "./rateLimiter";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Configure body parser with larger size limit for file uploads (1.5GB for base64 encoded 1GB files)
  app.use(express.json({ limit: "1500mb" }));
  app.use(express.urlencoded({ limit: "1500mb", extended: true }));
  
  // Custom error handler for payload too large errors - return JSON instead of HTML
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: {
          message: 'File too large. Maximum file size is 1GB.',
          code: 'PAYLOAD_TOO_LARGE'
        }
      });
    }
    next(err);
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Apply rate limiting middleware to tRPC routes
  app.use('/api/trpc', createPerUserRateLimiter());
  app.use('/api/trpc', createConcurrentRequestsLimiter());
  
  // TUS video upload routes (before body parser to handle raw streams)
  app.use("/api", tusRouter);
  app.use("/api/upload", createUploadRateLimiter());
  
  // Image proxy routes for bypassing CloudFront 403 errors
  app.use("/api", imageProxyRouter);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC Error] ${path}:`, error.message);
      },
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${port}/`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, closing connections...');
    server.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
  
  // Global error handlers
  process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught Exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup error:', error);
  process.exit(1);
});
