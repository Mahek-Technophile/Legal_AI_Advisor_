-- Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile by firebase_uid" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile by firebase_uid" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile by firebase_uid" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON user_profiles;

-- Create service role policies for admin operations
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select profiles"
  ON user_profiles
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update profiles"
  ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true);

-- Create authenticated user policies with proper Firebase UID checks
CREATE POLICY "Users can insert own profile by firebase_uid"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub');

CREATE POLICY "Users can update own profile by firebase_uid"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub');

CREATE POLICY "Users can view own profile by firebase_uid"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub');

-- Fix related tables' policies to use the correct user_id reference through firebase_uid

-- Fix user_subscriptions policies
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

-- Fix token_usage_records policies
DROP POLICY IF EXISTS "Users can insert own token usage" ON token_usage_records;
DROP POLICY IF EXISTS "Users can view own token usage" ON token_usage_records;

CREATE POLICY "Users can insert own token usage"
  ON token_usage_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can view own token usage"
  ON token_usage_records
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

-- Fix user_activity_logs policies
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON user_activity_logs;

CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix document_analyses policies
DROP POLICY IF EXISTS "Users can insert own document analyses" ON document_analyses;
DROP POLICY IF EXISTS "Users can view own document analyses" ON document_analyses;
DROP POLICY IF EXISTS "Users can update own document analyses" ON document_analyses;
DROP POLICY IF EXISTS "Users can delete own document analyses" ON document_analyses;

CREATE POLICY "Users can insert own document analyses"
  ON document_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can view own document analyses"
  ON document_analyses
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can update own document analyses"
  ON document_analyses
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can delete own document analyses"
  ON document_analyses
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

-- Fix batch_analyses policies
DROP POLICY IF EXISTS "Users can insert own batch analyses" ON batch_analyses;
DROP POLICY IF EXISTS "Users can view own batch analyses" ON batch_analyses;
DROP POLICY IF EXISTS "Users can update own batch analyses" ON batch_analyses;
DROP POLICY IF EXISTS "Users can delete own batch analyses" ON batch_analyses;

CREATE POLICY "Users can insert own batch analyses"
  ON batch_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can view own batch analyses"
  ON batch_analyses
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can update own batch analyses"
  ON batch_analyses
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );

CREATE POLICY "Users can delete own batch analyses"
  ON batch_analyses
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims'::text, true))::json ->> 'sub'
    )
  );