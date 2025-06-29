// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/manual/getting_started/javascript

import { serve } from "npm:@supabase/functions-js";
import { createClient } from "npm:@supabase/supabase-js";
import Stripe from "npm:stripe@12.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionPlan {
  name: string;
  tokens: number;
  price: number;
  priceId: string;
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  'free': {
    name: 'Free',
    tokens: 50,
    price: 0,
    priceId: '',
  },
  'starter': {
    name: 'Starter',
    tokens: 500,
    price: 19.99,
    priceId: 'price_starter_monthly',
  },
  'pro': {
    name: 'Professional',
    tokens: 2000,
    price: 49.99,
    priceId: 'price_pro_monthly',
  },
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
    const { userId, plan, successUrl, cancelUrl } = await req.json();

    if (!userId || !plan || !successUrl || !cancelUrl) {
      throw new Error("Missing required parameters");
    }

    // Get plan details
    const planDetails = SUBSCRIPTION_PLANS[plan];
    if (!planDetails || !planDetails.priceId) {
      throw new Error("Invalid plan or plan not available for purchase");
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !userProfile) {
      throw new Error("User not found");
    }

    // Get existing subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Create or retrieve Stripe customer
    let stripeCustomerId = subscription?.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userProfile.email || undefined,
        name: userProfile.full_name || undefined,
        metadata: {
          userId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: planDetails.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
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