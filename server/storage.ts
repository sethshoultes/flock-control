import { counts, users, type Count, type InsertCount, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

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

const PostgresSessionStore = connectPg(session);

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

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const existing = await this.getUserByUsername(insertUser.username);
    if (existing) {
      throw new Error("Username already taken");
    }

    // Hash the password before storing
    const hashedPassword = await hashPassword(insertUser.password);

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();

    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    return user || null;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return null;
    }
    return user;
  }

  async getCounts(userId: number): Promise<Count[]> {
    return db
      .select()
      .from(counts)
      .where(eq(counts.userId, userId))
      .orderBy(counts.timestamp);
  }

  async addCount(userId: number, insertCount: InsertCount): Promise<Count> {
    const [count] = await db
      .insert(counts)
      .values({
        ...insertCount,
        userId,
        timestamp: new Date(),
      })
      .returning();

    return count;
  }
}

export const storage = new DatabaseStorage();