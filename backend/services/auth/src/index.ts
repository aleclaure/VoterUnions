/**
 * Auth Service - Main Entry Point
 * 
 * WebAuthn-based authentication service for United Unions
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { closeConnections, checkHealth } from './db/index.js';
import { registerRoutes } from './routes/register.js';
import { authRoutes } from './routes/auth.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// CORS configuration
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true,
});

// Rate limiting
await fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  }),
});

// Health check endpoint
fastify.get('/health', async () => {
  const health = await checkHealth();
  return {
    status: 'ok',
    service: 'auth',
    ...health,
  };
});

// Register routes
await fastify.register(registerRoutes);
await fastify.register(authRoutes);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await fastify.close();
  await closeConnections();
  process.exit(0);
});

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Auth service running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
