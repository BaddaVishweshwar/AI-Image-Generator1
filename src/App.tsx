
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Subscription from "@/pages/Subscription";
import History from "@/pages/History";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;
