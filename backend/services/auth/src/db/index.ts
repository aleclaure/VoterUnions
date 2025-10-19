/**
 * Database Connection Pool
 */

import pg from 'pg';
import Redis from 'ioredis';

const { Pool } = pg;

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client for challenge storage
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Graceful shutdown
export async function closeConnections() {
  await pool.end();
  await redis.quit();
}

// Health check
export async function checkHealth() {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    return { database: 'ok', redis: 'ok' };
  } catch (error) {
    throw new Error('Health check failed: ' + (error as Error).message);
  }
}
