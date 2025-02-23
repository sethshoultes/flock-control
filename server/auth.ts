import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { insertUserSchema, loginSchema, type User, UserRole } from "@shared/schema";
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

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport's Local Strategy
  passport.use(new LocalStrategy(async (username: string, password: string, done) => {
    try {
      const user = await storage.validateUser(username, password);
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);

      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser(data);

      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to login after registration" });
        }
        return res.status(201).json({
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          createdAt: user.createdAt,
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input: " + error.errors[0].message });
      } else {
        res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed" });
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        return res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          createdAt: user.createdAt,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to logout" });
      } else {
        res.sendStatus(200);
      }
    });
  });

  // User profile and settings endpoints
  app.get("/api/me", requireAuth, (req, res) => {
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      createdAt: user.createdAt,
    });
  });

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const settings = await storage.getUserSettings(user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const settings = await storage.updateUserSettings(user.id, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// Middleware to check if user is an admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || (req.user as User).role !== UserRole.ADMIN) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}