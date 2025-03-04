
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Download, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";

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
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { currentPlan, remainingGenerations, fetchCurrentPlan, fetchRemainingGenerations } = useSubscription();

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
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    };

    fetchProfile();
  }, [session]);

  // Refresh the current plan and remaining generations periodically
  useEffect(() => {
    if (currentPlan?.profile_id && currentPlan.tier === 'free') {
      // Initial fetch
      fetchRemainingGenerations(currentPlan.profile_id);
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchRemainingGenerations(currentPlan.profile_id);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentPlan, fetchRemainingGenerations]);

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
      navigate("/auth");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    // Check if user has remaining generations for free tier
    if (currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0) {
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

      if (!profile) {
        throw new Error("Profile not found. Please try logging out and back in.");
      }

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

      // If user is on free tier, increment generation count
      if (currentPlan?.tier === 'free') {
        const { error: incrementError } = await supabase.rpc('increment_generation_count', { 
          profile_id: profile.id 
        });
        
        if (incrementError) {
          console.error("Error incrementing count:", incrementError);
        }
        
        // Update remaining generations count immediately
        if (currentPlan.profile_id) {
          await fetchRemainingGenerations(currentPlan.profile_id);
          await fetchCurrentPlan();
        }
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
        {currentPlan?.tier === 'free' && (
          <div className="bg-white p-3 border rounded-md shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-600">
                Daily Free Generations
              </p>
            </div>
            <Progress value={(remainingGenerations ?? 0) * 20} className="h-2 mb-1" />
            <p className="text-xs text-gray-600 text-right">
              {remainingGenerations !== null 
                ? `${remainingGenerations} ${remainingGenerations === 1 ? 'image' : 'images'} remaining today` 
                : 'Loading...'}
            </p>
          </div>
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
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || (currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0)}
          >
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>

        {currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            You've reached your daily limit of 5 images. 
            <Button 
              variant="link" 
              className="text-purple-600 p-0 h-auto text-sm"
              onClick={() => navigate("/subscription")}
            >
              Upgrade your plan
            </Button> to generate more images.
          </div>
        )}

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
