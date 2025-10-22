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

    // Allow all origins for development (CORS)
    await app.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
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
