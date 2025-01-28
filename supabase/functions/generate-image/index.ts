import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced rate limiting parameters
const RATE_LIMIT_WINDOW = 120000; // 2 minutes
const MAX_REQUESTS_PER_WINDOW = 1; // 1 request per 2 minutes
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const clientRequests = requestLog.get(clientId) || [];
  
  // Clean up old requests
  const recentRequests = clientRequests.filter(timestamp => 
    now - timestamp < RATE_LIMIT_WINDOW
  );
  
  requestLog.set(clientId, recentRequests);
  return recentRequests.length >= MAX_REQUESTS_PER_WINDOW;
}

function logRequest(clientId: string) {
  const clientRequests = requestLog.get(clientId) || [];
  clientRequests.push(Date.now());
  requestLog.set(clientId, clientRequests);
}

async function generateImage(prompt: string): Promise<Response> {
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      console.error('DALL-E API error:', error);
      throw new Error(error?.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image data received from DALL-E');
    }

    return new Response(
      JSON.stringify({ imageUrl: `data:image/png;base64,${data.data[0].b64_json}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const clientId = req.headers.get('x-real-ip') || 'default';
    console.log(`Processing request from client: ${clientId} at ${new Date().toISOString()}`);

    if (isRateLimited(clientId)) {
      console.log(`Rate limit exceeded for client: ${clientId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait 2 minutes between requests.' 
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '120'
          } 
        }
      );
    }

    logRequest(clientId);

    try {
      return await generateImage(prompt);
    } catch (error) {
      console.error('DALL-E API error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate image. Please try again in a few minutes.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error. Please try again.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});