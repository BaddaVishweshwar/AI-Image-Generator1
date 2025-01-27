import ImageGenerator from "@/components/ImageGenerator";
import MainNav from "@/components/landing/MainNav";
import SampleImages from "@/components/landing/SampleImages";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-24">
        <ImageGenerator />
        <SampleImages />
      </main>
    </div>
  );
};

export default Index;