
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
    const sellerId = Deno.env.get('PADDLE_SELLER_ID'); // Changed from VENDOR_ID to SELLER_ID
    const apiKey = Deno.env.get('PADDLE_API_KEY');

    console.log("Seller ID available:", !!sellerId);
    console.log("API Key available:", !!apiKey);

    if (!sellerId || !apiKey) {
      throw new Error("Paddle API configuration missing. Please set PADDLE_SELLER_ID and PADDLE_API_KEY in Supabase secrets.");
    }

    console.log("Creating Paddle checkout...");

    // For testing/development, let's create a simple checkout that will work without actual Paddle products
    // Map our price IDs to test prices
    const priceMapping = {
      'daily': { price: '49', currency: 'INR' },
      'monthly': { price: '149', currency: 'INR' },
      'lifetime': { price: '1999', currency: 'INR' }
    };

    const selectedPrice = priceMapping[priceId];
    
    // Create transaction ID with tier info for webhook reference
    const transactionId = `${priceId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Prepare data for Paddle checkout
    const checkoutData = new FormData();
    checkoutData.append('seller_id', sellerId); // Changed from vendor_id to seller_id
    checkoutData.append('auth_code', apiKey); // Changed from vendor_auth_code to auth_code
    
    // Dynamic product creation approach (for testing without actual Paddle products)
    checkoutData.append('product_name', `${priceId.charAt(0).toUpperCase() + priceId.slice(1)} Plan`);
    checkoutData.append('prices', `[{"currency":"${selectedPrice.currency}","amount":"${selectedPrice.price}"}]`);
    checkoutData.append('title', 'Complete Your Purchase');
    checkoutData.append('image_url', 'https://your-app-domain.com/logo.png');
    
    checkoutData.append('customer_email', customerEmail);
    checkoutData.append('customer_name', customerName || 'Customer');
    checkoutData.append('passthrough', JSON.stringify({
      profile_id: profileId,
      tier: priceId,
      transaction_id: transactionId
    }));
    checkoutData.append('return_url', successUrl);
    checkoutData.append('cancel_url', cancelUrl);

    console.log("Sending checkout creation request to Paddle API");
    console.log("Checkout data:", Object.fromEntries(checkoutData.entries()));

    // Use the checkout/create API endpoint (newer Paddle API)
    const response = await fetch('https://sandbox-api.paddle.com/checkout/create', {
      method: 'POST',
      body: checkoutData,
      headers: {
        // If needed, Paddle may require additional headers for the newer API
        'Cache-Control': 'no-cache',
      }
    });

    // Get the response body for better error handling
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

    // Handle response format variations between Paddle API versions
    let checkoutUrl = null;
    
    if (responseData.checkout?.url) {
      // New API format
      checkoutUrl = responseData.checkout.url;
    } else if (responseData.response?.url) {
      // Old API format
      checkoutUrl = responseData.response.url;
    } else if (responseData.url) {
      // Simple direct format
      checkoutUrl = responseData.url;
    }
    
    if (!checkoutUrl) {
      console.error("No checkout URL found in response:", JSON.stringify(responseData));
      throw new Error("No checkout URL returned from Paddle. Check response format: " + JSON.stringify(responseData).substring(0, 200));
    }
    
    console.log("Paddle checkout created successfully with URL:", checkoutUrl);

    return new Response(
      JSON.stringify({ 
        payment_link: checkoutUrl,
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
