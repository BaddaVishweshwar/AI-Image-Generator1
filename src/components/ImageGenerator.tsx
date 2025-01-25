import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface StableDiffusionResponse {
  artifacts: Array<{
    base64: string;
  }>;
}

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("stability_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem("stability_api_key", newApiKey);
  };

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!apiKey) {
      toast.error("Please enter your Stability AI API key");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: prompt,
                weight: 1,
              },
            ],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            steps: 50,
            samples: 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as StableDiffusionResponse;
      const base64Image = result.artifacts[0].base64;
      setImageUrl(`data:image/png;base64,${base64Image}`);
      toast.success("Image generated successfully!");
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
          Enter your Stability AI API key and a prompt to generate an image
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="password"
          placeholder="Enter your Stability AI API key"
          value={apiKey}
          onChange={handleApiKeyChange}
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