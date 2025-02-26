
export type SubscriptionTier = "free" | "daily" | "monthly" | "lifetime";

export interface Plan {
  name: string;
  description: string;
  price: string;
  features: string[];
  tier: SubscriptionTier;
  amount: number;
}
