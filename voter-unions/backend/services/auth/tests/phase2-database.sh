#!/bin/bash

# Phase 2: Database Checks
# Run these tests to verify database setup

echo "=========================================="
echo "Phase 2: Database Checks"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  WARNING: DATABASE_URL not set"
  echo "Please set DATABASE_URL environment variable"
  echo "Example: export DATABASE_URL=postgresql://user:password@localhost:5432/voter_unions_auth"
  exit 1
fi

echo "Using database: $DATABASE_URL"
echo ""

# Test 5: Check secure_audit_logs table exists
echo "Test 5: Verify secure_audit_logs table exists..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT to_regclass('secure_audit_logs');" 2>/dev/null)

if [[ "$TABLE_EXISTS" == *"secure_audit_logs"* ]]; then
  echo "✅ PASS: secure_audit_logs table exists"
else
  echo "❌ FAIL: secure_audit_logs table not found"
  echo "Run: psql \$DATABASE_URL -f src/audit/schema.sql"
  exit 1
fi
echo ""

# Test 6: Verify encryption key is set
echo "Test 6: Verify AUDIT_ENCRYPTION_KEY is set..."
if [ -z "$AUDIT_ENCRYPTION_KEY" ]; then
  echo "❌ FAIL: AUDIT_ENCRYPTION_KEY not set"
  echo "Generate key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  exit 1
fi

KEY_LENGTH=${#AUDIT_ENCRYPTION_KEY}
if [ "$KEY_LENGTH" -eq 64 ]; then
  echo "✅ PASS: AUDIT_ENCRYPTION_KEY is set (64 characters)"
else
  echo "❌ FAIL: AUDIT_ENCRYPTION_KEY has wrong length ($KEY_LENGTH, expected 64)"
  exit 1
fi
echo ""

# Test 7: Verify all required columns exist
echo "Test 7: Verify database schema columns..."
REQUIRED_COLUMNS=(
  "id"
  "user_id_encrypted"
  "user_id_iv"
  "user_id_tag"
  "action_type"
  "entity_type"
  "device_fingerprint"
  "platform"
  "timestamp_bucket"
  "success"
  "created_at"
)

MISSING_COLUMNS=()
for col in "${REQUIRED_COLUMNS[@]}"; do
  COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'secure_audit_logs'
      AND column_name = '$col';
  " 2>/dev/null)

  if [[ -z "$COLUMN_EXISTS" ]]; then
    MISSING_COLUMNS+=("$col")
  fi
done

if [ ${#MISSING_COLUMNS[@]} -eq 0 ]; then
  echo "✅ PASS: All required columns exist"
else
  echo "❌ FAIL: Missing columns: ${MISSING_COLUMNS[*]}"
  exit 1
fi
echo ""

echo "=========================================="
echo "Phase 2: Database Checks Complete"
echo "All tests passed! ✅"
echo "=========================================="
