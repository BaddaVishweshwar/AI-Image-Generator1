import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sampleImages = [
  {
    url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da",
    prompt: "A boy playing cricket in a sunny field",
    title: "Cricket Action"
  },
  {
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    prompt: "Sunset over a peaceful mountain landscape",
    title: "Nature's Beauty"
  },
  {
    url: "https://images.unsplash.com/photo-1569172122301-bc5008bc09c5",
    prompt: "A modern city skyline at night with glowing lights",
    title: "Urban Night"
  }
];

const SampleImages = () => {
  return (
    <section className="py-12 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Sample Generations</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sampleImages.map((image, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">{image.title}</CardTitle>
                <CardDescription className="text-gray-600">Prompt: {image.prompt}</CardDescription>
              </CardHeader>
              <CardContent>
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-48 object-cover rounded-md hover:scale-105 transition-transform duration-300"
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