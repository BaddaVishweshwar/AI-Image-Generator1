
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MainNav from "@/components/landing/MainNav";

type SubscriptionTier = "free" | "daily" | "monthly" | "lifetime";

interface Plan {
  name: string;
  description: string;
  price: string;
  features: string[];
  tier: SubscriptionTier;
  amount: number;
}

const plans: Plan[] = [
  {
    name: "A Taste of Creativity",
    description: "Limited generations to ignite your creativity!",
    price: "Free",
    features: ["5 images per day", "Basic support", "Standard quality"],
    tier: "free",
    amount: 0,
  },
  {
    name: "1 Day of Unlimited Magic",
    description: "Create nonstop for 24 hours!",
    price: "₹49",
    features: ["Unlimited generations", "24-hour access", "Priority support"],
    tier: "daily",
    amount: 49,
  },
  {
    name: "30 Days of Endless Imagination",
    description: "Unleash your ideas all month",
    price: "₹149",
    features: ["Unlimited generations", "30-day access", "Priority support"],
    tier: "monthly",
    amount: 149,
  },
  {
    name: "A Lifetime of Limitless Art",
    description: "One-time pay, infinite possibilities!",
    price: "₹1,999",
    features: ["Unlimited generations", "Lifetime access", "Premium support"],
    tier: "lifetime",
    amount: 1999,
  },
];

const Subscription = () => {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle payment return from Cashfree
  useEffect(() => {
    const handlePaymentReturn = async () => {
      const orderId = searchParams.get('order_id');
      const orderStatus = searchParams.get('order_status');

      if (orderId && orderStatus) {
        if (orderStatus === 'PAID') {
          try {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", session?.user?.id)
              .single();

            if (profiles) {
              // Extract tier from orderId (assuming format: tier_timestamp_random)
              const tierFromOrder = orderId.split('_')[0];
              
              // Validate that the extracted tier is a valid SubscriptionTier
              if (!isValidTier(tierFromOrder)) {
                throw new Error("Invalid subscription tier");
              }

              let end_date = null;

              // Set end date based on tier
              if (tierFromOrder === 'daily') {
                end_date = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
              } else if (tierFromOrder === 'monthly') {
                end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
              }

              const { error: subscriptionError } = await supabase.from("subscriptions").insert({
                profile_id: profiles.id,
                tier: tierFromOrder as SubscriptionTier,
                end_date: end_date,
              });

              if (subscriptionError) throw subscriptionError;

              toast.success("Payment successful! Your subscription is now active.");
              // Clear URL parameters
              navigate('/subscription', { replace: true });
              // Refresh current plan
              fetchCurrentPlan();
            }
          } catch (error: any) {
            console.error('Error updating subscription:', error);
            toast.error("Failed to activate subscription. Please contact support.");
          }
        } else {
          toast.error("Payment was not successful. Please try again.");
          navigate('/subscription', { replace: true });
        }
      }
    };

    if (session) {
      handlePaymentReturn();
    }
  }, [session, searchParams, navigate]);

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
        }
      } else {
        // Create order ID with tier prefix for easier identification
        const orderId = `${plan.tier}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const { data: response, error } = await supabase.functions.invoke("create-cashfree-order", {
          body: { 
            priceId: plan.tier,
            orderId: orderId,
            orderAmount: plan.amount,
          }
        });

        if (error) throw error;

        if (response.payment_link) {
          window.location.href = response.payment_link;
        } else {
          throw new Error("Failed to create payment link");
        }
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || "Failed to process subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MainNav />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-purple-900 mb-4">Choose Your Creative Journey</h1>
            <p className="text-lg text-gray-600">Unlock the full potential of AI-powered image generation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <Card key={plan.tier} className={`relative overflow-hidden ${
                currentPlan?.tier === plan.tier ? "border-purple-500 border-2" : ""
              }`}>
                {currentPlan?.tier === plan.tier && (
                  <Badge className="absolute top-4 right-4 bg-purple-500">
                    Current Plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-6">{plan.price}</div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading || currentPlan?.tier === plan.tier}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : currentPlan?.tier === plan.tier ? (
                      "Current Plan"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Subscription;
