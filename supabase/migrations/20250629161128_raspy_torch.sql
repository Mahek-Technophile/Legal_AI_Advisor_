/*
  # Fix RLS policies for user_profiles table

  1. Security Updates
    - Drop existing RLS policies that rely on Firebase JWT claims
    - Create new RLS policies that work with the current authentication flow
    - Allow authenticated users to create and manage their own profiles
    - Temporarily allow profile creation during the authentication flow

  2. Changes
    - Remove Firebase JWT-based policies
    - Add service role bypass for profile creation
    - Add proper user-based policies for profile management
*/

-- Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create new policies that work with the current setup
-- Allow service role to insert profiles (for initial profile creation)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to select profiles (for profile retrieval)
CREATE POLICY "Service role can select profiles"
  ON user_profiles
  FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to update profiles (for profile updates)
CREATE POLICY "Service role can update profiles"
  ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true);

-- Allow authenticated users to view their own profiles by firebase_uid
CREATE POLICY "Users can view own profile by firebase_uid"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow authenticated users to update their own profiles by firebase_uid
CREATE POLICY "Users can update own profile by firebase_uid"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow authenticated users to insert their own profiles by firebase_uid
CREATE POLICY "Users can insert own profile by firebase_uid"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (firebase_uid = current_setting('request.jwt.claims', true)::json->>'sub');