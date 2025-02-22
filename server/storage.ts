import { counts, users, type Count, type InsertCount, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
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
  if (!hashed || !salt) {
    throw new Error("Invalid password format");
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    console.log('Initializing DatabaseStorage and session store...');
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    console.log('Session store initialized successfully');
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('Creating new user:', insertUser.username);
    try {
      const existing = await this.getUserByUsername(insertUser.username);
      if (existing) {
        throw new Error("Username already taken");
      }

      const hashedPassword = await hashPassword(insertUser.password);
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          password: hashedPassword,
        })
        .returning();

      console.log('User created successfully:', user.id);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    console.log('Getting user by ID:', id);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      return user || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    console.log('Getting user by username:', username);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      return user || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    console.log('Validating user:', username);
    try {
      const user = await this.getUserByUsername(username);
      if (!user) {
        return null;
      }

      const isValid = await comparePasswords(password, user.password);
      return isValid ? user : null;
    } catch (error) {
      console.error('Password validation error:', error);
      return null;
    }
  }

  async getCounts(userId: number): Promise<Count[]> {
    console.log('Getting counts for user:', userId);
    try {
      const results = await db
        .select()
        .from(counts)
        .where(eq(counts.userId, userId))
        .orderBy(counts.timestamp);

      console.log(`Found ${results.length} counts for user ${userId}`);
      return results;
    } catch (error) {
      console.error('Error getting counts:', error);
      throw error;
    }
  }

  async addCount(userId: number, insertCount: InsertCount): Promise<Count> {
    console.log('Adding new count for user:', userId, insertCount);
    try {
      const [count] = await db
        .insert(counts)
        .values({
          ...insertCount,
          userId,
          timestamp: new Date(),
        })
        .returning();

      console.log('Count added successfully:', count.id);
      return count;
    } catch (error) {
      console.error('Error adding count:', error);
      throw error;
    }
  }

  async deleteCounts(userId: number, countIds: number[]): Promise<void> {
    console.log('Deleting counts for user:', userId, 'count IDs:', countIds);
    try {
      await db
        .delete(counts)
        .where(
          and(
            eq(counts.userId, userId),
            inArray(counts.id, countIds)
          )
        );
      console.log('Counts deleted successfully');
    } catch (error) {
      console.error('Error deleting counts:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();