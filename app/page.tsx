"use client";
import { Button } from "@/components/ui/button";
import { Cpu, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function LandingPage() {
  const features = [
    {
      title: "AI-Powered Code Understanding",
      description:
        "Input your repository URL and let our AI fetch, analyze, and explain your code instantly.",
    },
    {
      title: "Interactive Q&A with AI",
      description:
        "Ask any question about your codebase, and our AI will provide clear, insightful answers.",
    },
    {
      title: "Repository Insights",
      description:
        "Get a detailed breakdown of project structure, dependencies, and key functionalities.",
    },
  ];

  const talkingCodeFeatures = [
    {
      title: "Fetch & Analyze Repositories",
      description:
        "Enter a GitHub URL, and our AI will retrieve and analyze the entire codebase.",
      icon: Cpu,
    },
    {
      title: "Converse with Your Code",
      description:
        "Ask questions about functions, logic, or architecture, and get AI-driven explanations.",
      icon: ArrowRight,
    },
    {
      title: "Understand Complex Code",
      description:
        "Our AI simplifies even the most intricate code, making it easier to grasp.",
      icon: Zap,
    },
    {
      title: "Get Instant Documentation",
      description:
        "Generate structured documentation based on your repository’s code and comments.",
      icon: Cpu,
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Enter Your Repository URL",
      description:
        "Paste your GitHub repository link and let our AI fetch your code.",
    },
    {
      step: "2",
      title: "Start Chatting with AI",
      description:
        "Ask about functions, dependencies, or logic, and get real-time explanations.",
    },
    {
      step: "3",
      title: "Enhance Your Understanding",
      description:
        "Gain insights, documentation, and clear explanations to master your codebase.",
    },
  ];

  const testimonials = [
    {
      testimonial:
        "Talking-Code made understanding a large legacy codebase effortless!",
      name: "Rahul Sharma",
      role: "Software Engineer",
    },
    {
      testimonial:
        "I saved hours of debugging by asking the AI to explain confusing code snippets.",
      name: "Aisha Khan",
      role: "Full-Stack Developer",
    },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto relative text-white">
      <Header />
      <main>
        <section className="px-6 lg:px-14 h-screen xl:h-full xl:py-48 flex flex-col justify-center items-center text-center bg-gradient-to-b from-custom2 to-custom1">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl lg:text-8xl font-bold bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent lg:px-12 lg:leading-[1.15]"
          >
            Talk to Your Code, The Smart Way!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-xl md:text-[22px] max-w-4xl text-white/80 font-normal"
          >
            Input your repository URL, and let our AI fetch, analyze, and
            explain any part of your code. Debug faster, learn quicker, and
            master your projects effortlessly.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <Button className="text-[18px] py-6 px-5 transition bg-gradient-to-r from-blue-500 to-blue-800 hover:opacity-80 text-white font-light">
              Get Started for Free
            </Button>
            <Button className="text-[18px] py-6 px-5 transition bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-white font-light">
              Login to Explore
            </Button>
          </motion.div>
        </section>

        <section className="px-6 lg:px-14 py-20 bg-gradient-to-b from-custom2 to-custom1 text-center">
          <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
            What is Talking Code?
          </h2>
          <p className="text-lg max-w-4xl mx-auto text-white/50 mb-12">
            Our platform is designed to make machine learning simple and
            engaging. Whether you're just starting or looking to deepen your
            understanding, we've got you covered.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-custom1/5 p-6 rounded-lg shadow-lg border-[#374151] border"
              >
                <h3 className="text-xl font-semibold text-blue-300 mb-2">
                  {point.title}
                </h3>
                <p className="text-white/50">{point.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-6 lg:px-14 py-20 bg-gradient-to-b from-custom2 to-custom1 text-center">
          <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
            Why Use Talking Code?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {talkingCodeFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-custom1/30 p-6 rounded-lg shadow-lg border-[#374151] border"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-blue-500 p-3 rounded-full mr-4">
                    <feature.icon className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-300">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-white/50">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-6 lg:px-14 py-20 bg-gradient-to-b from-custom2 to-custom1 text-center">
          <h2 className="text-4xl font-bold mb-12 bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
            How Does It Work?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-custom1/30 p-8 rounded-lg shadow-lg border-[#374151] border"
              >
                <h3 className="text-5xl font-bold text-blue-300 mb-4">
                  {step.step}
                </h3>
                <h4 className="text-2xl font-semibold mb-4">{step.title}</h4>
                <p className="text-white/50">{step.description}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12"
          >
            <Button className="text-[18px] sm:py-6 px-5 bg-gradient-to-r from-blue-500 to-blue-800 hover:opacity-80 transition text-white font-light text-wrap py-8">
              Ready to Get Started? Sign Up Today!
            </Button>
          </motion.div>
        </section>

        <section className="px-6 lg:px-14 py-20 bg-gradient-to-b from-custom2 to-custom1 text-center">
          <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
            What Our Users Say
          </h2>
          <div className="space-y-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.3 }}
                className="bg-custom1/30 p-8 rounded-lg shadow-lg border-[#374151] border"
              >
                <p className="text-xl italic text-white/50 mb-4">
                  "{testimonial.testimonial}"
                </p>
                <p className="font-semibold text-blue-300">
                  {testimonial.name}, {testimonial.role}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-6 lg:px-14 py-20 bg-gradient-to-b from-custom2 to-custom1 text-center">
          <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
            Have Questions? Get in Touch!
          </h2>
          <p className="text-lg max-w-4xl mx-auto text-white/50 mb-12">
            Whether you're a beginner or an expert, we're here to help you. Drop
            us a message or join our community to learn more.
          </p>
          <div className="flex-col flex md:flex-row justify-center gap-4">
            <Button className="px-8 py-4 text-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-80 transition duration-200 ease-in-out text-white font-light">
              Contact Us
            </Button>
            <Button className="px-8 py-4 text-lg bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-white font-light">
              Join Our Community
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
