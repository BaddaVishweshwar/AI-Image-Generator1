import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Download, Clock, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow, intervalToDuration } from "date-fns";

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
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const navigate = useNavigate();
  const { currentPlan, remainingGenerations, fetchCurrentPlan, fetchRemainingGenerations } = useSubscription();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        setAuthError(true);
      } else {
        setAuthError(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setAuthError(true);
      } else {
        setAuthError(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) return;

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error in profile fetch:', error);
      }
    };

    fetchProfile();
  }, [session]);

  useEffect(() => {
    if (!currentPlan || !currentPlan.end_date || currentPlan.tier === 'free' || currentPlan.tier === 'lifetime') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const endDate = new Date(currentPlan.end_date);
      
      if (endDate <= now) {
        fetchCurrentPlan();
        setTimeLeft("Expired");
        return;
      }

      const duration = intervalToDuration({ start: now, end: endDate });
      
      if (currentPlan.tier === 'daily') {
        const hours = duration.hours || 0;
        const minutes = duration.minutes || 0;
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (currentPlan.tier === 'monthly') {
        const days = duration.days || 0;
        const hours = duration.hours || 0;
        setTimeLeft(`${days}d ${hours}h`);
      }
    };

    calculateTimeLeft();
    
    const interval = setInterval(calculateTimeLeft, 60000);
    
    return () => clearInterval(interval);
  }, [currentPlan, fetchCurrentPlan]);

  useEffect(() => {
    if (currentPlan?.profile_id && currentPlan.tier === 'free') {
      fetchRemainingGenerations(currentPlan.profile_id);
      
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
    if (authError || !session) {
      toast.error("Authentication error. Please log in again.");
      navigate("/auth");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!profile?.id) {
      toast.error("Profile not found. Please try logging out and back in.");
      return;
    }

    if (currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0) {
      toast.error("You've reached your daily limit. Please upgrade your plan to generate more images.");
      navigate("/subscription");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('multi-source-image', {
        body: { prompt, profileId: profile.id }
      });

      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(functionError.message || 'Failed to generate image');
      }

      if (!data?.imageUrl) {
        throw new Error('No image was generated');
      }

      setImageUrl(data.imageUrl);
      setImageSource(data.source || null);

      const { error: insertError } = await supabase.from("images").insert({
        prompt,
        image_url: data.imageUrl,
        profile_id: profile.id,
        source: data.source || 'multi-source'
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error('Failed to save image');
      }

      if (currentPlan?.tier === 'free') {
        try {
          const { error: incrementError } = await supabase.rpc('increment_generation_count', { 
            profile_id: profile.id 
          });
          
          if (incrementError) {
            console.error("Error incrementing count:", incrementError);
            throw new Error(`Failed to update generation count: ${incrementError.message}`);
          }
          
          await fetchRemainingGenerations(profile.id);
        } catch (error: any) {
          console.error("Error updating generation count:", error);
        }
      }

      toast.success(`Image ${data.source === 'pixabay' ? 'found' : 'generated'} successfully!`);
    } catch (error: any) {
      console.error("Error generating image:", error);
      
      if (error.message?.includes('401') || error.message?.includes('auth') || error.message?.includes('token')) {
        toast.error("Authentication error. Please log in again.");
        setAuthError(true);
        navigate("/auth");
      } else if (error.message.includes('429')) {
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

  const isGenerationDisabled = () => {
    if (isLoading) return true;
    
    if (currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0) {
      return true;
    }
    
    if (currentPlan?.end_date && new Date(currentPlan.end_date) < new Date()) {
      return true;
    }
    
    return false;
  };

  if (authError) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">
            Your session has expired or is invalid. Please log in again.
          </p>
          <Button onClick={() => navigate("/auth")}>Log In</Button>
        </div>
      </div>
    );
  }

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
        
        <Card className="border-purple-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-purple-700">
                {currentPlan?.tier === 'free' ? 'Free Plan' : 
                 currentPlan?.tier === 'daily' ? '1 Day of Unlimited Magic' : 
                 currentPlan?.tier === 'monthly' ? '30 Days of Endless Imagination' : 
                 'Lifetime of Limitless Art'}
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/subscription")}
                className="text-xs h-8"
              >
                {currentPlan?.tier === 'free' ? 'Upgrade' : 'Manage'}
              </Button>
            </div>
            
            {currentPlan?.tier === 'free' && (
              <div>
                <Progress value={(remainingGenerations ?? 0) * 20} className="h-2 mb-1" />
                <p className="text-xs text-gray-600 text-right">
                  {remainingGenerations !== null 
                    ? `${remainingGenerations} ${remainingGenerations === 1 ? 'image' : 'images'} remaining today` 
                    : 'Loading...'}
                </p>
              </div>
            )}
            
            {currentPlan?.tier !== 'free' && currentPlan?.tier !== 'lifetime' && timeLeft && (
              <div className="text-sm text-gray-600">
                <p className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-purple-500" />
                  {timeLeft === "Expired" 
                    ? "Your plan has expired" 
                    : `Expires in ${timeLeft}`}
                </p>
              </div>
            )}
            
            {currentPlan?.tier === 'lifetime' && (
              <p className="text-sm text-gray-600 flex items-center">
                <svg className="h-4 w-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Lifetime access activated!
              </p>
            )}
          </CardContent>
        </Card>
        
        {currentPlan?.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800">
              You've used all 5 free images for today. Upgrade or wait until tomorrow!
              <Button 
                variant="link" 
                className="text-purple-600 p-0 h-auto text-sm ml-1"
                onClick={() => navigate("/subscription")}
              >
                Upgrade now
              </Button>
            </AlertDescription>
          </Alert>
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
            disabled={isGenerationDisabled()}
          >
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
          <div className="p-4 bg-white border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {imageSource && (
                <span className="flex items-center">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Source: {imageSource === 'pixabay' ? 'Pixabay' : 'AI Generated'}
                </span>
              )}
            </div>
            <Button onClick={handleDownload}>
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
