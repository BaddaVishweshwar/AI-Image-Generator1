
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID') || '';
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') || '';
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders'; // Using sandbox for testing

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, orderId, orderAmount } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!priceId || !orderAmount) {
      throw new Error('Price ID and order amount are required');
    }

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Validate the user token
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get the profile ID
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: profile.id,
        customer_email: user.email,
      },
      order_meta: {
        return_url: `${req.headers.get('origin')}/subscription?order_id={order_id}&order_status={order_status}`,
        notify_url: `${req.headers.get('origin')}/subscription`
      }
    };

    console.log('Creating Cashfree order with payload:', orderPayload);

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

    const data = await response.json();
    console.log('Cashfree response:', data);

    if (!response.ok) {
      throw new Error(`Cashfree API error: ${data.message || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({
        payment_link: data.payment_link || null,
        order_id: data.order_id,
        cf_order_id: data.cf_order_id,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 400 
      }
    );
  }
});
