/**
 * Device Token Authentication Service
 *
 * Platform-Aware Authentication:
 * - Web: Uses @noble/curves for P-256 ECDSA
 * - Native (iOS/Android): Uses elliptic library (handled client-side)
 *
 * Both platforms use same backend endpoints but different crypto verification
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from 'dotenv';
import { registerRoutes } from './routes/auth';
import { registerDiagnosticRoutes } from './routes/diagnostic';
import { initDatabase } from './db';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Parse CORS origins from environment variable
 *
 * Production: Requires CORS_ORIGIN to be set (crashes if missing)
 * Development: Uses CORS_ORIGIN if set, otherwise allows all origins with warning
 *
 * @returns CORS origin configuration (string, string[], or boolean)
 */
function parseCorsOrigins(): string | string[] | boolean {
  const corsOrigin = process.env.CORS_ORIGIN;

  // Production: Require explicit configuration
  if (process.env.NODE_ENV === 'production') {
    if (!corsOrigin) {
      throw new Error(
        'CRITICAL SECURITY: CORS_ORIGIN must be set in production. ' +
        'Example: CORS_ORIGIN=https://voterunions.com,https://app.voterunions.com'
      );
    }

    // Parse comma-separated origins
    const origins = corsOrigin.split(',').map(o => o.trim()).filter(Boolean);

    if (origins.length === 0) {
      throw new Error('CRITICAL SECURITY: CORS_ORIGIN cannot be empty in production');
    }

    // Validate origins are HTTPS in production
    const invalidOrigins = origins.filter(o => !o.startsWith('https://') && !o.startsWith('http://localhost'));
    if (invalidOrigins.length > 0) {
      throw new Error(
        `CRITICAL SECURITY: Production CORS origins must use HTTPS: ${invalidOrigins.join(', ')}`
      );
    }

    return origins;
  }

  // Development: Use env var or allow all with warning
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map(o => o.trim()).filter(Boolean);
    return origins.length === 1 ? origins[0] : origins;
  }

  console.warn('⚠️  WARNING: CORS allows all origins - NOT SAFE FOR PRODUCTION');
  return '*';
}

// Initialize Fastify
const app = Fastify({
  logger: process.env.NODE_ENV === 'production'
    ? { level: process.env.LOG_LEVEL || 'info' } // JSON logging in production
    : { // Pretty logging in development
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
});

async function start() {
  try {
    // Register plugins
    await app.register(helmet, {
      contentSecurityPolicy: false, // Allow for API
    });

    // Register CORS with environment-aware configuration
    await app.register(cors, {
      origin: parseCorsOrigins(),
      credentials: true,
    });

    // Initialize database
    await initDatabase();
    app.log.info('Database initialized');

    // Register routes
    await registerRoutes(app);
    app.log.info('Routes registered');

    // Register diagnostic routes (development only)
    if (process.env.NODE_ENV !== 'production') {
      await registerDiagnosticRoutes(app);
      app.log.warn('⚠️  Diagnostic routes enabled (DEVELOPMENT MODE)');
    }

    // Health check
    app.get('/health', async () => {
      return {
        status: 'healthy',
        service: 'auth',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      };
    });

    // Start server
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Auth service listening on ${HOST}:${PORT}`);
    app.log.info(`Build timestamp: ${new Date().toISOString()}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('SIGINT received, shutting down gracefully...');
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully...');
  await app.close();
  process.exit(0);
});

start();
