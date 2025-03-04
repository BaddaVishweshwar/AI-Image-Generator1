
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
    console.log("Order request received:", requestData);

    const {
      orderId,
      orderAmount,
      customerName,
      customerEmail,
      customerPhone,
      priceId,
      profileId
    } = requestData;

    // Input validation with detailed error messages
    if (!orderId) {
      throw new Error("Missing required parameter: orderId");
    }
    if (!orderAmount) {
      throw new Error("Missing required parameter: orderAmount");
    }
    if (!customerEmail) {
      throw new Error("Missing required parameter: customerEmail");
    }
    if (!priceId) {
      throw new Error("Missing required parameter: priceId");
    }
    if (!profileId) {
      throw new Error("Missing required parameter: profileId");
    }

    // Additional data validation
    if (typeof orderAmount !== 'number' || orderAmount <= 0) {
      throw new Error("Invalid order amount: must be a positive number");
    }

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

    // Get Cashfree API keys
    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!appId || !secretKey) {
      throw new Error("Cashfree API configuration missing");
    }

    console.log("Creating Cashfree order...");

    // Create the return URL with the profile ID and encode it properly
    const returnUrl = `${req.headers.get('origin') || 'https://localhost:5173'}/subscription?order_id=${encodeURIComponent(orderId)}&order_status={order_status}`;

    console.log("Return URL:", returnUrl);

    // API endpoint for Cashfree order creation - using sandbox for testing
    const apiEndpoint = "https://sandbox.cashfree.com/pg/orders";

    // Prepare the order payload with sanitized values
    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      order_note: `Subscription to ${priceId} plan`,
      customer_details: {
        customer_id: profileId,
        customer_name: customerName || "Customer",
        customer_email: customerEmail,
        customer_phone: customerPhone || "9999999999",
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: null,
      },
    };

    console.log("Order payload:", JSON.stringify(orderPayload));

    // Send the request to Cashfree with proper error handling
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2022-09-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    // Get the response body for better error handling
    const responseBody = await response.text();
    console.log("Cashfree API response:", response.status, responseBody);

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Cashfree API error: ${response.status} - ${responseBody}`);
    }

    // Parse the response (safely)
    let paymentData;
    try {
      paymentData = JSON.parse(responseBody);
    } catch (e) {
      throw new Error(`Failed to parse Cashfree response: ${e.message}`);
    }
    
    if (!paymentData.payment_link) {
      throw new Error("No payment link returned from Cashfree");
    }
    
    console.log("Cashfree order created successfully:", paymentData);

    return new Response(
      JSON.stringify({ 
        payment_link: paymentData.payment_link,
        cf_order_id: paymentData.cf_order_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating order:", error.message);
    
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
