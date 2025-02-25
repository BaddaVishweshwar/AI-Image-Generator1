
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import MainNav from "@/components/landing/MainNav";

const stripePromise = loadStripe("pk_test_51Q1KaxSE9TU4LwjhqMNLmkW0TGgd4Qe5H9BfQGvvMBktpP4QQhF1PVEwjki8DagrdZjJEeGxpxH5LsW8QcLHT1P000fRKLy8F5");

const plans = [
  {
    name: "A Taste of Creativity",
    description: "Limited generations to ignite your creativity!",
    price: "Free",
    features: ["5 images per day", "Basic support", "Standard quality"],
    tier: "free",
    priceId: "price_1QwQ7kSE9TU4LwjhAZ8l2Bpe",
  },
  {
    name: "1 Day of Unlimited Magic",
    description: "Create nonstop for 24 hours!",
    price: "₹49",
    features: ["Unlimited generations", "24-hour access", "Priority support"],
    tier: "daily",
    priceId: "price_1QwQ8BSE9TU4LwjhFtTOKYy8",
  },
  {
    name: "30 Days of Endless Imagination",
    description: "Unleash your ideas all month",
    price: "₹149",
    features: ["Unlimited generations", "30-day access", "Priority support"],
    tier: "monthly",
    priceId: "price_1QwQ9FSE9TU4LwjhGk1ZGUB5",
  },
  {
    name: "A Lifetime of Limitless Art",
    description: "One-time pay, infinite possibilities!",
    price: "₹1,999",
    features: ["Unlimited generations", "Lifetime access", "Premium support"],
    tier: "lifetime",
    priceId: "price_1QwQATSE9TU4LwjhGmHyDOCa",
  },
];

const Subscription = () => {
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

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!session) return;

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

    fetchCurrentPlan();
  }, [session]);

  const handleSubscribe = async (plan: typeof plans[0]) => {
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
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize");

        const { data: response } = await supabase.functions.invoke("create-checkout-session", {
          body: { priceId: plan.priceId }
        });

        const result = await stripe.redirectToCheckout({
          sessionId: response.sessionId,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    } catch (error: any) {
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
