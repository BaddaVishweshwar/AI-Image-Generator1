import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Info, Mail, Brain, Image } from "lucide-react";

const MainNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-100 to-pink-100 backdrop-blur-sm border-b border-purple-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-purple-600" />
              <Image className="h-8 w-8 text-pink-600 -ml-2" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PromptToPicture
            </h1>
          </div>
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link to="/about" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <Info className="h-4 w-4" />
              <span>About</span>
            </Link>
            <Link to="/contact" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <Mail className="h-4 w-4" />
              <span>Contact</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-100" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;