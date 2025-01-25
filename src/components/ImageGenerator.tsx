import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as fal from "@fal-ai/serverless-client";

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!apiKey) {
      toast.error("Please enter your fal.ai API key");
      return;
    }

    setIsLoading(true);
    try {
      // Configure fal client with API key
      fal.config({
        credentials: apiKey,
      });

      const result = await fal.run('fal-ai/fast-sdxl', {
        input: {
          prompt,
          image_size: "square_hd",
          num_inference_steps: 50
        },
      });

      if (result.images?.[0]) {
        setImageUrl(result.images[0].url);
        toast.success("Image generated successfully!");
      } else {
        throw new Error("No image was generated");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">AI Image Generator</h2>
        <p className="text-muted-foreground">
          Enter your fal.ai API key and a prompt to generate an image
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="password"
          placeholder="Enter your fal.ai API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full"
        />
        
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
          <img
            src={imageUrl}
            alt={prompt}
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;