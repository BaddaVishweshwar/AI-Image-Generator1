
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
    const requestData = await req.json();
    console.log("Instamojo order request received:", requestData);

    const {
      priceId,
      profileId,
      customerEmail,
      customerName,
      successUrl,
      cancelUrl
    } = requestData;

    // Input validation with detailed error messages
    if (!priceId) {
      throw new Error("Missing required parameter: priceId");
    }
    if (!profileId) {
      throw new Error("Missing required parameter: profileId");
    }
    if (!customerEmail) {
      throw new Error("Missing required parameter: customerEmail");
    }
    if (!successUrl) {
      throw new Error("Missing required parameter: successUrl");
    }
    if (!cancelUrl) {
      throw new Error("Missing required parameter: cancelUrl");
    }

    // Additional data validation for subscription tier
    if (!['daily', 'monthly', 'lifetime'].includes(priceId)) {
      throw new Error(`Invalid subscription tier: ${priceId}`);
    }

    // Get Supabase API keys from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Instamojo API keys
    const apiKey = Deno.env.get('INSTAMOJO_API_KEY');
    const authToken = Deno.env.get('INSTAMOJO_AUTH_TOKEN');
    const isSandbox = Deno.env.get('INSTAMOJO_SANDBOX') === 'true';

    console.log("API Key available:", !!apiKey);
    console.log("Auth Token available:", !!authToken);
    console.log("Sandbox mode:", isSandbox);

    if (!apiKey || !authToken) {
      throw new Error("Instamojo API configuration missing. Please set INSTAMOJO_API_KEY and INSTAMOJO_AUTH_TOKEN in Supabase secrets.");
    }

    console.log("Creating Instamojo payment request...");

    // Map price IDs to actual prices and descriptions
    const priceMapping = {
      'daily': { price: '49', description: '1 Day of Unlimited Image Generations' },
      'monthly': { price: '149', description: '30 Days of Unlimited Image Generations' },
      'lifetime': { price: '1999', description: 'Lifetime Access to Unlimited Image Generations' }
    };

    const selectedPrice = priceMapping[priceId];
    
    // Create a unique transaction ID
    const transactionId = `${priceId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create a name for the payment based on the tier
    const purpose = `PromptToPicture ${priceId.charAt(0).toUpperCase() + priceId.slice(1)} Plan`;

    // Make a request to Instamojo API to create a payment request
    const apiBaseUrl = isSandbox 
      ? 'https://test.instamojo.com/api/1.1' 
      : 'https://api.instamojo.com/api/1.1';
    
    const response = await fetch(`${apiBaseUrl}/payment-requests/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'X-Auth-Token': authToken,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        purpose: purpose,
        amount: selectedPrice.price,
        buyer_name: customerName || 'Customer',
        email: customerEmail,
        phone: '9999999999', // Required by Instamojo, set default placeholder
        redirect_url: `${successUrl}?payment_id={payment_id}&payment_request_id={payment_request_id}`,
        webhook: 'https://blgattdqvzsayfilghil.functions.supabase.co/instamojo-webhook',
        allow_repeated_payments: false,
        send_email: true,
        send_sms: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Instamojo API error:", errorText);
      throw new Error(`Instamojo API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log("Instamojo response:", JSON.stringify(responseData));

    if (!responseData.success) {
      throw new Error(`Failed to create payment request: ${JSON.stringify(responseData.message)}`);
    }

    // Store payment request information in database for reference
    const { error: dbError } = await supabase.from("payment_requests").insert({
      profile_id: profileId,
      tier: priceId,
      payment_provider: 'instamojo',
      payment_request_id: responseData.payment_request.id,
      amount: selectedPrice.price,
      status: 'pending',
      metadata: {
        longurl: responseData.payment_request.longurl,
        request_data: responseData.payment_request
      }
    });

    if (dbError) {
      console.error("Error saving payment request:", dbError);
      // Continue even if saving fails - we can still redirect to payment
    }

    const paymentLink = responseData.payment_request.longurl;
    
    return new Response(
      JSON.stringify({ 
        payment_link: paymentLink,
        payment_request_id: responseData.payment_request.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Instamojo order:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message || "Failed to create payment order"
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
