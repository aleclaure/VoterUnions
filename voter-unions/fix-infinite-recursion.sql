-- Fix for infinite recursion error in union_members policy
-- Run this in your Supabase SQL Editor

-- Drop the old policy with circular reference
DROP POLICY IF EXISTS "Members can view union memberships" ON union_members;

-- Create new policy without circular reference
CREATE POLICY "Members can view union memberships" ON union_members 
FOR SELECT 
USING (auth.uid() = user_id);
