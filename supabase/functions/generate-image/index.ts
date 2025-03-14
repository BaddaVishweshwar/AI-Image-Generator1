
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

    // Create a more detailed prompt to get better, more accurate results
    const enhancedPrompt = `ultra realistic, high resolution, detailed, 8k, ${prompt}, professional photography, sharp focus, highly detailed, vivid colors`;
    console.log('Enhanced prompt:', enhancedPrompt);

    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);
    console.log('Created Hugging Face inference instance');

    // Using a better model for improved quality and relevance
    const image = await hf.textToImage({
      inputs: enhancedPrompt,
      model: 'stabilityai/stable-diffusion-xl-base-1.0',  // Using SDXL for better quality
      parameters: {
        negative_prompt: "blurry, bad quality, distorted, deformed, ugly, low resolution, boring, plain, unrealistic, cartoon",
        num_inference_steps: 50,  // Increased steps for better quality
        guidance_scale: 9.0,      // Increased guidance scale for stronger prompt adherence
        width: 768,               // Larger image size
        height: 768,              // Larger image size
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
