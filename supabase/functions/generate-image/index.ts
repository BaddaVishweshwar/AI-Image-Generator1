
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the provided API key
const HUGGING_FACE_ACCESS_TOKEN = "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";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, profileId } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!profileId) {
      throw new Error('Profile ID is required');
    }

    console.log('Generating image for prompt:', prompt, 'Profile ID:', profileId);

    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);
    console.log('Created Hugging Face inference instance');

    // Using a faster and more reliable model
    const image = await hf.textToImage({
      inputs: prompt,
      model: 'runwayml/stable-diffusion-v1-5',
      parameters: {
        negative_prompt: "blurry, bad quality, distorted",
        num_inference_steps: 20,
        guidance_scale: 7,
      }
    });

    if (!image) {
      throw new Error('No image was generated');
    }

    console.log('Image generated successfully, converting to base64');

    // Convert the blob to base64 string
    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageUrl = `data:image/png;base64,${base64}`;

    console.log('Successfully converted image to base64');

    return new Response(
      JSON.stringify({ imageUrl, source: 'huggingface' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to generate image';
    
    // More specific error handling
    if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('invalid token')) {
      statusCode = 401;
      errorMessage = 'Invalid API token. Please check your Hugging Face API key.';
    } else if (error.message?.includes('model not found')) {
      statusCode = 404;
      errorMessage = 'The AI model could not be loaded. Please try again.';
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
