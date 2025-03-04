
import { useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { SubscriptionDetails } from "@/components/subscription/SubscriptionDetails";
import MainNav from "@/components/landing/MainNav";
import { plans } from "@/constants/plans";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

const Subscription = () => {
  const { loading, currentPlan, handleSubscribe, fetchCurrentPlan, isValidTier, remainingGenerations } = useSubscription();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      const success = searchParams.get('success') === 'true';
      const canceled = searchParams.get('canceled') === 'true';

      if (success || canceled) {
        setProcessingPayment(true);
        try {
          if (success) {
            // Paddle payments are handled asynchronously by the webhook
            // So we just need to show a success message and refresh the subscription
            toast.success("Payment received! Your subscription will be activated shortly.");
            await fetchCurrentPlan();
            navigate('/subscription', { replace: true });
          } else if (canceled) {
            setPaymentError("Payment was canceled. Please try again.");
            toast.error("Payment was canceled. Please try again.");
          }
        } catch (error: any) {
          console.error('Error handling payment return:', error);
          setPaymentError(error.message || "Failed to process payment result");
          toast.error("Failed to process payment result. Please contact support.");
        } finally {
          setProcessingPayment(false);
        }
      }
    };

    handlePaymentReturn();
  }, [searchParams, navigate, fetchCurrentPlan]);

  const handleRetry = () => {
    setPaymentError(null);
    // Force refresh the page to clear any cached state
    window.location.href = '/subscription';
  };

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
              <div className="mt-2 flex space-x-2">
                <Button variant="outline" onClick={() => setPaymentError(null)}>Dismiss</Button>
                <Button variant="default" onClick={handleRetry} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </Alert>
          )}
          
          {processingPayment && (
            <Alert className="mb-6 bg-yellow-50">
              <Loader2 className="h-4 w-4 animate-spin" />
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
