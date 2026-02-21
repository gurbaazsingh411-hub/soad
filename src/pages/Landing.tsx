import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, Layers, BarChart3, Sparkles, Target } from "lucide-react";
import ParticleField from "@/components/ParticleField";

const features = [
  {
    icon: Sparkles,
    title: "AI Question Generator",
    description: "Exam-style questions mirroring real IGCSE patterns, with mark schemes and examiner comments.",
    color: "text-neon-cyan",
    glow: "neon-glow-cyan",
  },
  {
    icon: Layers,
    title: "Mock Exam Builder",
    description: "Full paper simulations with countdown timer, auto-marking, and grade estimation.",
    color: "text-neon-violet",
    glow: "neon-glow-violet",
  },
  {
    icon: BookOpen,
    title: "Smart Notes",
    description: "AI-generated revision notes with definitions, examples, and examiner insights.",
    color: "text-neon-blue",
    glow: "",
  },
  {
    icon: Brain,
    title: "Flashcards Engine",
    description: "Spaced repetition flashcards with difficulty tagging and AI-adjusted frequency.",
    color: "text-neon-green",
    glow: "",
  },
  {
    icon: BarChart3,
    title: "Performance Dashboard",
    description: "Topic mastery tracking, weak area detection, and grade prediction analytics.",
    color: "text-neon-orange",
    glow: "",
  },
  {
    icon: Target,
    title: "Precision Difficulty",
    description: "Four difficulty modes from Foundation to Exam Stress, engineered from past paper data.",
    color: "text-neon-red",
    glow: "",
  },
];

const subjects = [
  { code: "0580", name: "Mathematics" },
  { code: "0625", name: "Physics" },
  { code: "0620", name: "Chemistry" },
  { code: "0610", name: "Biology" },
  { code: "0478", name: "Computer Science" },
  { code: "0500", name: "English" },
  { code: "0455", name: "Economics" },
  { code: "0450", name: "Business Studies" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <ParticleField />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-primary/20 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Engineered for IGCSE Precision
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="gradient-cosmic-text">Master IGCSE</span>
              <br />
              <span className="text-foreground">with AI Precision</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Generate exam-style questions, build mock exams, and track your performance
              — all powered by AI trained on real Cambridge past paper patterns.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/generate"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-105"
              >
                Generate Questions
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/subjects"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold glass text-foreground hover:bg-card/80 transition-all"
              >
                Explore Subjects
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to <span className="gradient-cosmic-text">ace your exams</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A structured academic engine, not a generic AI wrapper.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="glass p-6 hover:bg-card/70 transition-all group cursor-default"
              >
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4 ${f.color} group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              8 IGCSE Subjects, <span className="gradient-cosmic-text">One Platform</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-12">
              Structured per official Cambridge subject codes.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {subjects.map((s) => (
              <motion.div
                key={s.code}
                variants={item}
                className="glass p-4 text-center hover:neon-glow-cyan hover:border-primary/30 transition-all cursor-pointer group"
              >
                <span className="text-xs text-muted-foreground font-mono">{s.code}</span>
                <p className="text-sm font-semibold text-foreground mt-1 group-hover:text-primary transition-colors">{s.name}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12"
          >
            <Link
              to="/subjects"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              View all subjects <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass p-12 neon-glow-cyan"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to forge your success?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start generating IGCSE exam-style questions now. No sign-up required to explore.
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-105"
            >
              Start Generating
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="gradient-cosmic-text font-semibold">ExamForge AI</span>
          <span>Master IGCSE. Engineered for Precision.</span>
        </div>
      </footer>
    </div>
  );
}
