import MainNav from "@/components/landing/MainNav";

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <MainNav />
      <main className="container mx-auto py-24 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          <h1 className="text-4xl font-bold text-center text-purple-800 mb-12">About Us</h1>
          
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <h2 className="text-2xl font-semibold text-purple-700 mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                "To empower creativity by transforming ideas into stunning visuals through cutting-edge AI technology, making art accessible to everyone with just a simple prompt."
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <h2 className="text-2xl font-semibold text-purple-700 mb-4">Our Vision</h2>
              <p className="text-gray-700 leading-relaxed">
                "To become the leading platform for AI-driven art generation, inspiring innovation and redefining the boundaries of creativity by merging imagination and technology."
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;