import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!session) {
      toast.error("Please log in to generate images");
      return;
    }

    if (!prompt) {
      toast.error("Please enter a prompt");
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

      toast.success("Image generated and saved successfully!");
    } catch (error: any) {
      console.error("Error generating image:", error);
      
      // Handle specific error messages
      if (error.message.includes('429')) {
        toast.error("Please wait a minute before generating another image. We limit the number of requests to ensure fair usage.");
      } else if (error.message.includes('busy')) {
        toast.error("The image generation service is currently busy. Please try again in a few minutes.");
      } else {
        toast.error(error.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
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
        <h2 className="text-2xl font-bold">AI Image Generator</h2>
        <p className="text-muted-foreground">
          Enter a prompt to generate an image using Stability AI
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {imageUrl && (
        <div className="rounded-lg overflow-hidden border">
          <img src={imageUrl} alt={prompt} className="w-full h-auto" />
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;