import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sampleImages = [
  {
    url: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&w=800&q=80",
    prompt: "A girl riding a bicycle on a quiet street",
    title: "Peaceful Ride"
  },
  {
    url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80",
    prompt: "A cup of coffee on a wooden table with a book beside it",
    title: "Coffee & Literature"
  },
  {
    url: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=800&q=80",
    prompt: "A bird flying over a calm lake at sunrise",
    title: "Dawn Flight"
  }
];

const SampleImages = () => {
  return (
    <section className="py-12 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Sample Generations</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {sampleImages.map((image, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">{image.title}</CardTitle>
                <CardDescription className="text-gray-600">Prompt: {image.prompt}</CardDescription>
              </CardHeader>
              <CardContent>
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-48 object-cover rounded-md hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?auto=format&fit=crop&w=800&q=80";
                  }}
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