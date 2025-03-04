
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase API keys from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook data
    const formData = await req.formData();
    const webhookData: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString();
    }

    console.log("Paddle webhook received:", JSON.stringify(webhookData));
    
    // Process the webhook based on the alert_name
    const alertName = webhookData.alert_name;
    
    if (!alertName) {
      throw new Error("Missing alert_name in webhook data");
    }

    // Extract passthrough data which contains our profile_id and tier
    let passthrough;
    try {
      passthrough = JSON.parse(webhookData.passthrough || '{}');
    } catch (e) {
      throw new Error(`Failed to parse passthrough data: ${e.message}`);
    }

    const { profile_id, tier } = passthrough;
    
    if (!profile_id) {
      throw new Error("Missing profile_id in passthrough data");
    }
    
    if (!tier) {
      throw new Error("Missing tier in passthrough data");
    }

    if (!['daily', 'monthly', 'lifetime'].includes(tier)) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    // Process different webhook events
    if (alertName === 'payment_succeeded' || alertName === 'subscription_payment_succeeded') {
      // Calculate end_date based on the tier
      let end_date = null;

      if (tier === 'daily') {
        const date = new Date();
        date.setDate(date.getDate() + 1); // Add 1 day
        end_date = date.toISOString();
      } else if (tier === 'monthly') {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Add 30 days
        end_date = date.toISOString();
      }
      // lifetime tier has null end_date

      // Save subscription to database
      const { error: subscriptionError } = await supabase.from("subscriptions").insert({
        profile_id: profile_id,
        tier: tier,
        end_date: end_date,
        paddle_subscription_id: webhookData.subscription_id || null, // Store Paddle subscription ID if available
      });

      if (subscriptionError) {
        throw new Error(`Failed to save subscription: ${subscriptionError.message}`);
      }

      console.log(`Successfully processed ${alertName} for profile ${profile_id}, tier ${tier}`);
    } else if (alertName === 'subscription_cancelled') {
      // Handle subscription cancellation if needed
      console.log(`Subscription cancelled for profile ${profile_id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing Paddle webhook:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message || "Failed to process webhook"
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
