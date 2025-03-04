
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle preflight CORS requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }
  return null
}

serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = handleCors(req)
    if (corsResponse) {
      return corsResponse
    }

    // Get required secrets from environment
    const appId = Deno.env.get("CASHFREE_APP_ID")
    const secretKey = Deno.env.get("CASHFREE_SECRET_KEY")

    if (!appId || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Missing Cashfree credentials" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { priceId, orderId, orderAmount, customerEmail, customerName, customerPhone, profileId } = await req.json()

    // Validate the request
    if (!priceId || !orderId || !orderAmount || !customerEmail || !profileId) {
      console.error("Validation failed:", { priceId, orderId, orderAmount, customerEmail, profileId })
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Prepare data for Cashfree API
    const returnUrl = new URL(req.url).origin + "/subscription?order_id=" + orderId
    
    const data = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: profileId,
        customer_email: customerEmail,
        customer_name: customerName || customerEmail.split('@')[0],
        customer_phone: customerPhone || "9999999999"
      },
      order_meta: {
        return_url: returnUrl + "&order_status={order_status}"
      }
    }

    console.log("Creating Cashfree order with data:", JSON.stringify(data))

    // Make API request to Cashfree
    const response = await fetch("https://sandbox.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2022-09-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      },
      body: JSON.stringify(data)
    })

    const responseData = await response.json()
    console.log("Cashfree API response:", JSON.stringify(responseData))

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: "Cashfree API error", 
          details: responseData,
          statusCode: response.status,
          statusText: response.statusText
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        payment_link: responseData.payment_link,
        order_id: responseData.order_id,
        order_status: responseData.order_status
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
