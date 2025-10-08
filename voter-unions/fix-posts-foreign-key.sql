-- Fix missing foreign key relationship between posts and profiles
-- This will allow Supabase to join posts with their author profiles

-- First, check if the foreign key exists
-- If it doesn't, add it

DO $$ 
BEGIN
    -- Check if foreign key exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_author_id_fkey' 
        AND table_name = 'posts'
    ) THEN
        -- Add the foreign key
        ALTER TABLE posts
        ADD CONSTRAINT posts_author_id_fkey
        FOREIGN KEY (author_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key posts_author_id_fkey created successfully';
    ELSE
        RAISE NOTICE 'Foreign key posts_author_id_fkey already exists';
    END IF;
END $$;

-- Also ensure username field exists in profiles (since it's showing as NULL)
-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE profiles ADD COLUMN username TEXT;
        RAISE NOTICE 'Added username column to profiles table';
    ELSE
        RAISE NOTICE 'username column already exists in profiles table';
    END IF;
END $$;

-- Populate username from display_name for existing users who don't have one
UPDATE profiles
SET username = LOWER(display_name)
WHERE username IS NULL AND display_name IS NOT NULL;
