import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const EXAMPLE_PROMPTS = [
  "A serene mountain landscape with snow-capped peaks at sunset",
  "A futuristic cityscape at night with neon lights, flying cars, and towering skyscrapers",
  "A magical forest scene with glowing mushrooms, fairy lights, and mystical creatures",
  "A cozy coffee shop interior with warm lighting and vintage decorations"
];

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkRemainingGenerations = async () => {
      if (!session?.user?.id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        // Get current subscription tier
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Only check remaining generations for free tier
        if (subscription?.tier === 'free') {
          const today = new Date().toISOString().split('T')[0];
          const { data: count } = await supabase
            .from('generation_counts')
            .select('count')
            .eq('profile_id', profile.id)
            .eq('date', today)
            .single();

          setRemainingGenerations(5 - (count?.count || 0));
        } else {
          setRemainingGenerations(null); // Unlimited for paid plans
        }
      }
    };

    checkRemainingGenerations();
  }, [session]);

  const handleDownload = async () => {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    if (!session) {
      toast.error("Please log in to generate images");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    // Check if user has remaining generations
    if (remainingGenerations !== null && remainingGenerations <= 0) {
      toast.error("You've reached your daily limit. Please upgrade your plan to generate more images.");
      navigate("/subscription");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-image', {
        body: { prompt }
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message || 'Failed to generate image');
      }

      if (!data?.imageUrl) {
        throw new Error('No image was generated');
      }

      setImageUrl(data.imageUrl);

      // Get the user's profile
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id);

      if (profileError) {
        console.error("Profile error:", profileError);
        throw new Error('Failed to fetch profile');
      }

      if (!profiles || profiles.length === 0) {
        throw new Error("Profile not found. Please try logging out and back in.");
      }

      const profile = profiles[0];

      // Store the image in Supabase
      const { error: insertError } = await supabase.from("images").insert({
        prompt,
        image_url: data.imageUrl,
        profile_id: profile.id,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error('Failed to save image');
      }

      // Increment generation count for free tier users
      const { data: currentSubscription } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (currentSubscription?.tier === 'free') {
        const today = new Date().toISOString().split('T')[0];
        await supabase.rpc('increment_generation_count', { profile_id: profile.id });
        
        // Update remaining generations count
        const { data: newCount } = await supabase
          .from('generation_counts')
          .select('count')
          .eq('profile_id', profile.id)
          .eq('date', today)
          .single();

        setRemainingGenerations(5 - (newCount?.count || 0));
      }

      toast.success("Image generated and saved successfully!");
    } catch (error: any) {
      console.error("Error generating image:", error);
      
      if (error.message.includes('429')) {
        toast.error("Please wait 2 minutes before generating another image. This helps ensure fair usage for everyone.");
      } else if (error.message.includes('busy')) {
        toast.error("The AI service is currently busy. Please try again in a few minutes.");
      } else {
        toast.error(error.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to generate images
          </p>
          <Button onClick={() => navigate("/auth")}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">PromptToPicture</h2>
        <p className="text-muted-foreground">
          Turn Your Imagination Into Stunning AI-Generated Art
        </p>
        {remainingGenerations !== null && (
          <p className="text-sm text-gray-600">
            {remainingGenerations} generations remaining today
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter your prompt (e.g., 'A magical forest at sunset with glowing mushrooms')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Example prompts:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((examplePrompt, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleExampleClick(examplePrompt)}
              >
                <CardContent className="p-3">
                  <p className="text-sm">{examplePrompt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {imageUrl && (
        <div className="rounded-lg overflow-hidden border">
          <img src={imageUrl} alt={prompt} className="w-full h-auto" />
          <div className="p-4 bg-white border-t">
            <Button onClick={handleDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
