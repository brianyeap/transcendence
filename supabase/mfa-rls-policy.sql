-- ==============================================================================
-- Supabase RLS Policy Example: Restricting Sensitive Tables to AAL2 (TOTP MFA)
-- ==============================================================================
--
-- Background:
-- Supabase Auth encodes the user's current Authenticator Assurance Level in the
-- JWT claims under the 'aal' key:
--   - 'aal1': User authenticated via standard factor (Password, Google OAuth, Magic Link)
--   - 'aal2': User additionally completed a second factor challenge (TOTP Authenticator)
--
-- Postgres Row Level Security (RLS) can inspect the active JWT via:
--   (select auth.jwt()->>'aal')
--
-- This guarantees database-level security even if an attacker bypasses client UI
-- or steals an AAL1 session cookie.
-- ==============================================================================

-- 1. Enable RLS on the target table (e.g. trades, match_players, or security_audit_logs)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- 2. Restrict INSERT (e.g., executing a trade) to sessions verified with AAL2
CREATE POLICY "Require AAL2 to place trades"
ON trades
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.jwt()->>'aal') = 'aal2'
);

-- 3. Optional: Allow users without MFA enrolled to execute trades,
--    but REQUIRE AAL2 if they DO have MFA enrolled:
--
-- CREATE POLICY "Require AAL2 if MFA is enrolled, otherwise allow AAL1"
-- ON trades
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   (select auth.jwt()->>'aal') = 'aal2'
--   OR
--   NOT EXISTS (
--     SELECT 1 FROM auth.mfa_factors
--     WHERE auth.mfa_factors.user_id = auth.uid()
--     AND auth.mfa_factors.status = 'verified'
--   )
-- );

-- 4. Restrict UPDATE / DELETE on critical settings (e.g., profiles security fields)
CREATE POLICY "Require AAL2 to modify sensitive profile settings"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) = id
  AND
  (select auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  (select auth.uid()) = id
  AND
  (select auth.jwt()->>'aal') = 'aal2'
);
