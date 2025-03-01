
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plan, SubscriptionTier } from "@/types/subscription";

export const useSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCurrentPlan = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profiles) {
        // First check if there's an active subscription with an end_date in the future or null
        const now = new Date().toISOString();
        const { data: activeSubscription, error: activeSubError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("profile_id", profiles.id)
          .or(`end_date.gt.${now},end_date.is.null`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSubError) {
          console.error('Error fetching active subscription:', activeSubError);
        }

        if (activeSubscription) {
          setCurrentPlan({
            ...activeSubscription,
            user_id: session.user.id,
            profile_id: profiles.id
          });
          
          // Fetch remaining generations for free tier
          if (activeSubscription.tier === 'free') {
            await fetchRemainingGenerations(profiles.id);
          } else {
            setRemainingGenerations(null);
          }
          return;
        }

        // If no active subscription, get the most recent one of any kind
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("profile_id", profiles.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError);
        }

        if (subscription) {
          setCurrentPlan({
            ...subscription,
            user_id: session.user.id,
            profile_id: profiles.id
          });
          
          // Fetch remaining generations for free tier
          if (subscription.tier === 'free') {
            await fetchRemainingGenerations(profiles.id);
          } else {
            setRemainingGenerations(null);
          }
        } else {
          // No subscription at all, set to free tier
          setCurrentPlan({
            tier: 'free',
            user_id: session.user.id,
            profile_id: profiles.id,
            end_date: null
          });
          
          // Fetch remaining generations for free tier
          await fetchRemainingGenerations(profiles.id);
        }
      }
    } catch (error) {
      console.error('Error in fetchCurrentPlan:', error);
    }
  };

  const fetchRemainingGenerations = async (profileId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: counts, error } = await supabase
        .from("generation_counts")
        .select("count")
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching generation counts:', error);
      }

      setRemainingGenerations(5 - (counts?.count || 0));
    } catch (error) {
      console.error('Error in fetchRemainingGenerations:', error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchCurrentPlan();
    }
  }, [session]);

  const isValidTier = (tier: string): tier is SubscriptionTier => {
    return ['free', 'daily', 'monthly', 'lifetime'].includes(tier);
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!session) {
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (profileError) throw new Error('Could not find user profile');

      if (plan.tier === "free") {
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert({
            profile_id: profiles.id,
            tier: plan.tier,
          });

        if (subscriptionError) throw subscriptionError;

        toast.success("Successfully subscribed to free plan!");
        await fetchCurrentPlan();
      } else {
        // Create a unique order ID
        const orderId = `${plan.tier}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        console.log('Creating Cashfree order...');
        const { data: response, error } = await supabase.functions.invoke("create-cashfree-order", {
          body: { 
            priceId: plan.tier,
            orderId: orderId,
            orderAmount: plan.amount,
          }
        });

        if (error) {
          console.error('Cashfree order creation error:', error);
          throw error;
        }

        if (!response?.payment_link) {
          throw new Error("Failed to create payment link: " + JSON.stringify(response));
        }

        console.log('Redirecting to payment page:', response.payment_link);
        window.location.href = response.payment_link;
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      const errorMessage = error.message || "Failed to process subscription";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    currentPlan,
    session,
    handleSubscribe,
    fetchCurrentPlan,
    isValidTier,
    remainingGenerations,
    fetchRemainingGenerations
  };
};
