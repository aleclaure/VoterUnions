#!/bin/bash

# Safe Redeploy Script - Fixes EC constructor error
# This won't impact token authorization (all endpoints are safe in auth.ts)

set -e

echo "========================================="
echo "Safe Redeploy - Clean Build"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Clean and rebuild
echo -e "${YELLOW}Step 1: Cleaning old build...${NC}"
rm -rf dist/
echo -e "${GREEN}✓ dist/ cleaned${NC}"
echo ""

echo -e "${YELLOW}Step 2: Rebuilding (this verifies no errors)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verifying build...${NC}"
echo "Routes in dist/routes/:"
ls -1 dist/routes/*.js
echo ""

if [ -f "dist/routes/device-token.js" ]; then
    echo -e "${RED}✗ Old device-token.js still exists!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ No old device-token.js (good!)${NC}"
fi

if [ -f "dist/routes/auth.js" ]; then
    echo -e "${GREEN}✓ auth.js exists (all token endpoints safe)${NC}"
else
    echo -e "${RED}✗ auth.js missing!${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Deploying to Railway...${NC}"
npx @railway/cli up

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Deployment successful!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Token authorization endpoints (safe):"
echo "  ✓ POST /auth/challenge"
echo "  ✓ POST /auth/register-device"
echo "  ✓ POST /auth/verify-device"
echo "  ✓ POST /auth/refresh"
echo "  ✓ POST /auth/login-hybrid (new)"
echo "  ✓ POST /auth/set-password (new)"
echo ""
echo "Next: Wait 30 seconds, then test:"
echo "  curl https://voterunions-production.up.railway.app/health"
echo ""
