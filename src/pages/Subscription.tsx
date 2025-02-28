
import { useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { SubscriptionDetails } from "@/components/subscription/SubscriptionDetails";
import MainNav from "@/components/landing/MainNav";
import { plans } from "@/constants/plans";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Subscription = () => {
  const { loading, currentPlan, handleSubscribe, fetchCurrentPlan, isValidTier } = useSubscription();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchRemainingGenerations = async () => {
      if (currentPlan?.tier === 'free') {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", currentPlan.user_id)
          .single();

        if (profiles) {
          const today = new Date().toISOString().split('T')[0];
          const { data: counts } = await supabase
            .from("generation_counts")
            .select("count")
            .eq("profile_id", profiles.id)
            .eq("date", today)
            .single();

          setRemainingGenerations(5 - (counts?.count || 0));
        }
      }
    };

    fetchRemainingGenerations();
  }, [currentPlan]);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const orderId = searchParams.get('order_id');
      const orderStatus = searchParams.get('order_status');

      if (orderId && orderStatus) {
        setProcessingPayment(true);
        try {
          if (orderStatus === 'PAID') {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", currentPlan?.user_id)
              .single();

            if (profiles) {
              const tierFromOrder = orderId.split('_')[0];
              
              if (!isValidTier(tierFromOrder)) {
                throw new Error("Invalid subscription tier");
              }

              let end_date = null;

              if (tierFromOrder === 'daily') {
                end_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
              } else if (tierFromOrder === 'monthly') {
                end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              }

              const { error: subscriptionError } = await supabase.from("subscriptions").insert({
                profile_id: profiles.id,
                tier: tierFromOrder,
                end_date: end_date,
              });

              if (subscriptionError) throw subscriptionError;

              toast.success("Payment successful! Your subscription is now active.");
              navigate('/subscription', { replace: true });
              fetchCurrentPlan();
            }
          } else {
            setPaymentError(`Payment was not successful. Status: ${orderStatus}`);
            toast.error("Payment was not successful. Please try again.");
          }
        } catch (error: any) {
          console.error('Error updating subscription:', error);
          setPaymentError(error.message || "Failed to activate subscription");
          toast.error("Failed to activate subscription. Please contact support.");
        } finally {
          setProcessingPayment(false);
        }
      }
    };

    handlePaymentReturn();
  }, [searchParams, navigate, currentPlan?.user_id, fetchCurrentPlan, isValidTier]);

  return (
    <>
      <MainNav />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-24">
        <div className="container mx-auto px-4">
          {paymentError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Error</AlertTitle>
              <AlertDescription>{paymentError}</AlertDescription>
              <div className="mt-2">
                <Button variant="outline" onClick={() => setPaymentError(null)}>Dismiss</Button>
              </div>
            </Alert>
          )}
          
          {processingPayment && (
            <Alert className="mb-6 bg-yellow-50">
              <AlertTitle>Processing Payment</AlertTitle>
              <AlertDescription>Please wait while we process your payment...</AlertDescription>
            </Alert>
          )}

          {currentPlan && (
            <SubscriptionDetails
              currentPlan={currentPlan}
              remainingGenerations={remainingGenerations}
            />
          )}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-purple-900 mb-4">Choose Your Creative Journey</h1>
            <p className="text-lg text-gray-600">Unlock the full potential of AI-powered image generation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <SubscriptionCard
                key={plan.tier}
                plan={plan}
                isCurrentPlan={currentPlan?.tier === plan.tier}
                isLoading={loading}
                onSubscribe={handleSubscribe}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Subscription;
