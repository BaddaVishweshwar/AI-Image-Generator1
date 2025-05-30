
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const enhancedPrompt = `high quality, detailed, ${prompt}`;
    console.log('Enhanced prompt for image generation:', enhancedPrompt);

    // Create a function to handle retries
    const generateImage = async (retries = 2) => {
      try {
        // Try Stable Diffusion 2.1 (reliable and fast)
        const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HUGGING_FACE_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: enhancedPrompt
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Hugging Face API error:', response.status, errorText);
          
          if (response.status === 503 && retries > 0) {
            console.log(`Service unavailable, retrying... (${retries} left)`);
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await generateImage(retries - 1);
          }
          
          throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
        }

        // Get image from response
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const imageUrl = `data:image/png;base64,${base64}`;

        console.log('Successfully converted image to base64');
        return imageUrl;
      } catch (error) {
        if (retries > 0) {
          console.log(`Error encountered, retrying... (${retries} left):`, error);
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await generateImage(retries - 1);
        }
        throw error;
      }
    };

    const imageUrl = await generateImage();

    return new Response(
      JSON.stringify({ imageUrl, source: 'huggingface' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in multi-source-image function:', error);
    
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
    } else if (error.message?.includes('Service Unavailable') || error.message?.includes('503')) {
      statusCode = 503;
      errorMessage = 'The AI service is currently unavailable. Please try again in a few minutes.';
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
