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
  const isProduction = process.env.NODE_ENV === "production";
  console.log('Setting up auth with production mode:', isProduction);

  app.set("trust proxy", 1);

  // Ensure cookie settings work in development and production
  const sessionSettings: session.SessionOptions = {
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    name: 'chicken_counter_session',
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  console.log('Session settings:', {
    isProduction,
    cookieSettings: sessionSettings.cookie
  });

  app.use(session(sessionSettings));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport's Local Strategy
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
  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUserById(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Authentication routes with improved error handling
  app.post("/api/register", async (req, res) => {
    try {
      console.log('Registration attempt:', req.body.username);
      const data = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);

      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser(data);

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
    console.log('Logout request received');
    if (req.isAuthenticated()) {
      console.log('User was authenticated, performing logout');
      const username = (req.user as User)?.username;
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        console.log('Logout successful for:', username);
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          res.clearCookie('chicken_counter_session');
          res.sendStatus(200);
        });
      });
    } else {
      console.log('Logout requested but user was not authenticated');
      res.sendStatus(200);
    }
  });

  // User data endpoint
  app.get("/api/me", requireAuth, (req, res) => {
    console.log('Fetching user data, isAuthenticated:', req.isAuthenticated());
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      createdAt: user.createdAt,
    });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check - isAuthenticated:', req.isAuthenticated());
  if (!req.isAuthenticated()) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('Admin check - isAuthenticated:', req.isAuthenticated(), 'role:', (req.user as User)?.role);
  if (!req.isAuthenticated() || (req.user as User).role !== UserRole.ADMIN) {
    console.log('Unauthorized admin access attempt');
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}