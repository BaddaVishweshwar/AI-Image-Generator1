import { CheckCircle, Zap, Shield, BarChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    title: "Lightning Fast",
    description: "Optimized performance that keeps your workflow smooth and efficient.",
    icon: Zap,
  },
  {
    title: "Secure by Design",
    description: "Enterprise-grade security to protect your valuable data.",
    icon: Shield,
  },
  {
    title: "Advanced Analytics",
    description: "Gain insights with comprehensive reporting and analytics.",
    icon: BarChart,
  },
  {
    title: "99.9% Uptime",
    description: "Reliable service that you can count on, day and night.",
    icon: CheckCircle,
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform provides all the tools you need to succeed in today's competitive landscape.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;