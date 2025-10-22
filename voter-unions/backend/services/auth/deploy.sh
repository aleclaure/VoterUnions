#!/bin/bash

# Railway Deployment Script - Hybrid Auth Backend
# Run this after: npx @railway/cli login && npx @railway/cli link

set -e  # Exit on error

echo "========================================="
echo "Railway Deployment - Hybrid Auth Backend"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is available
if ! command -v railway &> /dev/null && ! npx @railway/cli --version &> /dev/null; then
    echo -e "${RED}✗ Railway CLI not found${NC}"
    echo "Install with: npm install -g @railway/cli"
    echo "Or use: npx @railway/cli"
    exit 1
fi

RAILWAY_CMD="npx @railway/cli"

# Check if logged in
echo -e "${YELLOW}Checking Railway authentication...${NC}"
if ! $RAILWAY_CMD whoami &> /dev/null; then
    echo -e "${RED}✗ Not logged in to Railway${NC}"
    echo "Run: $RAILWAY_CMD login"
    exit 1
fi
echo -e "${GREEN}✓ Logged in to Railway${NC}"
echo ""

# Check if linked to project
echo -e "${YELLOW}Checking project link...${NC}"
if ! $RAILWAY_CMD status &> /dev/null; then
    echo -e "${RED}✗ Not linked to a Railway project${NC}"
    echo "Run: $RAILWAY_CMD link"
    exit 1
fi
echo -e "${GREEN}✓ Linked to Railway project${NC}"
echo ""

# Build locally first to catch errors
echo -e "${YELLOW}Building locally...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Check required environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "REFRESH_SECRET")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if ! $RAILWAY_CMD variables --json | grep -q "\"$VAR\""; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    echo ""
    echo "Set variables with:"
    echo "  $RAILWAY_CMD variables set JWT_SECRET=<your-secret>"
    echo "  $RAILWAY_CMD variables set REFRESH_SECRET=<your-secret>"
    exit 1
fi
echo -e "${GREEN}✓ All required variables configured${NC}"
echo ""

# Ask about database migration
echo -e "${YELLOW}Database Migration${NC}"
echo "Have you applied the database migration (001_add_username_password.sql)?"
echo "This adds username and password_hash columns to the users table."
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    echo ""
    echo "Apply migration with:"
    echo "  psql \$DATABASE_URL < migrations/001_add_username_password.sql"
    echo ""
    echo "Or via Railway dashboard:"
    echo "  1. Go to PostgreSQL service"
    echo "  2. Click 'Data' tab"
    echo "  3. Run the SQL from migrations/001_add_username_password.sql"
    exit 0
fi

# Deploy
echo ""
echo -e "${YELLOW}Deploying to Railway...${NC}"
$RAILWAY_CMD up

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Deployment successful!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: $RAILWAY_CMD logs"
echo "  2. Check status: $RAILWAY_CMD status"
echo "  3. Test endpoints: curl https://voterunions-production.up.railway.app/health"
echo ""
echo "New endpoints available:"
echo "  POST /auth/set-password - Set username/password"
echo "  POST /auth/login-hybrid - Two-factor login"
echo ""
