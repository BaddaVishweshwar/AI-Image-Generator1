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

    // First, generate the image using text-to-image model
    const response = await fetch('https://api.deepai.org/api/text2img', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('GEMINI_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        grid_size: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DeepAI API error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    if (!data.output_url) {
      throw new Error('No image URL received from API');
    }

    console.log('Successfully generated image');

    return new Response(
      JSON.stringify({ imageUrl: data.output_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    let statusCode = 500;
    if (error.message?.includes('quota')) {
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