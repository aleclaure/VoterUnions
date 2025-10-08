-- Fix for existing profiles missing username_normalized
-- This updates any profile that has a display_name but missing username_normalized

UPDATE profiles
SET username_normalized = LOWER(display_name)
WHERE display_name IS NOT NULL 
  AND (username_normalized IS NULL OR username_normalized = '');

-- Verify the fix worked
SELECT id, email, display_name, username_normalized 
FROM profiles 
WHERE display_name IS NOT NULL;
