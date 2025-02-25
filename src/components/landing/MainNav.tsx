
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Mail, Info, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ImageHistory from "../ImageHistory";
import { format } from "date-fns";

const MainNav = () => {
  const [session, setSession] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [remainingImages, setRemainingImages] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      if (!session?.user) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profiles) {
        // Get subscription info
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("profile_id", profiles.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setSubscriptionInfo(subscription);

        // Get remaining images for free tier
        if (subscription?.tier === 'free') {
          const today = new Date().toISOString().split('T')[0];
          const { data: counts } = await supabase
            .from("generation_counts")
            .select("count")
            .eq("profile_id", profiles.id)
            .eq("date", today)
            .single();

          setRemainingImages(5 - (counts?.count || 0));
        }
      }
    };

    fetchSubscriptionInfo();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderSubscriptionInfo = () => {
    if (!subscriptionInfo) return null;

    if (subscriptionInfo.tier === 'free') {
      return (
        <span className="text-sm text-gray-600">
          {remainingImages !== null ? `${remainingImages} images left today` : 'Free tier'}
        </span>
      );
    }

    if (subscriptionInfo.end_date) {
      const daysLeft = Math.ceil(
        (new Date(subscriptionInfo.end_date).getTime() - new Date().getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      return (
        <span className="text-sm text-gray-600">
          {daysLeft > 0 ? `${daysLeft} days left` : 'Subscription ended'}
        </span>
      );
    }

    if (subscriptionInfo.tier === 'lifetime') {
      return <span className="text-sm text-gray-600">Lifetime access</span>;
    }

    return null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-100 to-pink-100 backdrop-blur-sm border-b border-purple-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2">
            <svg width="40" height="40" viewBox="0 0 40 40" className="fill-current text-purple-600">
              <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 36c-8.837 0-16-7.163-16-16S11.163 4 20 4s16 7.163 16 16-7.163 16-16 16z"/>
              <path d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 22c-5.514 0-10-4.486-10-10S14.486 10 20 10s10 4.486 10 10-4.486 10-10 10z"/>
              <path d="M20 12c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 14c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
            </svg>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              PromptToPicture
            </h1>
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link to="/subscription" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Subscription</span>
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
          {session ? (
            <>
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-600">{session.user.email}</span>
                {renderSubscriptionInfo()}
                <div className="absolute top-16 right-0 mt-2">
                  <ImageHistory userId={session.user.id} />
                </div>
              </div>
              <Button
                variant="ghost"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-100" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default MainNav;
