
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

const ImageHistory = ({ userId }: { userId: string }) => {
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
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

    fetchImages();
  }, [userId]);

  return (
    <ScrollArea className="h-[200px] w-[250px] rounded-md border p-4">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Generated Images</h4>
        {images.map((image) => (
          <div key={image.id} className="flex flex-col gap-2">
            <img 
              src={image.image_url} 
              alt={image.prompt} 
              className="w-full h-32 object-cover rounded-md"
            />
            <p className="text-xs text-gray-600 truncate">{image.prompt}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ImageHistory;
