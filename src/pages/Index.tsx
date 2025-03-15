
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageGenerator from "@/components/ImageGenerator";
import MainNav from "@/components/landing/MainNav";
import SampleImages from "@/components/landing/SampleImages";
import FAQ from "@/components/landing/FAQ";
import Reviews from "@/components/landing/Reviews";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        // If there's an authentication error and the user was previously logged in,
        // redirect to auth page
        if (!currentSession && localStorage.getItem('wasLoggedIn') === 'true') {
          navigate("/auth");
        }
        
        // Set a flag in localStorage to track if user was logged in
        if (currentSession) {
          localStorage.setItem('wasLoggedIn', 'true');
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem('wasLoggedIn', 'true');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
