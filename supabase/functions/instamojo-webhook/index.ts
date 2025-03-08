
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
    let webhookData;
    if (req.headers.get("content-type")?.includes("application/json")) {
      webhookData = await req.json();
    } else {
      const formData = await req.formData();
      webhookData = {};
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value.toString();
      }
    }

    console.log("Instamojo webhook received:", JSON.stringify(webhookData));
    
    // Validate required fields from Instamojo
    const paymentRequestId = webhookData.payment_request_id;
    const paymentId = webhookData.payment_id;
    const status = webhookData.status;
    
    if (!paymentRequestId) {
      throw new Error("Missing payment_request_id in webhook data");
    }
    
    if (!status) {
      throw new Error("Missing status in webhook data");
    }

    // Verify the payment request exists in our database
    const { data: paymentRequest, error: paymentRequestError } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("payment_request_id", paymentRequestId)
      .single();

    if (paymentRequestError || !paymentRequest) {
      throw new Error(`Payment request not found: ${paymentRequestId}`);
    }

    // Update the payment request status
    const { error: updateError } = await supabase
      .from("payment_requests")
      .update({ 
        status: status,
        payment_id: paymentId,
        updated_at: new Date().toISOString()
      })
      .eq("payment_request_id", paymentRequestId);

    if (updateError) {
      console.error("Error updating payment request:", updateError);
    }

    // Process payment based on status
    if (status === "Credit") {
      // Payment was successful
      const { profile_id, tier } = paymentRequest;
      
      if (!profile_id) {
        throw new Error("Missing profile_id in payment request data");
      }
      
      if (!tier) {
        throw new Error("Missing tier in payment request data");
      }

      if (!['daily', 'monthly', 'lifetime'].includes(tier)) {
        throw new Error(`Invalid subscription tier: ${tier}`);
      }

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
      });

      if (subscriptionError) {
        throw new Error(`Failed to save subscription: ${subscriptionError.message}`);
      }

      console.log(`Successfully processed payment for profile ${profile_id}, tier ${tier}`);
    } else {
      console.log(`Payment status update received: ${status} for payment request ${paymentRequestId}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing Instamojo webhook:", error.message);
    
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
