import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Add debug logging to help diagnose environment variable issues
console.log('Starting database initialization...');
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set',
  PGHOST: process.env.PGHOST ? 'Set' : 'Not Set',
  PGDATABASE: process.env.PGDATABASE ? 'Set' : 'Not Set',
  PGPORT: process.env.PGPORT ? 'Set' : 'Not Set',
  PGUSER: process.env.PGUSER ? 'Set' : 'Not Set',
  deployment: process.env.DEPLOYMENT ? 'Yes' : 'No'
});

if (!process.env.DATABASE_URL) {
  console.error('Critical Error: DATABASE_URL is not set');
  console.error('Available environment variables:', Object.keys(process.env));
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check if the database is properly provisioned and environment variables are loaded.",
  );
}

console.log('Initializing database connection pool...');

// Update connection configuration for both development and production
const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || process.env.DEPLOYMENT === 'true';

// Create connection pool with proper error handling
export const pool = new Pool({ 
  connectionString: isProduction 
    ? connectionString.replace(/^postgres:/, 'postgres:pooler') // Use pooler in production
    : connectionString,
  max: isProduction ? 10 : 20, // Reduce max connections in production
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000, // 5 second timeout
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  // Log additional details in production
  if (isProduction) {
    console.error('Production database error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
  }
  process.exit(-1);
});

console.log('Creating Drizzle ORM instance...');
export const db = drizzle(pool, { schema });

// Test the connection and log the result
(async () => {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    if (isProduction) {
      console.error('Production connection error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    throw error;
  }
})();

// Cleanup on application shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

console.log('Database initialization complete');