import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced rate limiting parameters
const RATE_LIMIT_WINDOW = 120000; // 2 minutes
const MAX_REQUESTS_PER_WINDOW = 1; // 1 request per 2 minutes for stricter limiting
const requestLog = new Map<string, number[]>();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

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

async function callStabilityAPI(prompt: string, retryCount = 0): Promise<Response> {
  try {
    console.log(`Attempt ${retryCount + 1} to generate image for prompt: "${prompt}"`);
    
    const response = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${Deno.env.get('STABILITY_API_KEY')}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: prompt,
              weight: 1,
            },
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 15, // Reduced steps further for better performance
          samples: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Stability AI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return callStabilityAPI(prompt, retryCount + 1);
      }

      throw new Error(response.statusText || 'Failed to generate image');
    }

    return response;
  } catch (error) {
    console.error(`API call attempt ${retryCount + 1} failed:`, error);
    if (retryCount < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return callStabilityAPI(prompt, retryCount + 1);
    }
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
          error: 'Rate limit exceeded. Please wait 2 minutes between requests to ensure fair usage.' 
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
      const response = await callStabilityAPI(prompt);
      const result = await response.json();
      
      if (!result.artifacts?.[0]?.base64) {
        throw new Error('No image data received from the API');
      }

      const imageUrl = `data:image/png;base64,${result.artifacts[0].base64}`;
      console.log('Successfully generated image');
      
      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Stability AI API error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'The AI service is currently busy. Please try again in a few minutes.' 
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in generate-image function:', error);
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
});