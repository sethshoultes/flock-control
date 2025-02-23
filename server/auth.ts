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
  const isProduction = process.env.NODE_ENV === "production" || process.env.DEPLOYMENT === "true";
  console.log('Setting up auth with production mode:', isProduction);

  app.set("trust proxy", 1);

  const sessionSettings: session.SessionOptions = {
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    name: 'chicken_counter_session', // Custom name to avoid conflicts
    proxy: true, // Required for secure cookies behind a proxy
    cookie: {
      secure: isProduction, // Must be true in production
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax', // Required for cross-origin in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      domain: isProduction ? '.replit.app' : undefined
    },
  };

  console.log('Session settings:', {
    isProduction,
    cookieSettings: {
      secure: sessionSettings.cookie?.secure,
      sameSite: sessionSettings.cookie?.sameSite,
      domain: sessionSettings.cookie?.domain
    }
  });

  app.use(session(sessionSettings));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport's Local Strategy with better error handling
  passport.use(new LocalStrategy(async (username: string, password: string, done) => {
    try {
      console.log('Attempting authentication for user:', username);
      const user = await storage.validateUser(username, password);
      if (!user) {
        console.log('Authentication failed for user:', username);
        return done(null, false, { message: "Invalid username or password" });
      }
      console.log('Authentication successful for user:', username);
      return done(null, user);
    } catch (error) {
      console.error('Authentication error:', error);
      return done(error);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  // Deserialize user from the session with better error handling
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUserById(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Add CORS headers for authentication endpoints in production
  if (isProduction) {
    app.use((req, res, next) => {
      const origin = req.get('origin');
      // Only allow requests from .replit.app domains
      if (origin?.endsWith('.replit.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      }
      next();
    });
  }

  // Authentication routes with improved error handling
  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration attempt:', req.body.username);
      const data = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);

      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser({
        ...data,
        role: UserRole.USER // Ensure new users get the default user role
      });

      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return res.status(500).json({ error: "Failed to login after registration" });
        }
        console.log('Registration and login successful for:', user.username);
        return res.status(201).json({
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          createdAt: user.createdAt,
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input: " + error.errors[0].message });
      } else {
        res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed" });
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', req.body.username);
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        console.log('Login failed for user:', req.body.username);
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return res.status(500).json({ error: "Login failed" });
        }
        console.log('Login successful for:', user.username);
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
    const username = (req.user as User)?.username;
    console.log('Logout attempt for user:', username);
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: "Failed to logout" });
      } else {
        console.log('Logout successful for:', username);
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          res.sendStatus(200);
        });
      }
    });
  });

  // User profile and settings endpoints
  app.get("/api/me", requireAuth, (req, res) => {
    const user = req.user as User;
    console.log('Fetching profile for user:', user.username);
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
      console.log('Fetching settings for user:', user.username);
      const settings = await storage.getUserSettings(user.id);
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      console.log('Updating settings for user:', user.username);
      const settings = await storage.updateUserSettings(user.id, req.body);
      res.json(settings);
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Unauthorized access attempt');
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || (req.user as User).role !== UserRole.ADMIN) {
    console.log('Unauthorized admin access attempt');
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}