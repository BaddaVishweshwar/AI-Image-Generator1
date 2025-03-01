
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID") || "";
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// For Cashfree testing environment, change to "https://api.cashfree.com" for production
const CASHFREE_API_URL = "https://sandbox.cashfree.com/pg";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get request body
    const { priceId, orderId, orderAmount, customerEmail, customerName, profileId } = await req.json();

    if (!priceId || !orderId || !orderAmount) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['daily', 'monthly', 'lifetime'].includes(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid subscription tier" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build the return URL (add both success and failure return paths)
    const returnUrl = new URL(req.url);
    returnUrl.pathname = "";
    returnUrl.search = "";
    returnUrl.hash = "";
    
    // Ensure we're using https for production
    if (returnUrl.protocol === "http:") {
      returnUrl.protocol = "https:";
    }
    
    // Add subscription path and parameters
    const returnPath = `${returnUrl.toString()}subscription?order_id=${orderId}&order_status=PAID`;
    const cancelPath = `${returnUrl.toString()}subscription?order_status=CANCELLED`;

    console.log(`Return URL: ${returnPath}`);
    console.log(`Cancel URL: ${cancelPath}`);

    // Create order with Cashfree
    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: user.id,
        customer_email: customerEmail || user.email,
        customer_phone: "9999999999", // Replace with actual phone if available
        customer_name: customerName || user.email.split('@')[0],
      },
      order_meta: {
        return_url: returnPath,
        notify_url: returnPath, // Webhook URL if you have one
      },
      order_note: `Subscription for ${priceId} plan`,
    };

    console.log("Creating Cashfree order with payload:", JSON.stringify(orderPayload));

    // Call Cashfree API to create order
    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();
    console.log("Cashfree response:", JSON.stringify(data));

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: "Failed to create payment order", 
        details: data 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return the payment link
    const payment_link = data.payment_link || "";
    return new Response(JSON.stringify({ payment_link }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Server error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
