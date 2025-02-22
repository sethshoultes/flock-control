import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function setupAuth(app: Express) {
  // Session middleware
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
    })
  );

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);

      // Start session
      req.session.userId = user.id;

      res.status(201).json({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input: " + error.errors[0].message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(username, password);

      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Start session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input: " + error.errors[0].message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        res.status(500).json({ error: "Failed to logout" });
      } else {
        res.sendStatus(200);
      }
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({ userId: req.session.userId });
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}