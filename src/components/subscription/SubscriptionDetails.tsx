
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface SubscriptionDetailsProps {
  currentPlan: {
    tier: string;
    end_date: string | null;
  } | null;
  remainingGenerations?: number | null;
}

export const SubscriptionDetails = ({ currentPlan, remainingGenerations }: SubscriptionDetailsProps) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  
  useEffect(() => {
    if (!currentPlan?.end_date || currentPlan.tier === 'free' || currentPlan.tier === 'lifetime') {
      setTimeLeft(null);
      return;
    }
    
    const updateTimeLeft = () => {
      const now = new Date();
      const endDate = new Date(currentPlan.end_date as string);
      
      if (endDate <= now) {
        setTimeLeft("Expired");
        return;
      }
      
      setTimeLeft(formatDistanceToNow(endDate, { addSuffix: true }));
    };
    
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [currentPlan]);

  const getPlanDetails = () => {
    if (!currentPlan) return null;

    switch (currentPlan.tier) {
      case 'free':
        return {
          title: 'Free Plan',
          limit: remainingGenerations !== null 
            ? `${remainingGenerations} ${remainingGenerations === 1 ? 'image' : 'images'} remaining today` 
            : <Skeleton className="h-4 w-32" />,
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          color: 'text-amber-700',
          bgGradient: 'from-amber-50 to-amber-100'
        };
      case 'daily':
        return {
          title: '24-Hour Unlimited Plan',
          limit: timeLeft 
            ? timeLeft === "Expired"
              ? "Your plan has expired"
              : `Expires ${timeLeft}`
            : 'Active',
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          color: 'text-blue-700',
          bgGradient: 'from-blue-50 to-blue-100'
        };
      case 'monthly':
        return {
          title: '30-Day Unlimited Plan',
          limit: timeLeft 
            ? timeLeft === "Expired"
              ? "Your plan has expired"
              : `Expires ${timeLeft}`
            : 'Active',
          icon: <Clock className="h-5 w-5 text-purple-500" />,
          color: 'text-purple-700',
          bgGradient: 'from-purple-50 to-purple-100'
        };
      case 'lifetime':
        return {
          title: 'Lifetime Unlimited Plan',
          limit: 'Never expires',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          color: 'text-green-700',
          bgGradient: 'from-green-50 to-green-100'
        };
      default:
        return null;
    }
  };

  const details = getPlanDetails();
  if (!details) return null;

  return (
    <Card className={`mb-8 bg-gradient-to-r ${details.bgGradient}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl flex items-center">
          {details.icon}
          <span className="ml-2">Your Subscription</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className={`text-lg font-semibold ${details.color}`}>{details.title}</p>
          <div className="text-gray-600">{details.limit}</div>
          
          {currentPlan.tier === 'free' && remainingGenerations !== null && remainingGenerations <= 0 && (
            <p className="text-amber-600 text-sm mt-2">
              You've used all your free generations for today. 
              Consider upgrading to get unlimited access!
            </p>
          )}
          
          {currentPlan.end_date && new Date(currentPlan.end_date) < new Date() && (
            <p className="text-red-600 text-sm mt-2">
              Your paid subscription has expired. 
              You've been reverted to the free plan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
