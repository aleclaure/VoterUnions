# Auth Service Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## Development Setup

### 1. Install Dependencies

```bash
cd backend/services/auth
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for signing JWTs (must be strong in production!)
- `RP_ID` - Your domain (e.g., `united-unions.com`)
- `RP_ORIGIN` - Your app's origin (e.g., `https://united-unions.com`)

### 3. Set Up Database

```bash
# Run migration to create tables
npm run db:migrate
```

This creates three tables:
- `users` - User accounts (UUID only, no PII)
- `webauthn_credentials` - WebAuthn credentials (passkeys)
- `sessions` - Refresh token sessions

### 4. Start Development Server

```bash
npm run dev
```

Server will start on http://localhost:3001

Test health endpoint:
```bash
curl http://localhost:3001/health
```

## Production Deployment

### 1. Build Application

```bash
npm run build
```

### 2. Set Production Environment Variables

```bash
export NODE_ENV=production
export PORT=3001
export DATABASE_URL="postgresql://user:pass@prod-db:5432/auth"
export REDIS_URL="redis://prod-redis:6379"
export JWT_SECRET="your-super-secret-production-key"
export RP_ID="united-unions.com"
export RP_ORIGIN="https://united-unions.com"
export CORS_ORIGIN="https://united-unions.com"
```

### 3. Start Production Server

```bash
npm start
```

### 4. Verify Deployment

```bash
curl https://auth.united-unions.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "auth",
  "database": "ok",
  "redis": "ok"
}
```

## Docker Deployment (Optional)

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY src/db/schema.sql ./src/db/

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

### 2. Build Image

```bash
docker build -t united-unions/auth-service:latest .
```

### 3. Run Container

```bash
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  -e JWT_SECRET="..." \
  --name auth-service \
  united-unions/auth-service:latest
```

## Monitoring

### Health Check

GET `/health` returns service status:

```json
{
  "status": "ok",
  "service": "auth",
  "database": "ok",
  "redis": "ok"
}
```

### Logs

The service logs to stdout/stderr. In production, pipe logs to your monitoring service:

```bash
npm start | tee -a /var/log/auth-service.log
```

### Metrics to Monitor

1. **Request Rate** - Track requests per second
2. **Error Rate** - Should be <1%
3. **Response Time** - Should be <100ms
4. **Database Connections** - Monitor pool usage
5. **Redis Connections** - Monitor connection count
6. **JWT Token Generation** - Track token issuance rate

## Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ random characters)
- [ ] Set correct `RP_ID` (your domain)
- [ ] Set correct `RP_ORIGIN` (your app URL)
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall to restrict database/Redis access
- [ ] Set up rate limiting (already configured)
- [ ] Enable CORS with specific origin (already configured)
- [ ] Rotate JWT secret regularly
- [ ] Monitor failed authentication attempts
- [ ] Set up automated backups for PostgreSQL
- [ ] Use connection pooling (already configured)

## Troubleshooting

### Database Connection Fails

```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### Redis Connection Fails

```bash
# Check REDIS_URL is correct
echo $REDIS_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

### WebAuthn Verification Fails

1. Check `RP_ID` matches your domain
2. Check `RP_ORIGIN` matches your app URL (including protocol)
3. Verify HTTPS is enabled in production
4. Check browser console for WebAuthn errors

### Rate Limiting Too Aggressive

Adjust in `.env`:
```bash
RATE_LIMIT_MAX=20  # Increase from 10
RATE_LIMIT_WINDOW=15m  # Keep window
```

## Maintenance

### Clean Up Expired Sessions

Run periodically (e.g., daily cron job):

```sql
DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
```

### Rotate JWT Secret

1. Generate new secret: `openssl rand -hex 32`
2. Update `JWT_SECRET` environment variable
3. Restart service
4. All existing tokens will be invalidated (users must re-authenticate)

### Database Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20250101.sql
```

## Performance Tuning

### PostgreSQL

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 100;

-- Enable query caching
ALTER SYSTEM SET shared_buffers = '256MB';
```

### Redis

```bash
# Increase max memory
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Node.js

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

## Next Steps

After deploying the auth service:

1. Deploy other microservices (union, voting, messaging, dm, media)
2. Integrate frontend Expo app with auth service
3. Test WebAuthn registration on iOS and Android
4. Set up monitoring and alerting
5. Configure automated backups
6. Plan for Week 6 gradual rollout (10% → 100%)
