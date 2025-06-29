// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/getting_started/javascript

import { serve } from "npm:@supabase/functions-js";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Token packages
const TOKEN_PACKAGES = [
  {
    id: 'tokens_50',
    name: '50 Tokens',
    tokens: 50,
    price: 4.99
  },
  {
    id: 'tokens_100',
    name: '100 Tokens',
    tokens: 100,
    price: 8.99
  },
  {
    id: 'tokens_500',
    name: '500 Tokens',
    tokens: 500,
    price: 39.99
  },
  {
    id: 'tokens_1000',
    name: '1000 Tokens',
    tokens: 1000,
    price: 69.99
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const revenueCatApiKey = Deno.env.get("REVENUE_CAT_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId, packageId } = await req.json();

    if (!userId || !packageId) {
      throw new Error("Missing required parameters");
    }

    // Find the package
    const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
    if (!tokenPackage) {
      throw new Error("Invalid token package");
    }

    // Get user subscription
    const { data: subscription, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
    }

    // Update token balance
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        tokens_remaining: subscription.tokens_remaining + tokenPackage.tokens,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(`Failed to update token balance: ${updateError.message}`);
    }

    // Record token purchase
    const { error: recordError } = await supabase
      .from("token_usage_records")
      .insert({
        user_id: userId,
        feature: "TOKEN_PURCHASE",
        tokens_used: -tokenPackage.tokens, // Negative to indicate addition
        document_name: `Purchased ${tokenPackage.name}`
      });

    if (recordError) {
      throw new Error(`Failed to record token purchase: ${recordError.message}`);
    }

    // Log activity
    await supabase
      .from("user_activity_logs")
      .insert({
        user_id: userId,
        activity_type: "token_purchase",
        activity_description: `Purchased ${tokenPackage.tokens} tokens`,
        metadata: {
          package_id: packageId,
          package_name: tokenPackage.name,
          tokens: tokenPackage.tokens,
          price: tokenPackage.price
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        tokens: tokenPackage.tokens,
        newBalance: subscription.tokens_remaining + tokenPackage.tokens
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});