#!/bin/bash

# Master Test Runner for Day 2 Audit Integration Tests
# Runs all test phases in sequence

set -e  # Exit on error

echo "=============================================="
echo "Day 2 Audit Integration - Full Test Suite"
echo "=============================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "src/routes/auth.ts" ]; then
  echo "❌ Error: Must run from backend/services/auth directory"
  exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall success
OVERALL_SUCCESS=true

# Phase 1: Pre-flight Checks
echo "▶  Running Phase 1: Pre-flight Checks..."
echo ""
if bash tests/phase1-preflight.sh; then
  echo -e "${GREEN}✅ Phase 1: PASSED${NC}"
else
  echo -e "${RED}❌ Phase 1: FAILED${NC}"
  OVERALL_SUCCESS=false
  exit 1  # Stop if preflight fails
fi
echo ""

# Phase 2: Database Checks
echo "▶  Running Phase 2: Database Checks..."
echo ""
if bash tests/phase2-database.sh; then
  echo -e "${GREEN}✅ Phase 2: PASSED${NC}"
else
  echo -e "${RED}❌ Phase 2: FAILED${NC}"
  OVERALL_SUCCESS=false
  exit 1  # Stop if database checks fail
fi
echo ""

# Check if server is running
echo "▶  Checking if auth service is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Auth service is running${NC}"
else
  echo -e "${YELLOW}⚠️  Auth service not running at http://localhost:3001${NC}"
  echo "Please start the server with: npm run dev"
  echo ""
  echo "Would you like to continue with remaining tests? (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    exit 1
  fi
fi
echo ""

# Phase 3-4: Endpoint Testing
echo "▶  Running Phase 3-4: Endpoint Testing..."
echo ""
if npx tsx tests/phase3-endpoints.ts; then
  echo -e "${GREEN}✅ Phase 3-4: PASSED${NC}"
else
  echo -e "${RED}❌ Phase 3-4: FAILED${NC}"
  OVERALL_SUCCESS=false
fi
echo ""

# Phase 5: Audit Verification
echo "▶  Running Phase 5: Audit Verification..."
echo ""
if npx tsx tests/phase5-audit-verification.ts; then
  echo -e "${GREEN}✅ Phase 5: PASSED${NC}"
else
  echo -e "${RED}❌ Phase 5: FAILED${NC}"
  OVERALL_SUCCESS=false
fi
echo ""

# Phase 6: Performance Testing
echo "▶  Running Phase 6: Performance Testing..."
echo ""
if npx tsx tests/phase6-performance.ts; then
  echo -e "${GREEN}✅ Phase 6: PASSED${NC}"
else
  echo -e "${YELLOW}⚠️  Phase 6: Performance issues detected${NC}"
  # Don't fail overall - performance is a warning
fi
echo ""

# Final Summary
echo "=============================================="
echo "Test Suite Complete"
echo "=============================================="
echo ""

if [ "$OVERALL_SUCCESS" = true ]; then
  echo -e "${GREEN}🎉 All critical tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review test output for any warnings"
  echo "  2. Check audit logs in database"
  echo "  3. Proceed to Day 3 (production testing)"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "Please review the errors above and fix before proceeding."
  exit 1
fi
