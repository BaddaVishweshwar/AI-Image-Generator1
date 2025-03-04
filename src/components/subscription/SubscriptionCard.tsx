
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Plan } from "@/types/subscription";

interface SubscriptionCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  isLoading: boolean;
  onSubscribe: (plan: Plan) => void;
}

export const SubscriptionCard = ({
  plan,
  isCurrentPlan,
  isLoading,
  onSubscribe,
}: SubscriptionCardProps) => {
  const isPaid = plan.tier !== 'free';
  
  return (
    <Card className={`relative overflow-hidden ${
      isCurrentPlan ? "border-purple-500 border-2" : ""
    }`}>
      {isCurrentPlan && (
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
          variant={isPaid ? "default" : "secondary"}
          className="w-full"
          onClick={() => onSubscribe(plan)}
          disabled={isLoading || isCurrentPlan}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isPaid ? "Processing Payment..." : "Subscribing..."}
            </>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : isPaid ? (
            "Subscribe"
          ) : (
            "Get Free Plan"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
