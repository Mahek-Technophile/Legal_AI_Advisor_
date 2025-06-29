/*
  # Add Firebase UID column to user_profiles table

  1. Schema Changes
    - Add `firebase_uid` column to `user_profiles` table as TEXT with UNIQUE constraint
    - This will store the Firebase user ID while keeping the UUID primary key
    
  2. Security
    - Update RLS policies to work with the new firebase_uid column
    - Maintain existing security model
    
  3. Data Migration
    - No existing data migration needed as this is a new column
*/

-- Add firebase_uid column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN firebase_uid text UNIQUE;
  END IF;
END $$;

-- Create index for firebase_uid for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles (firebase_uid);

-- Update RLS policies to work with firebase_uid
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new RLS policies using firebase_uid
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (firebase_uid = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (firebase_uid = auth.jwt() ->> 'sub');