import MainNav from "@/components/landing/MainNav";
import { Mail, Phone, User } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <MainNav />
      <main className="container mx-auto py-24 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-8 text-center text-purple-800">Contact Us</h1>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4 text-gray-700">
              <User className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-semibold">Owned by:</p>
                <p>Badda Vishweshwar</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-gray-700">
              <Mail className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-semibold">Email:</p>
                <a href="mailto:vishweshwar2209@gmail.com" className="hover:text-purple-600 transition-colors">
                  vishweshwar2209@gmail.com
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-gray-700">
              <Phone className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-semibold">Phone:</p>
                <a href="tel:+919515726247" className="hover:text-purple-600 transition-colors">
                  +91 9515726247
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;