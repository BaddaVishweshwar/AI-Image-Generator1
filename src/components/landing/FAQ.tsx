import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "How does it work?",
      answer: "Our platform uses advanced AI technology to convert your text descriptions into images. Simply enter your prompt describing what you want to see, and our AI will generate a unique image based on your description."
    },
    {
      question: "Is it free?",
      answer: "We offer both free and premium tiers. The free tier allows you to generate a limited number of images per day, while our premium plans offer more generations, higher resolution options, and additional features."
    },
    {
      question: "What styles are available?",
      answer: "Our AI can generate images in various styles including photorealistic, artistic, cartoon, abstract, and many more. You can specify your preferred style in the prompt for more targeted results."
    },
    {
      question: "Can I use the images commercially?",
      answer: "Yes, all images generated through our platform come with commercial usage rights. You're free to use them in your projects, marketing materials, or any other commercial applications."
    }
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white rounded-lg shadow-sm">
                <AccordionTrigger className="px-6 hover:text-purple-600">{faq.question}</AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;