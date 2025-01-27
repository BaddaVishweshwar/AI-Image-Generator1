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
        <ImageGenerator />
        <SampleImages />
        <FAQ />
        <Reviews />
      </main>
    </div>
  );
};

export default Index;