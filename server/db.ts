import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Add debug logging to help diagnose environment variable issues
console.log('Checking database configuration...');

if (!process.env.DATABASE_URL) {
  console.error('Environment variables check failed:');
  console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check if the database is properly provisioned and environment variables are loaded.",
  );
}

console.log('Database configuration validated, connecting to database...');

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

console.log('Database connection established successfully');