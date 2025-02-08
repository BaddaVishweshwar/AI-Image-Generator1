
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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

    const token = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    console.log('Token available:', !!token); // Log if token exists without exposing it
    
    if (!token) {
      console.error('Hugging Face token not found');
      throw new Error('API configuration error');
    }

    console.log('Generating image for prompt:', prompt);

    const hf = new HfInference(token);

    try {
      const image = await hf.textToImage({
        inputs: prompt,
        model: 'black-forest-labs/FLUX.1-schnell',
      });

      console.log('Image generated successfully');

      // Convert the blob to a base64 string
      const arrayBuffer = await image.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const imageUrl = `data:image/png;base64,${base64}`;

      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      console.error('Hugging Face API error:', apiError);
      
      if (apiError.message?.includes('401') || apiError.message?.includes('unauthorized')) {
        throw new Error('Invalid or expired API token. Please check your Hugging Face access token.');
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to generate image';
    
    if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('API token')) {
      statusCode = 401;
      errorMessage = error.message;
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
