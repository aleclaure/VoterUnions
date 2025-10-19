# Auth Service - WebAuthn Authentication

Privacy-first authentication service for United Unions using WebAuthn (passkeys, biometrics, hardware keys).

## Features

- 🔐 **WebAuthn Authentication** - No passwords, no email collection
- 🔑 **JWT Tokens** - Access tokens (15min) + refresh tokens (30 days)
- 🛡️ **Security Features** - Rate limiting, CORS, input validation
- 📊 **PostgreSQL** - User accounts and credential storage
- ⚡ **Redis** - Temporary challenge storage
- 🚀 **Fast** - Built with Fastify

## Architecture

```
POST /auth/register/init    → Generate registration challenge
POST /auth/register/verify  → Verify credential, create user, issue tokens

POST /auth/login/init       → Generate authentication challenge  
POST /auth/login/verify     → Verify credential, issue tokens

POST /auth/refresh          → Refresh access token
POST /auth/logout           → Invalidate refresh token

GET  /health                → Health check
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Set Up Database

```bash
# Start PostgreSQL (or use existing instance)
# Update DATABASE_URL in .env

# Run migration
npm run db:migrate
```

### 4. Start Redis

```bash
# Start Redis (or use existing instance)
# Update REDIS_URL in .env
```

### 5. Run Development Server

```bash
npm run dev
```

Server runs on http://localhost:3001

## Database Schema

### users
- `id` (UUID) - Primary key
- `created_at` - Account creation timestamp
- `last_login_at` - Last successful login

### webauthn_credentials
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `credential_id` (TEXT) - WebAuthn credential ID
- `public_key` (TEXT) - Public key for verification
- `counter` (BIGINT) - Signature counter (replay protection)
- `transports` (TEXT[]) - Supported transports
- `created_at` - Credential registration timestamp

### sessions
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `refresh_token` (TEXT) - Refresh token
- `expires_at` - Token expiration timestamp
- `created_at` - Session creation timestamp

## Security Features

1. **Rate Limiting** - 10 requests per 15 minutes per IP
2. **CORS** - Configured origin restrictions
3. **Input Validation** - Zod schema validation
4. **Challenge Expiry** - 5-minute TTL on Redis challenges
5. **Counter Verification** - Replay attack protection
6. **Token Expiry** - Short-lived access tokens

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection string |
| `JWT_SECRET` | - | Secret for signing JWTs |
| `JWT_ACCESS_EXPIRY` | 15m | Access token expiry |
| `JWT_REFRESH_EXPIRY` | 30d | Refresh token expiry |
| `RP_NAME` | United Unions | Relying Party name |
| `RP_ID` | localhost | Relying Party ID (domain) |
| `RP_ORIGIN` | http://localhost:5000 | Expected origin |
| `RATE_LIMIT_MAX` | 10 | Max requests per window |
| `RATE_LIMIT_WINDOW` | 15m | Rate limit time window |
| `CORS_ORIGIN` | http://localhost:5000 | Allowed CORS origin |

## Development

```bash
# Watch mode (auto-restart on changes)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Lint
npm run lint

# Run migration
npm run db:migrate
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure proper `RP_ID` and `RP_ORIGIN`
4. Use production PostgreSQL and Redis instances
5. Enable SSL/TLS
6. Set up monitoring and logging

## API Examples

### Registration Flow

```javascript
// 1. Initialize registration
const initResponse = await fetch('http://localhost:3001/auth/register/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceName: 'My iPhone' }),
});
const { userId, options } = await initResponse.json();

// 2. Create credential with WebAuthn API (browser)
const credential = await navigator.credentials.create({
  publicKey: options,
});

// 3. Verify credential
const verifyResponse = await fetch('http://localhost:3001/auth/register/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, credential }),
});
const { accessToken, refreshToken } = await verifyResponse.json();
```

### Authentication Flow

```javascript
// 1. Initialize authentication
const initResponse = await fetch('http://localhost:3001/auth/login/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId }),
});
const { options } = await initResponse.json();

// 2. Get credential with WebAuthn API (browser)
const credential = await navigator.credentials.get({
  publicKey: options,
});

// 3. Verify credential
const verifyResponse = await fetch('http://localhost:3001/auth/login/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, credential }),
});
const { accessToken, refreshToken } = await verifyResponse.json();
```

## License

MIT
