
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
    const sellerId = Deno.env.get('PADDLE_SELLER_ID');
    const apiKey = Deno.env.get('PADDLE_API_KEY');

    console.log("Seller ID available:", !!sellerId);
    console.log("API Key available:", !!apiKey);

    if (!sellerId || !apiKey) {
      throw new Error("Paddle API configuration missing. Please set PADDLE_SELLER_ID and PADDLE_API_KEY in Supabase secrets.");
    }

    console.log("Creating Paddle checkout...");

    // Map our price IDs to their actual prices
    const priceMapping = {
      'daily': { price: '49', currency: 'INR' },
      'monthly': { price: '149', currency: 'INR' },
      'lifetime': { price: '1999', currency: 'INR' }
    };

    const selectedPrice = priceMapping[priceId];
    
    // Create transaction ID with tier info for webhook reference
    const transactionId = `${priceId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Build URL with parameters for Paddle Checkout
    const params = new URLSearchParams();
    params.append('seller_id', sellerId);
    params.append('product_name', `${priceId.charAt(0).toUpperCase() + priceId.slice(1)} Plan`);
    params.append('customer_email', customerEmail);
    params.append('customer_name', customerName || 'Customer');
    params.append('customer_country', 'IN'); // Default to India
    params.append('price', selectedPrice.price);
    params.append('currency', selectedPrice.currency);
    params.append('passthrough', JSON.stringify({
      profile_id: profileId,
      tier: priceId
    }));
    params.append('return_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('title', 'Complete Your Purchase');
    
    // Using Paddle's Generate Payment Link API
    const checkoutUrl = `https://sandbox-vendors.paddle.com/api/2.0/product/generate_pay_link?${params.toString()}`;
    
    // Add the authentication to the request directly
    params.append('vendor_id', sellerId);
    params.append('vendor_auth_code', apiKey);

    console.log("Sending checkout request to:", checkoutUrl);
    
    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    const responseText = await response.text();
    console.log("Paddle API response status:", response.status);
    console.log("Paddle API response body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Paddle response:", e);
      throw new Error(`Failed to parse Paddle response: ${e.message}. Raw response: ${responseText.substring(0, 200)}...`);
    }

    if (!responseData.success) {
      throw new Error(`Paddle API error: ${responseData.error?.message || "Unknown error"}`);
    }

    const paymentLink = responseData.response.url;
    
    if (!paymentLink) {
      console.error("No payment URL found in response:", JSON.stringify(responseData));
      throw new Error("No payment URL returned from Paddle.");
    }
    
    console.log("Paddle checkout created successfully with URL:", paymentLink);

    return new Response(
      JSON.stringify({ 
        payment_link: paymentLink,
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
