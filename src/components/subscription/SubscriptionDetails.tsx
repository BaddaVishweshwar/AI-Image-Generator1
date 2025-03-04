
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionDetailsProps {
  currentPlan: {
    tier: string;
    end_date: string | null;
  } | null;
  remainingGenerations?: number | null;
}

export const SubscriptionDetails = ({ currentPlan, remainingGenerations }: SubscriptionDetailsProps) => {
  const getPlanDetails = () => {
    if (!currentPlan) return null;

    switch (currentPlan.tier) {
      case 'free':
        return {
          title: 'Free Plan',
          limit: remainingGenerations !== null 
            ? `${remainingGenerations} ${remainingGenerations === 1 ? 'image' : 'images'} remaining today` 
            : <Skeleton className="h-4 w-32" />,
        };
      case 'daily':
        return {
          title: '24-Hour Unlimited Plan',
          limit: currentPlan.end_date 
            ? `Expires ${formatDistanceToNow(new Date(currentPlan.end_date), { addSuffix: true })}`
            : 'Active',
        };
      case 'monthly':
        return {
          title: '30-Day Unlimited Plan',
          limit: currentPlan.end_date 
            ? `Expires ${formatDistanceToNow(new Date(currentPlan.end_date), { addSuffix: true })}`
            : 'Active',
        };
      case 'lifetime':
        return {
          title: 'Lifetime Unlimited Plan',
          limit: 'Never expires',
        };
      default:
        return null;
    }
  };

  const details = getPlanDetails();
  if (!details) return null;

  return (
    <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="text-2xl">Your Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-purple-700">{details.title}</p>
          <div className="text-gray-600">{details.limit}</div>
        </div>
      </CardContent>
    </Card>
  );
};
