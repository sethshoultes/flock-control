import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Request logging middleware
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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      status: err.status,
      code: err.code,
      details: err.details
    });

    // Format user-friendly error response
    const status = err.status || err.statusCode || 500;
    const errorResponse = {
      message: err.message || "Internal Server Error",
      code: err.code || 'INTERNAL_ERROR',
      details: err.details,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    };

    // Send appropriate error response
    res.status(status).json(errorResponse);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();