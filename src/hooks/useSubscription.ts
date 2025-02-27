
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plan, SubscriptionTier } from "@/types/subscription";

export const useSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
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

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (profiles) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("profile_id", profiles.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setCurrentPlan(subscription);
    }
  };

  useEffect(() => {
    fetchCurrentPlan();
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
      if (plan.tier === "free") {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (profiles) {
          await supabase.from("subscriptions").insert({
            profile_id: profiles.id,
            tier: plan.tier,
          });

          toast.success("Successfully subscribed to free plan!");
          setCurrentPlan({ tier: "free" });
          await fetchCurrentPlan();
        }
      } else {
        // Create a unique order ID
        const orderId = `${plan.tier}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Call our Edge Function to create Cashfree order
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
          throw new Error("Failed to create payment link");
        }

        // Redirect to Cashfree payment page
        window.location.href = response.payment_link;
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to process subscription");
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
  };
};
