-- Power Tracker Security Fix Migration
-- Run this in Supabase SQL Editor to add soft-delete support to existing tables

-- Add deleted_at columns to existing tables
ALTER TABLE power_pledges ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE power_bill_politicians ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update RLS policies for power_pledges
DROP POLICY IF EXISTS "Anyone can view pledges" ON power_pledges;
CREATE POLICY "Anyone can view pledges" ON power_pledges FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own pledges" ON power_pledges;
CREATE POLICY "Users can update their own pledges" ON power_pledges FOR UPDATE USING (auth.uid() = user_id);

-- Update RLS policies for power_bill_politicians
DROP POLICY IF EXISTS "Anyone can view bill-politician relationships" ON power_bill_politicians;
CREATE POLICY "Anyone can view bill-politician relationships" ON power_bill_politicians FOR SELECT USING (deleted_at IS NULL);

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('power_pledges', 'power_bill_politicians') 
  AND column_name = 'deleted_at';
