
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
    console.log("Paddle order request received:", requestData);

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

    // Get Paddle API keys
    const vendorId = Deno.env.get('PADDLE_VENDOR_ID');
    const apiKey = Deno.env.get('PADDLE_API_KEY');

    if (!vendorId || !apiKey) {
      throw new Error("Paddle API configuration missing");
    }

    console.log("Creating Paddle checkout...");

    // Map our price IDs to Paddle product IDs
    // These should be replaced with your actual Paddle product IDs
    const productMapping = {
      'daily': 'pd_123_daily', // Replace with actual Paddle product ID
      'monthly': 'pd_456_monthly', // Replace with actual Paddle product ID
      'lifetime': 'pd_789_lifetime' // Replace with actual Paddle product ID
    };

    const paddleProductId = productMapping[priceId];
    
    if (!paddleProductId) {
      throw new Error(`No Paddle product ID found for tier: ${priceId}`);
    }

    // Create transaction ID with tier info for webhook reference
    const transactionId = `${priceId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Prepare data for Paddle checkout
    const checkoutData = new FormData();
    checkoutData.append('vendor_id', vendorId);
    checkoutData.append('vendor_auth_code', apiKey);
    checkoutData.append('product_id', paddleProductId);
    checkoutData.append('customer_email', customerEmail);
    checkoutData.append('customer_name', customerName || 'Customer');
    checkoutData.append('passthrough', JSON.stringify({
      profile_id: profileId,
      tier: priceId,
      transaction_id: transactionId
    }));
    checkoutData.append('return_url', successUrl);
    checkoutData.append('cancel_url', cancelUrl);

    // Send the request to Paddle API
    const response = await fetch('https://vendors.paddle.com/api/2.0/product/generate_pay_link', {
      method: 'POST',
      body: checkoutData,
    });

    // Get the response body for better error handling
    const responseText = await response.text();
    console.log("Paddle API response status:", response.status);
    console.log("Paddle API response body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Paddle response: ${e.message}`);
    }

    if (!response.ok || !responseData.success) {
      throw new Error(`Paddle API error: ${responseData.error?.message || 'Unknown error'}`);
    }
    
    if (!responseData.response?.url) {
      throw new Error("No checkout URL returned from Paddle");
    }
    
    console.log("Paddle checkout created successfully:", responseData.response);

    return new Response(
      JSON.stringify({ 
        payment_link: responseData.response.url,
        transaction_id: transactionId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Paddle order:", error.message);
    
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
