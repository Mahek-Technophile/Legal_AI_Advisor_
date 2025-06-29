/*
  # Fix RLS policies for Firebase authentication

  1. Security Changes
    - Drop existing RLS policies that use jwt() function
    - Create new RLS policies that work with Firebase UID
    - Allow authenticated users to insert profiles with their Firebase UID
    - Allow users to read and update their own profiles based on Firebase UID

  2. Policy Details
    - INSERT: Allow users to create profiles where firebase_uid matches their token
    - SELECT: Allow users to read their own profile data
    - UPDATE: Allow users to update their own profile data

  Note: These policies assume Firebase JWT tokens are being passed to Supabase
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new policies that work with Firebase authentication
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- Also fix related table policies to use the correct user ID reference
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
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
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
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can view own token usage"
  ON token_usage_records
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

-- Fix user_activity_logs policies
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;

CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

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
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can view own document analyses"
  ON document_analyses
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can update own document analyses"
  ON document_analyses
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can delete own document analyses"
  ON document_analyses
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
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
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can view own batch analyses"
  ON batch_analyses
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can update own batch analyses"
  ON batch_analyses
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );

CREATE POLICY "Users can delete own batch analyses"
  ON batch_analyses
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE firebase_uid = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    )
  );