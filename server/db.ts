import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Add debug logging
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

// Connection configuration for both development and production
const isProduction = process.env.NODE_ENV === 'production' || process.env.DEPLOYMENT === 'true';

// Create connection pool with proper error handling
const connectionConfig = {
  connectionString: isProduction 
    ? process.env.DATABASE_URL.replace(/^postgres:/, 'postgres:pooler') // Use connection pooling in production
    : process.env.DATABASE_URL,
  ssl: isProduction 
    ? { 
        rejectUnauthorized: false,
        // Add specific SSL options for production if needed
      } 
    : undefined,
  max: isProduction ? 10 : 20, // Reduce max connections in production
  idleTimeoutMillis: 30000, // Timeout idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Connection timeout after 5 seconds
};

console.log('Connection config (sanitized):', {
  ...connectionConfig,
  connectionString: connectionConfig.connectionString ? 'Set' : 'Not Set',
  ssl: connectionConfig.ssl ? 'Configured' : 'Not Set'
});

// Create connection pool
export const pool = new Pool(connectionConfig);

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  if (isProduction) {
    console.error('Production database error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
  }
  // Don't exit in production, just log the error
  if (!isProduction) {
    process.exit(-1);
  }
});

console.log('Creating Drizzle ORM instance...');
export const db = drizzle(pool, { schema });

// Test the connection
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
    // Don't throw in production, just log the error
    if (!isProduction) {
      throw error;
    }
  }
})();

// Cleanup on application shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

console.log('Database initialization complete');