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
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session, supabase);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice, supabase);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
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

async function handleCheckoutSessionCompleted(session, supabase) {
  const { userId, plan } = session.metadata;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId || !plan || !customerId || !subscriptionId) {
    throw new Error("Missing required metadata");
  }

  // Get plan details
  const planDetails = SUBSCRIPTION_PLANS[plan];
  if (!planDetails) {
    throw new Error("Invalid plan");
  }

  // Calculate next reset date (1 month from now)
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Update or create subscription
  const { data, error } = await supabase
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      plan,
      tokens_remaining: planDetails.tokens,
      tokens_used: 0,
      last_reset_date: now.toISOString(),
      next_reset_date: nextMonth.toISOString(),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      is_active: true,
      updated_at: now.toISOString()
    })
    .select();

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Log activity
  await supabase.from("user_activity_logs").insert({
    user_id: userId,
    activity_type: "subscription",
    activity_description: `Subscribed to ${planDetails.name} plan`,
    metadata: {
      plan,
      tokens: planDetails.tokens,
      price: planDetails.price,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId
    }
  });

  return data;
}

async function handleSubscriptionUpdated(subscription, supabase) {
  const { userId, plan } = subscription.metadata;
  
  if (!userId || !plan) {
    throw new Error("Missing required metadata");
  }

  // Get plan details
  const planDetails = SUBSCRIPTION_PLANS[plan];
  if (!planDetails) {
    throw new Error("Invalid plan");
  }

  // Get current subscription
  const { data: currentSub, error: subError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (subError && subError.code !== "PGRST116") {
    throw new Error(`Failed to get subscription: ${subError.message}`);
  }

  // If subscription status is active or trialing, update the subscription
  if (subscription.status === "active" || subscription.status === "trialing") {
    const now = new Date();
    
    // If we already have a subscription, keep the tokens_remaining and tokens_used
    const tokensRemaining = currentSub ? currentSub.tokens_remaining : planDetails.tokens;
    const tokensUsed = currentSub ? currentSub.tokens_used : 0;
    
    // Update subscription
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        plan,
        tokens_remaining: tokensRemaining,
        tokens_used: tokensUsed,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        is_active: true,
        updated_at: now.toISOString()
      });

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    // Log activity
    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      activity_type: "subscription",
      activity_description: `Subscription updated to ${planDetails.name} plan`,
      metadata: {
        plan,
        tokens: planDetails.tokens,
        price: planDetails.price,
        stripe_subscription_id: subscription.id,
        status: subscription.status
      }
    });
  }
}

async function handleSubscriptionDeleted(subscription, supabase) {
  // Get subscription from database
  const { data: subData, error: subError } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (subError) {
    throw new Error(`Failed to get subscription: ${subError.message}`);
  }

  const userId = subData.user_id;

  // Update subscription to free plan
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      plan: "free",
      tokens_remaining: SUBSCRIPTION_PLANS.free.tokens,
      tokens_used: 0,
      last_reset_date: now.toISOString(),
      next_reset_date: nextMonth.toISOString(),
      is_active: true,
      updated_at: now.toISOString()
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Log activity
  await supabase.from("user_activity_logs").insert({
    user_id: userId,
    activity_type: "subscription",
    activity_description: "Subscription canceled, reverted to Free plan",
    metadata: {
      plan: "free",
      tokens: SUBSCRIPTION_PLANS.free.tokens,
      previous_subscription_id: subscription.id
    }
  });
}

async function handleInvoicePaymentSucceeded(invoice, supabase) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Get subscription from Stripe
  const { data: subData, error: subError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (subError) {
    throw new Error(`Failed to get subscription: ${subError.message}`);
  }

  const userId = subData.user_id;
  const plan = subData.plan;
  const planDetails = SUBSCRIPTION_PLANS[plan];

  // If this is a renewal, reset the tokens
  if (invoice.billing_reason === "subscription_cycle") {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        tokens_remaining: planDetails.tokens,
        tokens_used: 0,
        last_reset_date: now.toISOString(),
        next_reset_date: nextMonth.toISOString(),
        is_active: true,
        updated_at: now.toISOString()
      })
      .eq("id", subData.id);

    if (error) {
      throw new Error(`Failed to reset tokens: ${error.message}`);
    }

    // Log activity
    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      activity_type: "subscription",
      activity_description: `Monthly renewal for ${planDetails.name} plan`,
      metadata: {
        plan,
        tokens_reset: planDetails.tokens,
        invoice_id: invoice.id
      }
    });
  }
}

async function handleInvoicePaymentFailed(invoice, supabase) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Get subscription from database
  const { data: subData, error: subError } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (subError) {
    throw new Error(`Failed to get subscription: ${subError.message}`);
  }

  const userId = subData.user_id;

  // Log activity
  await supabase.from("user_activity_logs").insert({
    user_id: userId,
    activity_type: "subscription",
    activity_description: "Payment failed for subscription",
    metadata: {
      plan: subData.plan,
      invoice_id: invoice.id,
      attempt_count: invoice.attempt_count
    }
  });

  // If this is the final attempt, mark subscription as inactive
  if (invoice.attempt_count >= 3) {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", subData.id);

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }
}