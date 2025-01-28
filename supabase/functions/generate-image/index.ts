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

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('DALL-E API error:', error);
      
      // Check if the error is related to billing
      if (error.error?.type === 'billing_error' || 
          error.error?.message?.includes('billing') ||
          error.error?.code === 'insufficient_quota') {
        throw new Error('OpenAI API billing limit reached. Please check your OpenAI account billing status and ensure you have sufficient credits.');
      }
      
      // Check for rate limiting
      if (error.error?.type === 'rate_limit_error' || 
          error.error?.message?.includes('rate')) {
        throw new Error('Rate limit reached. Please wait a few minutes before trying again.');
      }
      
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    if (!data.data?.[0]?.url) {
      throw new Error('No image URL received from DALL-E');
    }

    console.log('Successfully generated image');

    return new Response(
      JSON.stringify({ imageUrl: data.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    
    // Set appropriate status codes based on error type
    let statusCode = 500;
    if (error.message.includes('billing')) {
      statusCode = 402; // Payment Required
    } else if (error.message.includes('rate')) {
      statusCode = 429; // Too Many Requests
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate image. Please try again.' 
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});