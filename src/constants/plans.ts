
import { Plan } from "@/types/subscription";

export const plans: Plan[] = [
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
