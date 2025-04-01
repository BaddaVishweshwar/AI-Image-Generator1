
import MainNav from "@/components/landing/MainNav";
import { Mail, Phone, User, MessageSquare } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <MainNav />
      <main className="container mx-auto py-24 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-4 text-center text-purple-800">Contact Us</h1>
          <p className="text-center text-gray-600 mb-8">
            We'd love to hear from you! Whether you have questions, need assistance, or want to share feedback about PromptToPicture, feel free to reach out. Our team is here to help!
          </p>

          <h2 className="text-xl font-semibold mb-6 text-purple-700">Get in Touch:</h2>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4 text-gray-700">
              <User className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <p className="font-semibold">Dedicated Team:</p>
                <ul className="list-none space-y-1">
                  <li>Vishweshwar</li>
                  <li>Eshwar Naidu</li>
                  <li>Chetan Macha</li>
                  <li>Manas</li>
                </ul>
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

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-start space-x-4 text-gray-700">
              <MessageSquare className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Have a Suggestion or Idea?</h3>
                <p className="text-gray-600">
                  We're always looking to improve! If you have an idea for a feature or want to collaborate, don't hesitate to contact us.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
