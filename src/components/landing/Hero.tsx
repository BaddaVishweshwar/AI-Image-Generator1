import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16 pb-32 px-4">
      <div className="text-center space-y-8 animate-fadeIn">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl mx-auto leading-tight">
          Transform Your Workflow with
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-transparent bg-clip-text">
            {" "}
            Powerful Tools
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Streamline your business operations with our intuitive platform. Built for teams who value
          efficiency and simplicity.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Button size="lg" className="w-full sm:w-auto">
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            Watch Demo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;