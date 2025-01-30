import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Generating image for prompt:', prompt);

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STABILITY_API_KEY')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Stability AI API error:', error);
      
      if (error.message?.includes('billing') || error.message?.includes('quota')) {
        throw new Error('API billing limit reached. Please check your Stability AI account billing status.');
      }
      
      if (error.message?.includes('rate')) {
        throw new Error('Rate limit reached. Please wait a few minutes before trying again.');
      }
      
      throw new Error(error.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    if (!data.artifacts?.[0]?.base64) {
      throw new Error('No image data received from Stability AI');
    }

    console.log('Successfully generated image');

    return new Response(
      JSON.stringify({ imageUrl: `data:image/png;base64,${data.artifacts[0].base64}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    let statusCode = 500;
    if (error.message?.includes('billing')) {
      statusCode = 402;
    } else if (error.message?.includes('rate')) {
      statusCode = 429;
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});