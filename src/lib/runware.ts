import axios from "axios";

export class RunwareService {
  constructor(private apiKey: string) {}

  async generateImage({ positivePrompt }: { positivePrompt: string }) {
    const response = await axios.post(
      "https://api.runware.ai/generate-image",
      {
        prompt: positivePrompt,
      },
      {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error("Failed to generate image");
    }

    return response.data;
  }
}
