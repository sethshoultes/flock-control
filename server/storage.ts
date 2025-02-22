import { counts, users, type Count, type InsertCount, type User, type InsertUser } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";
import session from "express-session";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export interface IStorage {
  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | null>;
  validateUser(username: string, password: string): Promise<User | null>;

  // Count methods
  getCounts(userId: number): Promise<Count[]>;
  addCount(userId: number, count: InsertCount): Promise<Count>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private counts: Map<number, Count>;
  private currentUserId: number;
  private currentCountId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.counts = new Map();
    this.currentUserId = 1;
    this.currentCountId = 1;
    this.sessionStore = new (MemoryStore(session))({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const existing = await this.getUserByUsername(insertUser.username);
    if (existing) {
      throw new Error("Username already taken");
    }

    const id = this.currentUserId++;
    const hashedPassword = await hashPassword(insertUser.password);

    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      createdAt: new Date(),
    };

    this.users.set(id, user);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.username === username) || null;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return null;
    }
    return user;
  }

  async getCounts(userId: number): Promise<Count[]> {
    return Array.from(this.counts.values())
      .filter(count => count.userId === userId)
      .sort((a, b) => {
        const timeA = a.timestamp?.getTime() ?? 0;
        const timeB = b.timestamp?.getTime() ?? 0;
        return timeB - timeA;
      });
  }

  async addCount(userId: number, insertCount: InsertCount): Promise<Count> {
    const id = this.currentCountId++;
    const count: Count = {
      ...insertCount,
      id,
      userId,
      timestamp: new Date(),
      imageUrl: insertCount.imageUrl ?? null,
      breed: insertCount.breed ?? null,
      confidence: insertCount.confidence ?? null,
      labels: insertCount.labels ?? []
    };
    this.counts.set(id, count);
    return count;
  }
}

export const storage = new MemStorage();