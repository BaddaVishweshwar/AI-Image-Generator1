
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
    const {
      orderId,
      orderAmount,
      customerName,
      customerEmail,
      customerPhone,
      priceId,
      profileId
    } = await req.json();

    console.log("Order request received:", {
      orderId,
      orderAmount,
      customerName,
      customerEmail,
      priceId,
      profileId
    });

    // Input validation
    if (!orderId || !orderAmount || !customerEmail || !priceId || !profileId) {
      throw new Error("Missing required parameters");
    }

    // Additional data validation
    if (typeof orderAmount !== 'number' || orderAmount <= 0) {
      throw new Error("Invalid order amount");
    }

    if (!['daily', 'monthly', 'lifetime'].includes(priceId)) {
      throw new Error("Invalid subscription tier");
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

    // Create the return URL with the profile ID
    const returnUrl = `${req.headers.get('origin') || 'https://localhost:5173'}/subscription?order_id=${orderId}&order_status={order_status}`;

    console.log("Return URL:", returnUrl);

    // API endpoint for Cashfree order creation
    const apiEndpoint = "https://sandbox.cashfree.com/pg/orders";

    // Prepare the order payload
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

    console.log("Order payload:", orderPayload);

    // Send the request to Cashfree
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

    // Check if the request was successful
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Cashfree API error:", response.status, errorDetails);
      throw new Error(`Cashfree API error: ${response.status} - ${errorDetails}`);
    }

    // Parse the response
    const paymentData = await response.json();
    
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
