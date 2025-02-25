
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import MainNav from "@/components/landing/MainNav";

const History = () => {
  const [images, setImages] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      if (!session?.user) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profiles) {
        const { data: userImages } = await supabase
          .from("images")
          .select("*")
          .eq("profile_id", profiles.id)
          .order("created_at", { ascending: false });

        setImages(userImages || []);
      }
    };

    if (session) {
      fetchImages();
    }
  }, [session]);

  if (!session) {
    return (
      <>
        <MainNav />
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-purple-900">Please login to view your history</h1>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MainNav />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-purple-900 mb-8">Your Generated Images</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img 
                  src={image.image_url} 
                  alt={image.prompt} 
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <p className="text-sm text-gray-600">{image.prompt}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default History;
