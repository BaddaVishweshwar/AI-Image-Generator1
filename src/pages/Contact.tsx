import MainNav from "@/components/landing/MainNav";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-24">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="text-muted-foreground">
          Have questions or feedback? We'd love to hear from you.
          Reach out to us at support@example.com
        </p>
      </main>
    </div>
  );
};

export default Contact;