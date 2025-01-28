import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      
      // Handle specific error cases
      if (error.error?.message?.includes('billing')) {
        throw new Error('OpenAI API billing limit reached. Please try again later.');
      }
      if (error.error?.message?.includes('rate')) {
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
    
    // Determine the appropriate status code
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