import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sampleImages = [
  {
    url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
    prompt: "A futuristic tech interface with glowing elements",
    title: "Tech Interface"
  },
  {
    url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    prompt: "Abstract code visualization in neon colors",
    title: "Code Visualization"
  },
  {
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    prompt: "Digital art landscape with floating islands",
    title: "Digital Landscape"
  }
];

const SampleImages = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Sample Generations</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sampleImages.map((image, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{image.title}</CardTitle>
                <CardDescription>Prompt: {image.prompt}</CardDescription>
              </CardHeader>
              <CardContent>
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-48 object-cover rounded-md"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SampleImages;