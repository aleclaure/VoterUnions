-- Migration: Email OTP to Email/Password Authentication with User Profiles
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS username_normalized TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create function to normalize usernames (lowercase, trim whitespace)
CREATE OR REPLACE FUNCTION normalize_username(username TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(username));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create unique constraint on normalized username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_normalized_unique 
ON profiles(username_normalized) 
WHERE username_normalized IS NOT NULL;

-- Step 4: Create trigger to auto-update username_normalized when display_name changes
CREATE OR REPLACE FUNCTION update_username_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.username_normalized = normalize_username(NEW.display_name);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_username_normalized_trigger ON profiles;
CREATE TRIGGER profiles_username_normalized_trigger
  BEFORE INSERT OR UPDATE OF display_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_username_normalized();

-- Step 5: Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Backfill existing users with temporary display names
-- This ensures no NULL values for existing users
DO $$
DECLARE
  profile_record RECORD;
  temp_username TEXT;
  counter INTEGER := 0;
BEGIN
  FOR profile_record IN SELECT id, email FROM profiles WHERE display_name IS NULL
  LOOP
    counter := counter + 1;
    -- Generate temporary username from email or random string
    temp_username := 'user_' || SUBSTRING(MD5(profile_record.email || profile_record.id::text), 1, 8);
    
    UPDATE profiles 
    SET display_name = temp_username
    WHERE id = profile_record.id;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % existing profiles with temporary usernames', counter;
END $$;

-- Step 7: Now make display_name NOT NULL (after backfilling)
ALTER TABLE profiles
ALTER COLUMN display_name SET NOT NULL;

-- Step 8: Add index on user_id columns for faster profile lookups
CREATE INDEX IF NOT EXISTS debates_created_by_idx ON debates(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS arguments_user_id_idx ON arguments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS union_members_user_id_idx ON union_members(user_id);
CREATE INDEX IF NOT EXISTS pledges_user_id_idx ON pledges(user_id);
CREATE INDEX IF NOT EXISTS milestones_created_by_idx ON milestones(created_by) WHERE created_by IS NOT NULL;

-- Step 9: Create function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET last_seen = NOW() WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Update RLS policies to work with new profile fields
-- (Existing RLS policies should still work, but let's ensure profiles are readable)

-- Allow users to read all profiles (for displaying usernames)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 11: Enable Realtime for profiles table (optional, for live username updates)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Migration complete!
-- Next steps:
-- 1. Enable Email/Password provider in Supabase Authentication settings
-- 2. Configure email templates for confirmation and password reset
-- 3. Set password policy (minimum 8 chars, require letters + numbers)
-- 4. Enable email confirmation requirement
-- 5. Update app to use new auth flow
