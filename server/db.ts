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
});

if (!process.env.DATABASE_URL) {
  console.error('Critical Error: DATABASE_URL is not set');
  console.error('Available environment variables:', Object.keys(process.env));
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check if the database is properly provisioned and environment variables are loaded.",
  );
}

console.log('Initializing database connection pool...');

// Create connection pool with proper error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20 // Maximum number of clients in the pool
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  process.exit(-1);
});

console.log('Creating Drizzle ORM instance...');
export const db = drizzle({ client: pool, schema });

// Test the connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
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