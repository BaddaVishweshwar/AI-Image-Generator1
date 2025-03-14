
import ImageGenerator from "@/components/ImageGenerator";
import MainNav from "@/components/landing/MainNav";
import SampleImages from "@/components/landing/SampleImages";
import FAQ from "@/components/landing/FAQ";
import Reviews from "@/components/landing/Reviews";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-24">
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Tips for Better Images</h3>
          <p className="text-gray-700 mb-2">For best results with your generated images:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Be specific about what you want (e.g., "a girl with brown hair in a red dress dancing in the rain" instead of just "girl dancing")</li>
            <li>Include details about style (realistic, cartoon, painting, etc.)</li>
            <li>Mention lighting, setting, and mood if important</li>
            <li>Use descriptive adjectives for better results</li>
          </ul>
        </div>
        <ImageGenerator />
        <SampleImages />
        <FAQ />
        <Reviews />
      </main>
    </div>
  );
};

export default Index;
