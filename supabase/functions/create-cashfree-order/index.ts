
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_APP_ID = '7549144107b7ccfe307044e304419457';
const CASHFREE_SECRET_KEY = 'cfsk_ma_prod_b7cd0c83dfd69b3cbf1bf502a9d29b9a_e8fe128c';
const CASHFREE_API_URL = 'https://api.cashfree.com/pg/orders'; // Using production URL

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, orderId, orderAmount } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('No authorization header');
    }

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

    const orderPayload = {
      customer_details: {
        customer_id: profile.id,
        customer_email: user.email,
      },
      order_meta: {
        return_url: `${req.headers.get('origin')}/subscription?order_id={order_id}&order_status={order_status}`,
      },
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
    };

    console.log('Creating order with payload:', orderPayload);

    const response = await fetch(CASHFREE_API_URL, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await response.json();
    console.log('Cashfree response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to create order');
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
      JSON.stringify({ error: error.message }),
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
