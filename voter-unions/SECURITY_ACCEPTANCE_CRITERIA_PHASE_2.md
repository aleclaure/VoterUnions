# Security Acceptance Criteria - Phase 2 Implementation Plan

**Goal:** Achieve 93% privacy compliance through infrastructure hardening and operational excellence  
**Timeline:** 1-2 months (4-8 weeks)  
**Budget:** $200-475/mo ongoing infrastructure costs  
**Prerequisites:** Phase 1 completed (81% compliance)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Enhancements](#architecture-enhancements)
3. [Week-by-Week Implementation](#week-by-week-implementation)
4. [Infrastructure Specifications](#infrastructure-specifications)
5. [Security Hardening](#security-hardening)
6. [Operational Excellence](#operational-excellence)
7. [Monitoring & Observability](#monitoring--observability)
8. [Incident Response](#incident-response)
9. [Success Metrics](#success-metrics)

---

## 📊 Executive Summary

### **What We're Building**

Phase 2 focuses on **infrastructure hardening** and **operational excellence** to achieve production-grade security without changing the Expo + React Native frontend.

**Phase 1 (Completed):**
```
✅ Custom WebAuthn auth (no email)
✅ Encrypted memberships (server can't decrypt)
✅ Blind-signature voting (unlinkable votes)
✅ PII-free logging (24h retention)
✅ Separate databases (3x PostgreSQL)
✅ 81% privacy compliance
```

**Phase 2 (This Plan):**
```
🎯 Cloudflare CDN/WAF (DDoS protection, rate limiting)
🎯 Tor .onion mirror (censorship resistance)
🎯 KMS/HSM key management (quarterly rotation)
🎯 Multi-region deployment (geographic resilience)
🎯 Automated backup drills (quarterly testing)
🎯 Transparency reports (semiannual publication)
🎯 93% privacy compliance
```

### **Deliverables**

1. ✅ Cloudflare CDN/WAF with custom rules
2. ✅ Tor hidden service (.onion mirror)
3. ✅ HashiCorp Vault or AWS KMS integration
4. ✅ Multi-region database replication
5. ✅ Automated backup and restore testing
6. ✅ Monitoring dashboards (Grafana + Prometheus)
7. ✅ Incident response runbooks
8. ✅ Public transparency report template

### **Cost Breakdown**

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| **Phase 1 (existing)** | | **$175-375** |
| Cloudflare Pro | Cloudflare | $20-25 |
| KMS/HSM | AWS KMS or Vault Cloud | $10-30 |
| Read replicas (2x) | Railway/Render | $50-75 |
| Monitoring (Grafana Cloud) | Grafana Labs | $0-29 |
| Backup storage (encrypted) | AWS S3 | $5-15 |
| **Phase 2 Total** | | **$85-174** |
| **Combined (Phase 1+2)** | | **$260-549** |

**Note:** We'll optimize to stay closer to **$200-475/mo** range.

---

## 🏗️ Architecture Enhancements

### **Before Phase 2**

```
Expo App → API Services → 3 Databases
          (direct access)
```

### **After Phase 2**

```
┌────────────────────────────────────────────┐
│         User Devices (Expo App)            │
│    iOS / Android / Web / Tor Browser       │
└────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ Cloudflare   │      │ Tor Hidden       │
│ CDN/WAF      │      │ Service (.onion) │
│ - DDoS       │      │ - Censorship     │
│ - Rate limit │      │   resistance     │
│ - Firewall   │      │ - Read-only      │
└──────────────┘      └──────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌──────────────────────┐
        │  API Gateway / LB     │
        │  (Origin allowlist)   │
        └──────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Auth    │  │ Union   │  │ Voting  │  │Messaging│
│ Service │  │ Service │  │ Service │  │ Service │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
    │               │               │
    ▼               ▼               ▼
┌─────────────────────────────────────┐
│     HashiCorp Vault / AWS KMS       │
│  (Server signing keys, encryption)  │
└─────────────────────────────────────┘
    │               │               │
    ▼               ▼               ▼
┌─────────┐  ┌──────────────┐  ┌─────────┐
│content  │  │ membership   │  │ ballot  │
│  _db    │  │    _db       │  │  _db    │
│(primary)│  │  (primary)   │  │(primary)│
└─────────┘  └──────────────┘  └─────────┘
    │               │               │
    ▼               ▼               ▼
┌─────────┐  ┌──────────────┐  ┌─────────┐
│content  │  │ membership   │  │ ballot  │
│  _db    │  │    _db       │  │  _db    │
│(replica)│  │  (replica)   │  │(replica)│
└─────────┘  └──────────────┘  └─────────┘
```

### **New Components**

1. **Cloudflare CDN/WAF** - DDoS protection, rate limiting, firewall rules
2. **Tor Hidden Service** - .onion mirror for censorship resistance
3. **KMS/HSM** - Centralized key management with rotation
4. **Read Replicas** - Geographic distribution and fault tolerance
5. **Monitoring** - Grafana + Prometheus dashboards
6. **Backup Automation** - Encrypted backups with quarterly restore drills

---

## 📅 Week-by-Week Implementation

### **Week 1: Cloudflare CDN/WAF Setup**

#### **Day 1-2: Cloudflare Configuration**

**Tasks:**
1. ✅ Create Cloudflare account
2. ✅ Add custom domain (unitedUnions.app)
3. ✅ Configure DNS records
4. ✅ Enable Cloudflare proxy
5. ✅ Configure SSL/TLS settings

**Steps:**
```bash
# 1. Point domain to Cloudflare nameservers
# In domain registrar (Namecheap, GoDaddy, etc.):
NS1: arlo.ns.cloudflare.com
NS2: june.ns.cloudflare.com

# 2. Add DNS records in Cloudflare dashboard
A     api.unitedUnions.app    → <your-server-ip>    (Proxied: ON)
CNAME www.unitedUnions.app    → unitedUnions.app   (Proxied: ON)

# 3. SSL/TLS settings
Mode: Full (Strict)
Min TLS: 1.2
HSTS: Enabled (max-age: 31536000)
```

**SSL Configuration:**
```
SSL/TLS → Overview
  └─ Encryption mode: Full (strict)

SSL/TLS → Edge Certificates
  ✅ Always Use HTTPS: ON
  ✅ HTTP Strict Transport Security (HSTS): Enabled
      - Max Age: 12 months
      - Include subdomains: ON
      - Preload: ON
  ✅ Minimum TLS Version: 1.2
  ✅ Opportunistic Encryption: ON
  ✅ TLS 1.3: ON
```

**Testing Checkpoint:**
- [ ] Domain resolves to Cloudflare
- [ ] HTTPS works with valid certificate
- [ ] HSTS header present
- [ ] HTTP redirects to HTTPS

---

#### **Day 3-4: WAF Rules & Rate Limiting**

**Tasks:**
1. ✅ Configure WAF managed rules
2. ✅ Create custom firewall rules
3. ✅ Set up rate limiting
4. ✅ Configure bot protection

**WAF Managed Rules:**
```
Security → WAF → Managed rules
  ✅ Cloudflare Managed Ruleset: ON
  ✅ Cloudflare OWASP Core Ruleset: ON
  ✅ Cloudflare Exposed Credentials Check: ON
```

**Custom Firewall Rules:**
```javascript
// Rule 1: Block known bots
(cf.bot_management.score < 30) and (not cf.bot_management.verified_bot)
  → Action: Block

// Rule 2: Require HTTPS
(ssl == "off")
  → Action: Redirect to HTTPS

// Rule 3: Geo-blocking (optional - high-risk countries)
(ip.geoip.country in {"XX" "YY"})  // Replace with actual country codes if needed
  → Action: Challenge (Managed Challenge)

// Rule 4: Block suspicious user agents
(http.user_agent contains "sqlmap") or 
(http.user_agent contains "nikto") or
(http.user_agent contains "masscan")
  → Action: Block

// Rule 5: Allow only API routes
(http.request.uri.path does not start with "/auth") and
(http.request.uri.path does not start with "/unions") and
(http.request.uri.path does not start with "/ballots") and
(http.request.uri.path does not start with "/me")
  → Action: Block
```

**Rate Limiting Rules:**
```javascript
// Rate Limit 1: Auth endpoints (signup/login)
(http.request.uri.path eq "/auth/webauthn/register" or
 http.request.uri.path eq "/auth/webauthn/verify")
  → Rate: 5 requests per minute per IP
  → Action: Block for 1 hour

// Rate Limit 2: Vote submission
(http.request.uri.path matches "^/ballots/.*/vote$")
  → Rate: 10 requests per 5 minutes per IP
  → Action: Block for 15 minutes

// Rate Limit 3: Union join
(http.request.uri.path matches "^/unions/.*/join$")
  → Rate: 10 requests per hour per IP
  → Action: Block for 1 hour

// Rate Limit 4: Global API rate limit
(http.request.uri.path starts with "/")
  → Rate: 100 requests per minute per IP
  → Action: Block for 10 minutes
```

**Bot Protection:**
```
Security → Bots
  ✅ Bot Fight Mode: ON
  ✅ Definitely Automated: Block
  ✅ Likely Automated: Challenge
  ✅ Verified Bots: Allow
```

**Testing Checkpoint:**
- [ ] WAF blocks malicious requests
- [ ] Rate limiting prevents abuse
- [ ] Bot detection works
- [ ] Legitimate traffic passes through

---

#### **Day 5-7: Origin Server Hardening**

**Tasks:**
1. ✅ Configure origin IP allowlist
2. ✅ Disable direct IP access
3. ✅ Set up authenticated origin pulls
4. ✅ Test CDN bypass prevention

**Origin IP Allowlist (Backend):**
```nginx
# /etc/nginx/nginx.conf
http {
  # Cloudflare IP ranges (update quarterly from https://www.cloudflare.com/ips/)
  geo $cloudflare_ip {
    default 0;
    
    # IPv4
    173.245.48.0/20 1;
    103.21.244.0/22 1;
    103.22.200.0/22 1;
    103.31.4.0/22 1;
    141.101.64.0/18 1;
    108.162.192.0/18 1;
    190.93.240.0/20 1;
    188.114.96.0/20 1;
    197.234.240.0/22 1;
    198.41.128.0/17 1;
    162.158.0.0/15 1;
    104.16.0.0/13 1;
    104.24.0.0/14 1;
    172.64.0.0/13 1;
    131.0.72.0/22 1;
    
    # Add Tor exit nodes if enabling Tor mirror
    # (Get from https://check.torproject.org/torbulkexitlist)
  }
  
  server {
    listen 443 ssl;
    server_name api.unitedUnions.app;
    
    # Block requests not from Cloudflare
    if ($cloudflare_ip = 0) {
      return 403 "Direct origin access forbidden";
    }
    
    # Verify Cloudflare origin certificate
    ssl_client_certificate /etc/ssl/cloudflare/origin-pull-ca.pem;
    ssl_verify_client on;
    
    location / {
      proxy_pass http://localhost:3000;
      
      # Trust Cloudflare's CF-Connecting-IP header
      real_ip_header CF-Connecting-IP;
      set_real_ip_from 0.0.0.0/0;  # Trust all sources (already filtered by geo block)
      
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
  
  # Block direct IP access
  server {
    listen 443 ssl default_server;
    server_name _;
    return 444;  # Close connection without response
  }
}
```

**Authenticated Origin Pulls:**
```bash
# Download Cloudflare origin CA certificate
curl -o /etc/ssl/cloudflare/origin-pull-ca.pem \
  https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem

# Configure Cloudflare dashboard
# SSL/TLS → Origin Server
#   ✅ Authenticated Origin Pulls: Enabled (Global)
```

**Firewall Rules (iptables):**
```bash
#!/bin/bash
# /etc/firewall/cloudflare-only.sh

# Flush existing rules
iptables -F
iptables -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (restrict to specific IPs in production)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow Cloudflare IPs only for HTTPS
for ip in $(curl https://www.cloudflare.com/ips-v4); do
  iptables -A INPUT -p tcp --dport 443 -s $ip -j ACCEPT
done

# Save rules
iptables-save > /etc/iptables/rules.v4
```

**Testing Checkpoint:**
- [ ] Direct origin access blocked
- [ ] Only Cloudflare IPs allowed
- [ ] Authenticated origin pulls work
- [ ] Firewall rules active

---

### **Week 2: Tor Hidden Service (.onion Mirror)**

#### **Day 1-3: Tor Setup & Configuration**

**Tasks:**
1. ✅ Install Tor on server
2. ✅ Configure hidden service
3. ✅ Generate .onion address
4. ✅ Set up read-only gateway
5. ✅ Add to Cloudflare allowlist

**Install Tor:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install tor

# Verify installation
tor --version
```

**Configure Hidden Service:**
```bash
# /etc/tor/torrc
HiddenServiceDir /var/lib/tor/unitedUnions/
HiddenServicePort 80 127.0.0.1:3005    # Read-only gateway
HiddenServicePort 443 127.0.0.1:3005

# Additional security
HiddenServiceVersion 3  # Use v3 onion addresses (longer, more secure)
HiddenServiceSingleHopMode 0
HiddenServiceNonAnonymousMode 0

# Restart Tor
sudo systemctl restart tor

# Get .onion address
sudo cat /var/lib/tor/unitedUnions/hostname
# Example output: unitedUnions3a7b8c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u.onion
```

**Read-Only Gateway Service:**
```typescript
// backend/services/tor_gateway/src/index.ts
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Detect Tor traffic
const isTorRequest = (req: any): boolean => {
  return req.headers['x-tor-gateway'] === 'true' ||
         req.socket.remoteAddress === '127.0.0.1';
};

// Block write operations on Tor
app.addHook('onRequest', async (req, reply) => {
  if (isTorRequest(req)) {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return reply.code(403).send({
        error: 'Write operations disabled on Tor mirror',
        message: 'Use clearnet for authentication and voting',
      });
    }
    
    // Mark request as Tor
    req.headers['x-tor-request'] = 'true';
  }
});

// Proxy to main services (read-only)
app.all('/*', async (req, reply) => {
  const targetUrl = `http://localhost:3001${req.url}`;  // Route to main gateway
  
  // Forward GET requests only
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers as any,
  });
  
  const data = await response.text();
  reply.code(response.status).send(data);
});

app.listen({ port: 3005, host: '127.0.0.1' });
```

**Add Tor to Origin Allowlist:**
```nginx
# Update nginx.conf
geo $allowed_source {
  default 0;
  
  # Cloudflare IPs
  173.245.48.0/20 1;
  # ... (all Cloudflare ranges)
  
  # Tor gateway (localhost)
  127.0.0.1 1;
}

server {
  if ($allowed_source = 0) {
    return 403;
  }
  
  # ... rest of config
}
```

**Testing Checkpoint:**
- [ ] .onion address accessible via Tor Browser
- [ ] Read-only operations work
- [ ] Write operations blocked
- [ ] Gateway routes to main services

---

#### **Day 4-5: Expo App Integration**

**Tasks:**
1. ✅ Add Tor detection
2. ✅ Create "Open in Tor" button
3. ✅ Show read-only warnings
4. ✅ Deep link to .onion address

**Frontend Code:**
```typescript
// frontend/src/services/tor.ts
import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const ONION_URL = 'http://unitedUnions3a7b8c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u.onion';

export const openInTor = async () => {
  const torBrowserUrl = Platform.OS === 'ios'
    ? `onionbrowser://${ONION_URL}`
    : `torbrowser:${ONION_URL}`;
  
  try {
    const canOpen = await Linking.canOpenURL(torBrowserUrl);
    
    if (canOpen) {
      await Linking.openURL(torBrowserUrl);
    } else {
      // Tor Browser not installed - show instructions
      Alert.alert(
        'Tor Browser Required',
        `To access the .onion mirror, you need Tor Browser:\n\n` +
        `iOS: Install "Onion Browser" from App Store\n` +
        `Android: Install "Tor Browser" from Play Store\n\n` +
        `Onion address copied to clipboard.`,
        [
          {
            text: 'Copy Address',
            onPress: () => Clipboard.setStringAsync(ONION_URL),
          },
          { text: 'OK' },
        ]
      );
      
      // Copy to clipboard
      await Clipboard.setStringAsync(ONION_URL);
    }
  } catch (error) {
    console.error('Failed to open Tor:', error);
  }
};

export const isTorConnection = (): boolean => {
  // Check if running on .onion domain (web)
  if (Platform.OS === 'web') {
    return window.location.hostname.endsWith('.onion');
  }
  return false;
};
```

**Settings Screen:**
```typescript
// frontend/src/screens/SettingsScreen.tsx
import { openInTor, isTorConnection } from '../services/tor';

const SettingsScreen = () => {
  const [onTor, setOnTor] = useState(isTorConnection());
  
  return (
    <ScrollView>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 High Security Mode</Text>
        
        {onTor ? (
          <View style={styles.torBadge}>
            <Text style={styles.torActive}>✅ Connected via Tor</Text>
            <Text style={styles.torNote}>
              You are using the .onion mirror for maximum privacy.{'\n'}
              Note: Write operations (voting, posting) are disabled for security.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.description}>
              For maximum privacy and censorship resistance, access United Unions 
              via our Tor hidden service (.onion mirror).
            </Text>
            
            <Text style={styles.benefits}>
              Benefits:{'\n'}
              • Hides your IP address{'\n'}
              • Bypasses censorship and blocks{'\n'}
              • Protects against traffic analysis{'\n'}
              • Read-only access (voting requires clearnet)
            </Text>
            
            <Button
              title="🧅 Access via Tor"
              onPress={openInTor}
              color="#7D4698"
            />
          </View>
        )}
      </View>
      
      {/* Other settings... */}
    </ScrollView>
  );
};
```

**Read-Only Banner (for Tor users):**
```typescript
// frontend/src/components/TorBanner.tsx
export const TorBanner = () => {
  const onTor = isTorConnection();
  
  if (!onTor) return null;
  
  return (
    <View style={styles.torBanner}>
      <Text style={styles.torText}>
        🧅 Tor Mode: Read-Only
      </Text>
      <Text style={styles.torSubtext}>
        To vote or post, switch to clearnet
      </Text>
    </View>
  );
};
```

**Testing Checkpoint:**
- [ ] Tor Browser opens from app
- [ ] .onion address works
- [ ] Read-only banner shows on Tor
- [ ] Deep links work properly

---

#### **Day 6-7: Monitoring & Logging**

**Tasks:**
1. ✅ Add Tor traffic monitoring
2. ✅ Log .onion access (anonymously)
3. ✅ Create Tor usage dashboard
4. ✅ Document Tor setup for transparency

**Tor Traffic Logging:**
```typescript
// backend/shared/logger/tor.ts
import { contentDB } from '@shared/db/clients';

export const logTorAccess = async (route: string) => {
  // Log Tor access WITHOUT IP (already anonymous via Tor)
  await contentDB.query(`
    INSERT INTO logs.events (request_hash, route, status_code, event_type)
    VALUES ($1, $2, $3, $4)
  `, [
    createHash('sha256').update(`tor:${route}:${Date.now()}`).digest('hex'),
    route,
    200,
    'tor_access'
  ]);
};
```

**Tor Usage Dashboard:**
```sql
-- Aggregate Tor usage (no PII)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as tor_requests
FROM logs.events
WHERE event_type = 'tor_access'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Documentation:**
```markdown
# Tor Hidden Service Setup

## Onion Address
http://unitedUnions3a7b8c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u.onion

## Features
- Read-only access to all public content
- View union pages, posts, aggregate vote tallies
- No authentication or write operations
- Traffic fully anonymous (no IP logging)

## Limitations
- Cannot sign up or log in (use clearnet for account creation)
- Cannot vote or post content (write operations disabled)
- May be slower than clearnet due to Tor routing

## How to Access
1. Download Tor Browser: https://www.torproject.org/download/
2. Open Tor Browser
3. Navigate to the .onion address above
4. Browse anonymously

## Security Notes
- .onion v3 address (highest security)
- No IP addresses logged
- Traffic cannot be traced back to users
- Use for high-risk scenarios (censorship, surveillance)
```

**Testing Checkpoint:**
- [ ] Tor traffic logged anonymously
- [ ] Usage statistics available
- [ ] Documentation complete
- [ ] No IP addresses in logs

---

### **Week 3: KMS/HSM Integration**

#### **Day 1-3: HashiCorp Vault Setup**

**Tasks:**
1. ✅ Choose KMS provider (Vault vs AWS KMS)
2. ✅ Set up Vault server or AWS KMS
3. ✅ Configure access policies
4. ✅ Migrate server signing keys

**Option A: HashiCorp Vault (Self-Hosted)**

**Install Vault:**
```bash
# Download and install
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Create config
sudo mkdir /etc/vault
sudo cat > /etc/vault/config.hcl <<EOF
storage "file" {
  path = "/var/lib/vault/data"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1  # Use reverse proxy for TLS
}

api_addr = "http://127.0.0.1:8200"
ui = true
EOF

# Start Vault
vault server -config=/etc/vault/config.hcl

# Initialize (first time only)
vault operator init -key-shares=5 -key-threshold=3
# Save unseal keys and root token securely!

# Unseal Vault (requires 3 of 5 keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

**Enable Secrets Engine:**
```bash
# Login with root token
export VAULT_ADDR='http://127.0.0.1:8200'
vault login <root-token>

# Enable transit engine (for encryption/signing)
vault secrets enable transit

# Create signing key for ballots
vault write -f transit/keys/ballot-signing-key \
  type=ed25519

# Create encryption keys
vault write -f transit/keys/membership-encryption \
  type=aes256-gcm96
```

**Access Policy:**
```hcl
# /etc/vault/policies/voting-service.hcl
path "transit/sign/ballot-signing-key" {
  capabilities = ["create", "update"]
}

path "transit/verify/ballot-signing-key" {
  capabilities = ["create", "update"]
}

path "transit/keys/ballot-signing-key" {
  capabilities = ["read"]
}

# Create policy
vault policy write voting-service /etc/vault/policies/voting-service.hcl

# Create token for voting service
vault token create -policy=voting-service -ttl=720h
```

**Option B: AWS KMS (Managed Service)**

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Create KMS key
aws kms create-key \
  --description "United Unions ballot signing key" \
  --key-usage SIGN_VERIFY \
  --key-spec ECC_NIST_P256

# Create alias
aws kms create-alias \
  --alias-name alias/ballot-signing \
  --target-key-id <key-id>

# Grant access to voting service (via IAM role)
aws kms create-grant \
  --key-id <key-id> \
  --grantee-principal arn:aws:iam::ACCOUNT:role/voting-service \
  --operations Sign Verify
```

**Cost Comparison:**
- **Vault Cloud (managed):** $10-30/mo
- **Vault Self-Hosted:** $0/mo (but requires maintenance)
- **AWS KMS:** ~$1/key/mo + $0.03 per 10k API calls

**Recommendation:** Start with Vault Cloud for simplicity.

**Testing Checkpoint:**
- [ ] Vault/KMS accessible
- [ ] Keys created successfully
- [ ] Access policies work
- [ ] Tokens/roles configured

---

#### **Day 4-5: Service Integration**

**Tasks:**
1. ✅ Update voting service to use KMS
2. ✅ Migrate existing signing keys
3. ✅ Update union service encryption
4. ✅ Test key operations

**Voting Service Integration:**
```typescript
// backend/services/voting_service/src/kms.ts
import axios from 'axios';

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

export const signWithVault = async (message: string): Promise<string> => {
  const response = await axios.post(
    `${VAULT_ADDR}/v1/transit/sign/ballot-signing-key`,
    {
      input: Buffer.from(message).toString('base64'),
    },
    {
      headers: { 'X-Vault-Token': VAULT_TOKEN },
    }
  );
  
  return response.data.data.signature;
};

export const verifyWithVault = async (
  message: string,
  signature: string
): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${VAULT_ADDR}/v1/transit/verify/ballot-signing-key`,
      {
        input: Buffer.from(message).toString('base64'),
        signature,
      },
      {
        headers: { 'X-Vault-Token': VAULT_TOKEN },
      }
    );
    
    return response.data.data.valid;
  } catch (error) {
    return false;
  }
};

// Blind signature (server-side)
export const blindSignWithVault = async (
  blindedMessage: string
): Promise<string> => {
  // Use vault signing instead of local keys
  return await signWithVault(blindedMessage);
};
```

**Update Voting Endpoints:**
```typescript
// backend/services/voting_service/src/index.ts
import { blindSignWithVault, verifyWithVault } from './kms';

// POST /ballots/:ballotId/issue_token
app.post('/ballots/:ballotId/issue_token', async (req, reply) => {
  const { blinded_message } = req.body;
  
  // Use Vault for blind signing (keys never leave KMS)
  const blindSignature = await blindSignWithVault(blinded_message);
  
  await redis.setex(`issued:${ballotId}:${userId}`, 86400, '1');
  
  return { blind_signature: blindSignature };
});

// POST /ballots/:ballotId/vote
app.post('/ballots/:ballotId/vote', async (req, reply) => {
  const { token_signature, commitment, nullifier } = req.body;
  
  // Verify signature using Vault
  const isValid = await verifyWithVault(nullifier, token_signature);
  
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid token signature' });
  }
  
  // ... rest of vote logic
});
```

**Migration Script:**
```typescript
// backend/scripts/migrate-keys-to-vault.ts
import { ballotDB } from '@shared/db/clients';
import { signWithVault } from '../services/voting_service/src/kms';

async function migrateKeys() {
  console.log('Migrating signing keys to Vault...');
  
  // Get all ballots with local signing keys
  const { rows } = await ballotDB.query(
    'SELECT ballot_id, private_key FROM ballot_signing_keys'
  );
  
  for (const row of rows) {
    console.log(`Migrating ballot ${row.ballot_id}...`);
    
    // Note: Cannot migrate private keys directly to Vault
    // Instead, regenerate signatures using Vault for future ballots
    // Existing ballots keep local keys for backward compatibility
    
    // For new ballots, delete local keys after migration period
  }
  
  console.log('Migration complete. New ballots will use Vault.');
}

migrateKeys().catch(console.error);
```

**Testing Checkpoint:**
- [ ] Vault signing works
- [ ] Vault verification works
- [ ] Keys never leave KMS
- [ ] Services connect to Vault

---

#### **Day 6-7: Key Rotation Setup**

**Tasks:**
1. ✅ Create key rotation runbook
2. ✅ Set up quarterly rotation schedule
3. ✅ Test rotation procedure
4. ✅ Document rotation process

**Key Rotation Runbook:**
```markdown
# Quarterly Key Rotation Procedure

**Frequency:** Every 90 days  
**Last Rotation:** [Date]  
**Next Rotation:** [Date + 90 days]

## Pre-Rotation Checklist
- [ ] Schedule maintenance window (low-traffic period)
- [ ] Backup current keys (encrypted)
- [ ] Test rotation in staging environment
- [ ] Notify team of rotation schedule

## Rotation Steps

### 1. Create New Keys
```bash
# Vault
vault write -f transit/keys/ballot-signing-key-v2 type=ed25519

# AWS KMS
aws kms create-key \
  --description "Ballot signing key v2" \
  --key-usage SIGN_VERIFY
```

### 2. Dual-Key Period (7 days)
- Both old and new keys valid
- New ballots use new key
- Old ballots still verify with old key

### 3. Update Services
```bash
# Update environment variables
export VAULT_SIGNING_KEY=ballot-signing-key-v2

# Rolling restart services
kubectl rollout restart deployment/voting-service
# Or for Docker: docker-compose restart voting-service
```

### 4. Monitor for Errors
- Check error logs for signature verification failures
- Ensure <1% error rate (only very old tokens)

### 5. Deprecate Old Key (after 7 days)
```bash
# Vault
vault write transit/keys/ballot-signing-key/config deletion_allowed=true
vault delete transit/keys/ballot-signing-key

# AWS KMS
aws kms schedule-key-deletion --key-id <old-key-id> --pending-window-in-days 30
```

### 6. Update Documentation
- [ ] Record rotation in changelog
- [ ] Update .env.example with new key aliases
- [ ] Archive old key metadata

## Post-Rotation Verification
- [ ] All services using new key
- [ ] Signature verification works
- [ ] No elevated error rates
- [ ] Old key properly deprecated

## Emergency Rollback
If issues detected:
```bash
# Revert to old key
export VAULT_SIGNING_KEY=ballot-signing-key
kubectl rollout undo deployment/voting-service
```

## Automation (Future)
```bash
# Cron job to remind of rotation
0 0 1 */3 * /usr/local/bin/rotation-reminder.sh
```
```

**Rotation Script:**
```bash
#!/bin/bash
# /usr/local/bin/rotate-keys.sh

set -e

echo "Starting quarterly key rotation..."

# 1. Create new key
NEW_KEY="ballot-signing-key-$(date +%Y%m%d)"
vault write -f transit/keys/$NEW_KEY type=ed25519

# 2. Update config
sed -i "s/VAULT_SIGNING_KEY=.*/VAULT_SIGNING_KEY=$NEW_KEY/" /etc/unitedUnions/.env

# 3. Restart services
docker-compose restart voting-service

# 4. Schedule old key deletion (30 days)
echo "vault delete transit/keys/ballot-signing-key" | at now + 30 days

echo "Rotation complete. Old key will be deleted in 30 days."
```

**Testing Checkpoint:**
- [ ] Rotation script works
- [ ] Dual-key period tested
- [ ] Services update correctly
- [ ] Old keys deprecated safely

---

### **Week 4: Multi-Region & Backup**

#### **Day 1-3: Read Replicas**

**Tasks:**
1. ✅ Set up read replicas (2 regions)
2. ✅ Configure replication lag monitoring
3. ✅ Update services to use replicas for reads
4. ✅ Test failover

**PostgreSQL Read Replicas:**
```yaml
# railway.yaml or render.yaml
databases:
  - name: content-db-primary
    region: us-west
    type: postgresql
    plan: pro
    
  - name: content-db-replica-1
    region: us-east
    type: postgresql
    plan: pro
    source: content-db-primary  # Replica of primary
    
  - name: content-db-replica-2
    region: eu-west
    type: postgresql
    plan: pro
    source: content-db-primary
    
  # Repeat for membership-db and ballot-db
```

**Connection Pooling:**
```typescript
// backend/shared/db/clients.ts
import { Pool } from 'pg';

// Primary (writes)
export const contentDB = new Pool({
  connectionString: process.env.CONTENT_DB_PRIMARY_URL,
  max: 20,
});

// Replicas (reads)
export const contentDBReplica = new Pool({
  connectionString: process.env.CONTENT_DB_REPLICA_URL || process.env.CONTENT_DB_PRIMARY_URL,
  max: 20,
});

// Helper function for read operations
export const readFromReplica = async (query: string, params?: any[]) => {
  try {
    return await contentDBReplica.query(query, params);
  } catch (error) {
    // Fallback to primary if replica unavailable
    console.warn('Replica unavailable, using primary:', error);
    return await contentDB.query(query, params);
  }
};

// Helper function for write operations (always primary)
export const writeToPrimary = async (query: string, params?: any[]) => {
  return await contentDB.query(query, params);
};
```

**Update Services:**
```typescript
// backend/services/messaging_service/src/posts.ts
import { readFromReplica, writeToPrimary } from '@shared/db/clients';

// GET /posts (use replica)
app.get('/posts', async (req, reply) => {
  const { rows } = await readFromReplica(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 50'
  );
  
  return rows;
});

// POST /posts (use primary)
app.post('/posts', async (req, reply) => {
  const { content, author_pseudonym } = req.body;
  
  const { rows } = await writeToPrimary(
    'INSERT INTO posts (content, author_pseudonym) VALUES ($1, $2) RETURNING *',
    [content, author_pseudonym]
  );
  
  return rows[0];
});
```

**Replication Lag Monitoring:**
```sql
-- Check replication lag (run on replica)
SELECT
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- Alert if lag > 10 seconds
```

**Testing Checkpoint:**
- [ ] Replicas receiving updates
- [ ] Read queries use replicas
- [ ] Write queries use primary
- [ ] Failover works (replica → primary)

---

#### **Day 4-5: Automated Backups**

**Tasks:**
1. ✅ Set up encrypted backups
2. ✅ Configure backup schedule
3. ✅ Test backup restoration
4. ✅ Set up geo-redundant storage

**Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-databases.sh

set -e

BACKUP_DIR="/var/backups/unitedUnions"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="s3://unitedUnions-backups"
GPG_KEY="backup@unitedUnions.app"

mkdir -p $BACKUP_DIR

# Backup each database
for DB in content membership ballot; do
  echo "Backing up ${DB}_db..."
  
  # Dump database
  pg_dump -h ${DB}_DB_HOST -U postgres ${DB} > $BACKUP_DIR/${DB}_${DATE}.sql
  
  # Encrypt with GPG
  gpg --encrypt --recipient $GPG_KEY $BACKUP_DIR/${DB}_${DATE}.sql
  
  # Upload to S3
  aws s3 cp $BACKUP_DIR/${DB}_${DATE}.sql.gpg \
    $S3_BUCKET/${DB}/${DATE}.sql.gpg \
    --storage-class GLACIER
  
  # Remove local file (keep encrypted copy in S3)
  rm $BACKUP_DIR/${DB}_${DATE}.sql
done

# Cleanup old local backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gpg" -mtime +7 -delete

echo "Backup complete: $DATE"
```

**Cron Schedule:**
```bash
# /etc/cron.d/unitedUnions-backups
# Daily backups at 3 AM
0 3 * * * /usr/local/bin/backup-databases.sh

# Weekly verification (restore test) on Sundays at 4 AM
0 4 * * 0 /usr/local/bin/test-restore.sh
```

**S3 Lifecycle Policy:**
```json
{
  "Rules": [
    {
      "Id": "Backup retention",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

**Cost Estimate:**
- Daily backups: ~3GB total
- Monthly storage: ~90GB
- S3 Glacier: ~$0.40/mo per database
- Total: ~$1.50/mo

**Testing Checkpoint:**
- [ ] Backups run daily
- [ ] Files encrypted with GPG
- [ ] Uploaded to S3 successfully
- [ ] Lifecycle policies active

---

#### **Day 6-7: Quarterly Restore Drills**

**Tasks:**
1. ✅ Create restore procedure
2. ✅ Test restoration to staging
3. ✅ Document restore time
4. ✅ Create restore runbook

**Restore Script:**
```bash
#!/bin/bash
# /usr/local/bin/restore-backup.sh

set -e

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <database> <backup_date>"
  echo "Example: $0 content 20250115_030000"
  exit 1
fi

DB=$1
DATE=$2
S3_BUCKET="s3://unitedUnions-backups"
RESTORE_DIR="/tmp/restore"

mkdir -p $RESTORE_DIR

echo "Restoring ${DB}_db from backup ${DATE}..."

# Download from S3
aws s3 cp $S3_BUCKET/${DB}/${DATE}.sql.gpg $RESTORE_DIR/${DB}_${DATE}.sql.gpg

# Decrypt
gpg --decrypt $RESTORE_DIR/${DB}_${DATE}.sql.gpg > $RESTORE_DIR/${DB}_${DATE}.sql

# Create test database
createdb ${DB}_restore_test

# Restore
psql -h localhost -U postgres ${DB}_restore_test < $RESTORE_DIR/${DB}_${DATE}.sql

echo "Restored to ${DB}_restore_test database"

# Verify data integrity
echo "Verifying integrity..."
psql -h localhost -U postgres ${DB}_restore_test -c "SELECT COUNT(*) FROM posts;"
psql -h localhost -U postgres ${DB}_restore_test -c "SELECT COUNT(*) FROM users;"

# Cleanup
rm $RESTORE_DIR/${DB}_${DATE}.sql*

echo "Restore test complete!"
```

**Quarterly Restore Drill:**
```markdown
# Quarterly Backup Restore Drill

**Schedule:** First Sunday of each quarter (Jan, Apr, Jul, Oct)  
**Last Drill:** [Date]  
**Next Drill:** [Date]

## Objectives
- Verify backup integrity
- Test restore procedure
- Measure restore time (target: <30 min)
- Identify issues before actual disaster

## Procedure

### 1. Select Random Backup
```bash
# List available backups
aws s3 ls s3://unitedUnions-backups/content/ | tail -10

# Choose one from last week
BACKUP_DATE=20250115_030000
```

### 2. Restore to Staging
```bash
# Run restore script
time ./restore-backup.sh content $BACKUP_DATE

# Record time taken
```

### 3. Verify Data Integrity
```sql
-- Check record counts match production
SELECT 
  (SELECT COUNT(*) FROM posts) as posts_count,
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM votes) as votes_count;

-- Compare with production counts
-- Difference should be ≤ 24 hours of activity
```

### 4. Test RLS Policies
```bash
# Ensure RLS policies restored correctly
psql ${DB}_restore_test -c "\d+ posts"

# Verify triggers
psql ${DB}_restore_test -c "SELECT * FROM pg_trigger;"
```

### 5. Document Results
- [ ] Restore time: _____ minutes (target: <30)
- [ ] Data integrity: ✅ / ❌
- [ ] RLS policies: ✅ / ❌
- [ ] Triggers active: ✅ / ❌
- [ ] Issues found: _____________________

### 6. Cleanup
```bash
dropdb ${DB}_restore_test
```

## Issues Log
| Date | Issue | Resolution | Follow-up |
|------|-------|------------|-----------|
| 2025-01-05 | Slow restore (45 min) | Upgraded to larger instance | Monitor next drill |
```

**Testing Checkpoint:**
- [ ] Restore script works
- [ ] Data integrity verified
- [ ] Restore time acceptable (<30 min)
- [ ] Drill documented

---

### **Week 5-6: Monitoring & Observability**

#### **Week 5: Prometheus + Grafana**

**Tasks:**
1. ✅ Set up Prometheus
2. ✅ Set up Grafana
3. ✅ Create custom dashboards
4. ✅ Configure alerts

**Install Prometheus:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=90d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3006:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
      - GF_INSTALL_PLUGINS=redis-datasource

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus Config:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3001']
  
  - job_name: 'union-service'
    static_configs:
      - targets: ['union-service:3002']
  
  - job_name: 'voting-service'
    static_configs:
      - targets: ['voting-service:3003']
  
  - job_name: 'messaging-service'
    static_configs:
      - targets: ['messaging-service:3004']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**Add Metrics to Services:**
```typescript
// backend/shared/metrics/index.ts
import client from 'prom-client';

export const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Voting-specific metrics
export const votesTotal = new client.Counter({
  name: 'votes_total',
  help: 'Total votes cast',
  labelNames: ['mode'],  // A, B, or C
  registers: [register],
});

export const blindTokensIssued = new client.Counter({
  name: 'blind_tokens_issued_total',
  help: 'Total blind tokens issued',
  registers: [register],
});
```

**Add Metrics Endpoint:**
```typescript
// backend/services/voting_service/src/index.ts
import { register, httpRequestDuration, votesTotal } from '@shared/metrics';

// Metrics endpoint
app.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});

// Track metrics
app.addHook('onRequest', (req, reply, done) => {
  req.startTime = Date.now();
  done();
});

app.addHook('onResponse', (req, reply, done) => {
  const duration = Date.now() - req.startTime;
  
  httpRequestDuration.observe(
    { method: req.method, route: req.url, status_code: reply.statusCode },
    duration
  );
  
  done();
});

// Track votes
app.post('/ballots/:ballotId/vote', async (req, reply) => {
  // ... vote logic
  
  votesTotal.inc({ mode: ballot.mode });
  
  // ... rest of endpoint
});
```

**Grafana Dashboards:**
```json
// dashboards/overview.json
{
  "dashboard": {
    "title": "United Unions - Overview",
    "panels": [
      {
        "title": "Request Rate (requests/sec)",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Votes Cast (by mode)",
        "targets": [
          {
            "expr": "increase(votes_total[1h])",
            "legendFormat": "Mode {{mode}}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends"
          }
        ]
      }
    ]
  }
}
```

**Alerts:**
```yaml
# prometheus_alerts.yml
groups:
  - name: united_unions_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
      
      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 2000
        for: 5m
        annotations:
          summary: "Slow requests detected"
          description: "P95 latency is {{ $value }}ms"
      
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database is down"
      
      - alert: ReplicationLag
        expr: pg_replication_lag_seconds > 30
        for: 5m
        annotations:
          summary: "High replication lag"
          description: "Replication lag is {{ $value }} seconds"
```

**Testing Checkpoint:**
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards visible
- [ ] Alerts configured
- [ ] Custom metrics tracked

---

#### **Week 6: Logging & Tracing**

**Tasks:**
1. ✅ Centralized logging (Loki)
2. ✅ Distributed tracing (Jaeger)
3. ✅ Error tracking (Sentry)
4. ✅ Uptime monitoring (UptimeRobot)

**Loki for Logs:**
```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yml
      - loki_data:/loki
  
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

**Sentry Integration:**
```typescript
// backend/shared/sentry/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of requests
  
  // Don't send PII to Sentry
  beforeSend(event) {
    // Remove user_id, IP, etc.
    delete event.user;
    delete event.request?.headers?.['x-forwarded-for'];
    delete event.request?.headers?.['cf-connecting-ip'];
    
    return event;
  },
});

export default Sentry;
```

**Uptime Monitoring:**
```markdown
# UptimeRobot Configuration

**Monitors:**
1. API Health Check
   - URL: https://api.unitedUnions.app/health
   - Interval: 5 minutes
   - Alert if down for 2 checks

2. Auth Service
   - URL: https://api.unitedUnions.app/auth/health
   - Interval: 5 minutes

3. .onion Mirror
   - URL: http://unitedUnions....onion/health
   - Interval: 30 minutes
   - Via Tor proxy

**Alert Contacts:**
- Email: ops@unitedUnions.app
- Slack: #alerts channel
- SMS: (for P0 incidents)

**Cost:** Free tier (50 monitors, 5-min intervals)
```

**Testing Checkpoint:**
- [ ] Logs centralized in Loki
- [ ] Errors tracked in Sentry
- [ ] Uptime monitoring active
- [ ] Alerts working

---

### **Week 7-8: Operational Excellence**

#### **Week 7: Incident Response**

**Tasks:**
1. ✅ Create incident response runbooks
2. ✅ Set up on-call rotation
3. ✅ Test incident procedures
4. ✅ Document post-mortems

**Incident Response Runbook:**
```markdown
# Incident Response Runbook

## Severity Levels

### P0 - Critical (Service Down)
- Complete outage (all users affected)
- Data breach or security incident
- **Response time:** <15 minutes
- **Resolution target:** <4 hours

### P1 - High (Degraded Service)
- Partial outage (>50% users affected)
- Database issues, slow performance
- **Response time:** <30 minutes
- **Resolution target:** <8 hours

### P2 - Medium (Minor Issues)
- Limited impact (<10% users)
- Non-critical bugs
- **Response time:** <2 hours
- **Resolution target:** <24 hours

## Response Procedures

### 1. Detection (0-5 min)
- [ ] Alert triggered (monitoring, user report, etc.)
- [ ] Create incident channel: #incident-YYYYMMDD-HH
- [ ] Assign incident commander
- [ ] Update status page: https://status.unitedUnions.app

### 2. Assessment (5-15 min)
- [ ] Determine severity level
- [ ] Identify affected services
- [ ] Check recent deployments
- [ ] Review error logs and metrics

### 3. Communication (15-30 min)
- [ ] Notify stakeholders (internal team)
- [ ] Post status update (public if P0/P1)
- [ ] Set up war room (video call for P0)

### 4. Containment (15 min - 2 hours)
- [ ] Roll back recent deployments if needed
- [ ] Enable feature flags to disable broken features
- [ ] Scale up resources if capacity issue
- [ ] Block malicious traffic if security incident

### 5. Investigation (concurrent)
- [ ] Check Grafana dashboards
- [ ] Review Sentry errors
- [ ] Analyze database queries
- [ ] Check third-party services (Cloudflare, AWS)

### 6. Resolution (varies by severity)
- [ ] Deploy fix (via EAS Update or backend deploy)
- [ ] Verify fix in production
- [ ] Monitor for 30 minutes post-fix

### 7. Post-Incident (within 48 hours)
- [ ] Write post-mortem document
- [ ] Identify root cause
- [ ] Document action items
- [ ] Update runbooks

## Common Scenarios

### Database Connection Pool Exhausted
**Symptoms:** 500 errors, "too many connections"

**Fix:**
```bash
# Scale up database connections
psql -c "ALTER SYSTEM SET max_connections = 200;"
psql -c "SELECT pg_reload_conf();"

# Restart connection pools
docker-compose restart auth-service union-service
```

### High CPU/Memory Usage
**Symptoms:** Slow responses, timeouts

**Fix:**
```bash
# Check resource usage
docker stats

# Scale horizontally
docker-compose up --scale voting-service=3

# Or vertically (upgrade instance)
```

### Voting Service Down
**Symptoms:** Cannot cast votes

**Fix:**
```bash
# Check service status
systemctl status voting-service

# Check logs
journalctl -u voting-service -n 100

# Restart service
systemctl restart voting-service

# If Vault connection issue:
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

### DDoS Attack
**Symptoms:** High traffic, slow responses

**Fix:**
```bash
# Enable Cloudflare "Under Attack" mode
# Dashboard → Overview → Quick Actions → Under Attack Mode

# Add temporary rate limits
# Security → WAF → Rate limiting → Add rule

# Block specific countries/IPs if needed
```
```

**Post-Mortem Template:**
```markdown
# Post-Mortem: [Incident Title]

**Date:** [YYYY-MM-DD]  
**Duration:** [Start time] - [End time] (X hours)  
**Severity:** P0 / P1 / P2  
**Incident Commander:** [Name]

## Summary
Brief description of what happened and impact.

## Timeline
- **HH:MM** - First alert triggered
- **HH:MM** - Incident declared, channel created
- **HH:MM** - Root cause identified
- **HH:MM** - Fix deployed
- **HH:MM** - Incident resolved

## Impact
- **Users affected:** X% of total users
- **Duration:** X hours
- **Data loss:** None / [Description]
- **Revenue impact:** $X (if applicable)

## Root Cause
Detailed explanation of what went wrong.

## Resolution
How the issue was fixed.

## Action Items
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| Add monitoring for X | Alice | 2025-01-20 | ⏳ |
| Update runbook for Y | Bob | 2025-01-22 | ⏳ |
| Implement Z to prevent recurrence | Charlie | 2025-01-30 | ⏳ |

## Lessons Learned
- What went well
- What could be improved
- Preventive measures
```

**Testing Checkpoint:**
- [ ] Runbooks documented
- [ ] Incident procedures tested
- [ ] Post-mortem template created
- [ ] Team trained on procedures

---

#### **Week 8: Transparency Reports**

**Tasks:**
1. ✅ Create transparency report template
2. ✅ Set up data collection
3. ✅ Generate first report
4. ✅ Publish publicly

**Transparency Report Template:**
```markdown
# Transparency Report - H1 2025

**Reporting Period:** January 1, 2025 - June 30, 2025  
**Published:** July 15, 2025

## Overview

United Unions is committed to transparency about how we operate, what data we collect, and how we respond to requests.

## User Statistics

- **Total Users:** 15,243
- **Active Users (30d):** 8,921
- **Unions Created:** 342
- **Votes Cast:** 125,678
  - Mode A (simple): 15,234
  - Mode B (blind-sig): 110,444
  - Mode C (E2E verified): 0

## Data Requests

### Government Requests
| Type | Requests Received | Complied | Data Disclosed |
|------|-------------------|----------|----------------|
| US Law Enforcement | 0 | 0 | N/A |
| Foreign Governments | 0 | 0 | N/A |
| Civil Subpoenas | 0 | 0 | N/A |

**Note:** We received zero government requests in H1 2025. Our architecture minimizes data collection, so even if compelled, we have minimal data to disclose.

### Content Moderation

| Content Type | Reports Received | Actions Taken |
|--------------|------------------|---------------|
| Spam | 127 | 89 removed |
| Harassment | 23 | 18 removed, 5 warnings |
| Misinformation | 45 | 12 removed, 33 reviewed |

**All moderation actions are logged in union audit logs visible to members.**

## Security Incidents

| Date | Type | Impact | Resolution |
|------|------|--------|------------|
| None | N/A | N/A | N/A |

We experienced zero security breaches in H1 2025.

## Infrastructure Updates

### Q1 2025
- ✅ Deployed Cloudflare WAF (DDoS protection)
- ✅ Launched Tor .onion mirror
- ✅ Integrated HashiCorp Vault for key management

### Q2 2025
- ✅ Set up multi-region read replicas
- ✅ Implemented automated backup drills
- ✅ Deployed monitoring dashboards

## Privacy Enhancements

- **Zero email collection:** All authentication now via WebAuthn/passkeys
- **Encrypted memberships:** Server cannot enumerate union members
- **Blind-signature voting:** 88% of votes cast anonymously (Mode B)
- **Log retention:** Reduced from indefinite to 24 hours
- **PII removal:** No IP addresses, user agents, or emails in logs

## Data Retention

| Data Type | Retention Period | Encryption |
|-----------|------------------|------------|
| User accounts | Until deletion | Client-side keys |
| Membership tokens | Until revocation | Client-side encrypted |
| Vote ballots (Mode B) | Permanent (encrypted) | Client-side encrypted |
| Logs | 24 hours | N/A (no PII) |
| Backups | 365 days | GPG encrypted |

## Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Cloudflare | CDN/WAF | None (proxied traffic only) |
| AWS S3 | Encrypted backups | Database dumps (encrypted) |
| Grafana Cloud | Monitoring | Aggregate metrics (no PII) |
| Sentry | Error tracking | Error logs (PII scrubbed) |

**We do not use any analytics or tracking services.**

## Compliance & Audits

- **GDPR:** Fully compliant (data export, deletion, privacy policy)
- **Security Audit:** Completed by [Firm Name] on [Date]
  - Report: [Link to public summary]
  - Findings: 0 critical, 2 medium (both resolved)

## Contact

- **Security Issues:** security@unitedUnions.app (PGP key: [fingerprint])
- **Privacy Questions:** privacy@unitedUnions.app
- **General Inquiries:** hello@unitedUnions.app

## Next Report

Our next transparency report will cover H2 2025 and will be published in January 2026.

---

**This report is published under Creative Commons CC-BY 4.0 license.**
```

**Data Collection Script:**
```typescript
// backend/scripts/generate-transparency-report.ts
import { contentDB, membershipDB, ballotDB } from '@shared/db/clients';

async function generateReport(startDate: string, endDate: string) {
  console.log('Generating transparency report...');
  
  // User statistics
  const { rows: [{ total_users }] } = await contentDB.query(
    'SELECT COUNT(*) as total_users FROM users WHERE created_at BETWEEN $1 AND $2',
    [startDate, endDate]
  );
  
  // Vote statistics (no per-user data)
  const { rows: voteStats } = await ballotDB.query(`
    SELECT 
      mode,
      COUNT(*) as count
    FROM (
      SELECT 'A' as mode FROM ballot_votes_mode_a WHERE created_at BETWEEN $1 AND $2
      UNION ALL
      SELECT 'B' as mode FROM ballot_votes_mode_b WHERE created_at BETWEEN $1 AND $2
    ) combined
    GROUP BY mode
  `, [startDate, endDate]);
  
  // Content moderation (aggregate only)
  const { rows: [{ reports }] } = await contentDB.query(
    'SELECT COUNT(*) as reports FROM reports WHERE created_at BETWEEN $1 AND $2',
    [startDate, endDate]
  );
  
  return {
    total_users,
    vote_stats: voteStats,
    content_reports: reports,
  };
}

generateReport('2025-01-01', '2025-06-30')
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
```

**Publishing:**
```markdown
# Publish transparency report

1. Generate report: `npm run generate-transparency-report`
2. Review and redact any sensitive info
3. Publish to website: `/transparency/2025-h1`
4. Announce on social media
5. Email users (optional)
```

**Testing Checkpoint:**
- [ ] Report template complete
- [ ] Data collection script works
- [ ] First report generated
- [ ] Published publicly

---

## 📊 Success Metrics

### **Privacy Compliance After Phase 2**

| Category | Phase 1 | Phase 2 | Target |
|----------|---------|---------|--------|
| Authentication | 90% | 95% | ✅ |
| Data Architecture | 80% | 90% | ✅ |
| Membership Storage | 90% | 95% | ✅ |
| Voting System | 80% | 85% | ✅ |
| Content & Messaging | 90% | 95% | ✅ |
| Logging & Analytics | 90% | 95% | ✅ |
| Network Security | 60% | 95% | ✅ |
| Cryptography | 95% | 100% | ✅ |
| Abuse Controls | 85% | 95% | ✅ |
| Operations | 50% | 90% | ✅ |
| **OVERALL** | **81%** | **93%** | ✅ |

### **Acceptance Criteria After Phase 2**

| AC | Description | Phase 1 | Phase 2 | Target |
|----|-------------|---------|---------|--------|
| AC1 | WebAuthn signup, no email | 100% | 100% | ✅ |
| AC2 | Encrypted membership retrieval | 100% | 100% | ✅ |
| AC3 | Mode B blind-signature voting | 100% | 100% | ✅ |
| AC4 | Aggregate-only admin view | 100% | 100% | ✅ |
| AC5 | 24h PII-free logs | 100% | 100% | ✅ |
| AC6 | CDN/Tor origin allowlist | 50% | 100% | ✅ |
| AC7 | Public privacy policy | 100% | 100% | ✅ |

**Overall:** ✅ **7/7 ACs passed** (100%)

### **Infrastructure Metrics**

| Metric | Target | Status |
|--------|--------|--------|
| API uptime | 99.9% | ✅ |
| P95 latency | <200ms | ✅ |
| Backup success rate | 100% | ✅ |
| Restore time | <30 min | ✅ |
| Replication lag | <10s | ✅ |
| CDN hit rate | >85% | ✅ |

---

## 💰 Final Budget

| Component | Monthly Cost |
|-----------|--------------|
| **Phase 1 (from before)** | **$175-375** |
| 3x PostgreSQL DBs | $75-150 |
| 4x Node.js services | $50-100 |
| Redis cache | $10-20 |
| **Phase 2 (new)** | **$85-174** |
| Cloudflare Pro | $20-25 |
| KMS/HSM (Vault Cloud) | $10-30 |
| Read replicas (2x) | $50-75 |
| Monitoring (Grafana Cloud) | $0-29 |
| Backup storage (S3) | $5-15 |
| **Total Phase 1+2** | **$260-549** |
| **Optimized Target** | **$300-400** |

**Optimization Notes:**
- Use Cloudflare free tier if traffic low
- Self-host Vault (saves $20/mo)
- Use smaller replica instances ($25/ea instead of $40)
- Grafana free tier sufficient for start

---

## ✅ Definition of Done

Phase 2 is complete when:

- [ ] Cloudflare CDN/WAF configured and active
- [ ] Custom firewall rules preventing abuse
- [ ] Tor .onion mirror accessible and working
- [ ] Origin server only accepts CDN/Tor traffic
- [ ] KMS/HSM integrated (Vault or AWS KMS)
- [ ] Quarterly key rotation tested
- [ ] Read replicas deployed (2 regions)
- [ ] Automated backups running daily
- [ ] Quarterly restore drill completed successfully
- [ ] Monitoring dashboards deployed (Grafana)
- [ ] Alerts configured and tested
- [ ] Incident response runbooks documented
- [ ] First transparency report published
- [ ] 93% privacy compliance achieved
- [ ] All 7 ACs passed

---

## 📚 Next Steps (Future Enhancements)

Beyond Phase 2 (optional improvements for 95%+ compliance):

### **Phase 3: Advanced Features** (if needed)
1. **Mode C Voting** (end-to-end verifiable)
   - Helios-like homomorphic encryption
   - Zero-knowledge proofs
   - Public bulletin board
   - Time: 2-3 months

2. **Social Recovery** (account recovery)
   - Shamir secret sharing
   - Trusted contacts
   - Encrypted shards
   - Time: 3-4 weeks

3. **Multi-Sig Admin** (governance)
   - Require multiple admins for critical actions
   - Union leadership elections
   - Time: 2-3 weeks

4. **Proof-of-Work Signup** (Sybil resistance)
   - Adjustable difficulty
   - Browser-based PoW
   - Time: 1-2 weeks

**Timeline:** 3-4 months additional  
**Cost:** +$50-100/mo  
**Compliance:** 95-98%

---

**END OF PHASE 2 IMPLEMENTATION PLAN**

---

For questions or support during implementation, refer to:
- [SECURITY_ACCEPTANCE_CRITERIA.md](SECURITY_ACCEPTANCE_CRITERIA.md) - Full requirements
- [SECURITY_ACCEPTANCE_CRITERIA_PHASE_ONE.md](SECURITY_ACCEPTANCE_CRITERIA_PHASE_ONE.md) - Phase 1 plan
- [SECURITY_STATUS.md](SECURITY_STATUS.md) - Current security status
- [replit.md](replit.md) - Project overview
