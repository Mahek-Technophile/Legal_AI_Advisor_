/*
  # Subscription and Token Management System

  1. New Tables
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `plan` (text)
      - `tokens_remaining` (integer)
      - `tokens_used` (integer)
      - `last_reset_date` (timestamp)
      - `next_reset_date` (timestamp)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `token_usage_records`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `feature` (text)
      - `tokens_used` (integer)
      - `document_name` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  tokens_remaining integer NOT NULL DEFAULT 50,
  tokens_used integer NOT NULL DEFAULT 0,
  last_reset_date timestamptz NOT NULL DEFAULT now(),
  next_reset_date timestamptz NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create token_usage_records table
CREATE TABLE IF NOT EXISTS token_usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  tokens_used integer NOT NULL,
  document_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for token_usage_records
CREATE POLICY "Users can view own token usage"
  ON token_usage_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
  ON token_usage_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_reset_date ON user_subscriptions(next_reset_date);

CREATE INDEX IF NOT EXISTS idx_token_usage_records_user_id ON token_usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_feature ON token_usage_records(feature);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_created_at ON token_usage_records(created_at);