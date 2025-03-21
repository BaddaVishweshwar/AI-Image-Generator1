
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
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (!profiles) {
        console.error('No profile found for user:', session.user.id);
        return;
      }

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
        
        if (activeSubscription.tier === 'free') {
          await fetchRemainingGenerations(profiles.id);
        } else {
          setRemainingGenerations(null);
        }
        return;
      }

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
        // If the subscription has an end_date and it's in the past, it's expired
        const isExpired = subscription.end_date && new Date(subscription.end_date) < new Date();
        
        if (isExpired && subscription.tier !== 'free') {
          // If expired and not free, add a new free tier subscription
          const { error: newSubError } = await supabase
            .from("subscriptions")
            .insert({
              profile_id: profiles.id,
              tier: 'free',
              end_date: null
            });
            
          if (newSubError) {
            console.error('Error creating free subscription after expiry:', newSubError);
          }
          
          setCurrentPlan({
            tier: 'free',
            user_id: session.user.id,
            profile_id: profiles.id,
            end_date: null
          });
          
          await fetchRemainingGenerations(profiles.id);
        } else {
          setCurrentPlan({
            ...subscription,
            user_id: session.user.id,
            profile_id: profiles.id
          });
          
          if (subscription.tier === 'free') {
            await fetchRemainingGenerations(profiles.id);
          } else {
            setRemainingGenerations(null);
          }
        }
      } else {
        setCurrentPlan({
          tier: 'free',
          user_id: session.user.id,
          profile_id: profiles.id,
          end_date: null
        });
        
        await fetchRemainingGenerations(profiles.id);
      }
    } catch (error) {
      console.error('Error in fetchCurrentPlan:', error);
      toast.error("Failed to fetch subscription information");
    }
  };

  const fetchRemainingGenerations = async (profileId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("generation_counts")
        .select("count")
        .eq("profile_id", profileId)
        .eq("date", today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching generation counts:', error);
        setRemainingGenerations(5);
        return;
      }

      const usedCount = data?.count || 0;
      setRemainingGenerations(5 - usedCount);
    } catch (error) {
      console.error('Error in fetchRemainingGenerations:', error);
      setRemainingGenerations(5);
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
        .select("id, display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error('Could not find user profile');
      }
      
      if (!profiles) {
        throw new Error('No profile found for current user');
      }

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
        let customerName = profiles.display_name || 
                          (session.user.email ? session.user.email.split('@')[0] : 'User');
        const customerEmail = session.user.email || 'unknown@example.com';
        
        const origin = window.location.origin;
        const successUrl = `${origin}/subscription?success=true`;
        const cancelUrl = `${origin}/subscription?canceled=true`;
        
        console.log('Creating Paddle checkout...');
        
        try {
          // Make sure we're calling the correct paddle function
          const { data: response, error } = await supabase.functions.invoke("create-paddle-order", {
            body: { 
              priceId: plan.tier,
              customerEmail: customerEmail,
              customerName: customerName,
              profileId: profiles.id,
              successUrl: successUrl,
              cancelUrl: cancelUrl
            }
          });

          if (error) {
            console.error('Paddle checkout creation error:', error);
            throw new Error(`Payment service error: ${error.message}`);
          }

          if (!response?.payment_link) {
            throw new Error("Failed to create payment link: " + JSON.stringify(response));
          }

          console.log('Redirecting to Paddle checkout:', response.payment_link);
          window.location.href = response.payment_link;
        } catch (error) {
          console.error("Failed to create payment order:", error);
          throw new Error(`Payment processing error: ${error.message}`);
        }
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
