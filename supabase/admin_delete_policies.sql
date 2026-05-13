-- Run this in the Supabase SQL Editor to allow admin users to delete rows.
-- These policies complement the service-role approach: even without the
-- service role key, an authenticated admin can delete via the anon client.

-- Helper: returns true when the calling user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  );
$$;

-- games: admins can delete any row
DROP POLICY IF EXISTS "Admins can delete games" ON games;
CREATE POLICY "Admins can delete games" ON games
  FOR DELETE TO authenticated
  USING (is_admin());

-- sessions: admins can delete any row
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;
CREATE POLICY "Admins can delete sessions" ON sessions
  FOR DELETE TO authenticated
  USING (is_admin());

-- session_registrations: admins can delete any row
DROP POLICY IF EXISTS "Admins can delete session_registrations" ON session_registrations;
CREATE POLICY "Admins can delete session_registrations" ON session_registrations
  FOR DELETE TO authenticated
  USING (is_admin());

-- trash_talk: admins can delete any row
DROP POLICY IF EXISTS "Admins can delete trash_talk" ON trash_talk;
CREATE POLICY "Admins can delete trash_talk" ON trash_talk
  FOR DELETE TO authenticated
  USING (is_admin());
