#!/bin/bash

# Phase 1: Pre-flight Checks
# Run these tests before starting the server

echo "=========================================="
echo "Phase 1: Pre-flight Checks"
echo "=========================================="
echo ""

# Test 1: Verify audit service import
echo "Test 1: Verify audit service import..."
if grep -q "import.*auditService.*from.*audit/AuditService" src/routes/auth.ts; then
  echo "✅ PASS: Audit service import found"
else
  echo "❌ FAIL: Audit service import missing"
  exit 1
fi
echo ""

# Test 2: Count audit calls
echo "Test 2: Count audit logging calls..."
AUDIT_COUNT=$(grep -c "auditService.logEvent" src/routes/auth.ts)
if [ "$AUDIT_COUNT" -eq 15 ]; then
  echo "✅ PASS: Found 15 audit calls (expected)"
else
  echo "❌ FAIL: Found $AUDIT_COUNT audit calls (expected 15)"
  exit 1
fi
echo ""

# Test 3: TypeScript compilation
echo "Test 3: TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "❌ FAIL: TypeScript errors found"
  npx tsc --noEmit
  exit 1
else
  echo "✅ PASS: No TypeScript errors"
fi
echo ""

# Test 4: Verify all ActionTypes are valid
echo "Test 4: Verify ActionType validity..."
INVALID_ACTIONS=$(grep "actionType:" src/routes/auth.ts | \
  grep -v "signup_success\|signup_failed\|login_success\|login_failed\|password_changed\|token_refreshed" | \
  grep "actionType:")

if [ -z "$INVALID_ACTIONS" ]; then
  echo "✅ PASS: All actionType values are valid"
else
  echo "❌ FAIL: Found invalid actionType values:"
  echo "$INVALID_ACTIONS"
  exit 1
fi
echo ""

echo "=========================================="
echo "Phase 1: Pre-flight Checks Complete"
echo "All tests passed! ✅"
echo "=========================================="
