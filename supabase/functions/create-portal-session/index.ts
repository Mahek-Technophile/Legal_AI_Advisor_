// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/getting_started/javascript

import { serve } from "npm:@supabase/functions-js";
import { createClient } from "npm:@supabase/supabase-js";
import Stripe from "npm:stripe@12.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Parse request body
    const { userId, returnUrl } = await req.json();

    if (!userId || !returnUrl) {
      throw new Error("Missing required parameters");
    }

    // Get existing subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (subError || !subscription || !subscription.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});