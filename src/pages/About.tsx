import MainNav from "@/components/landing/MainNav";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-24">
        <h1 className="text-3xl font-bold mb-6">About Us</h1>
        <p className="text-muted-foreground">
          We are dedicated to providing cutting-edge AI image generation capabilities,
          allowing users to transform their ideas into stunning visual content.
        </p>
      </main>
    </div>
  );
};

export default About;