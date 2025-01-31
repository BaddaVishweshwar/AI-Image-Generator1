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

    // Generate image using DeepAI's text-to-image API
    const response = await fetch('https://api.deepai.org/api/text2img', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('DEEPAI_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        grid_size: 1,
      }),
    });

    if (!response.ok) {
      console.error('DeepAI API error status:', response.status);
      const errorText = await response.text();
      console.error('DeepAI API error response:', errorText);
      throw new Error(`DeepAI API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('DeepAI API Response:', data);
    
    if (!data.output_url) {
      console.error('No image URL in response:', data);
      throw new Error('No image URL received from API');
    }

    console.log('Successfully generated image:', data.output_url);

    return new Response(
      JSON.stringify({ imageUrl: data.output_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to generate image';
    
    if (error.message?.includes('quota')) {
      statusCode = 429;
      errorMessage = 'API rate limit exceeded. Please try again later.';
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});