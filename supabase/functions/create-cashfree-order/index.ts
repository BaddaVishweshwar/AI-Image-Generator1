
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded test credentials - you should move these to environment variables for production
const TEST_APP_ID = 'TEST10300696a90ec573000e2e69482869600301';
const TEST_SECRET_KEY = 'cfsk_ma_test_4356c9dfd8baf67be9a4831320b29248_fed3d90c';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, orderId, orderAmount } = await req.json();
    const authHeader = req.headers.get('Authorization');
    // Get origin dynamically or use a fallback
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:5173';

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get Cashfree credentials - try env variables first, fall back to test credentials
    const appId = Deno.env.get('CASHFREE_APP_ID') || TEST_APP_ID;
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY') || TEST_SECRET_KEY;
    
    console.log('Using App ID:', appId);
    console.log('Using origin:', origin);

    // Get user from token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Construct return and notify URLs with proper origin
    const returnUrl = `${origin}/subscription`;
    const notifyUrl = `${origin}/subscription`;

    console.log('Return URL:', returnUrl);

    // Create order payload for Cashfree
    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: profile.id,
        customer_email: user.email || 'customer@example.com',
        customer_phone: "9999999999"
      },
      order_meta: {
        return_url: returnUrl + "?order_id={order_id}&order_status={order_status}",
        notify_url: notifyUrl + "?order_id={order_id}&order_status={order_status}"
      }
    };

    console.log('Creating order with payload:', JSON.stringify(orderPayload));

    const response = await fetch('https://sandbox.cashfree.com/pg/orders', { // Using sandbox URL for testing
      method: 'POST',
      headers: {
        'x-api-version': '2022-09-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    const responseData = await response.json();
    console.log('Cashfree response:', JSON.stringify(responseData));

    if (!response.ok) {
      throw new Error(`Cashfree error: ${JSON.stringify(responseData)}`);
    }

    return new Response(
      JSON.stringify({
        payment_link: responseData.payment_link,
        order_id: responseData.order_id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
