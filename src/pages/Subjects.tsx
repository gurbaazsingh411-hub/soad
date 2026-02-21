import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, Atom, FlaskConical, Leaf, Monitor, PenTool, TrendingUp, Briefcase, ArrowRight } from "lucide-react";

const subjects = [
  { code: "0580", name: "Mathematics", icon: Calculator, color: "text-neon-cyan", topics: ["Number", "Algebra", "Geometry", "Statistics", "Probability"] },
  { code: "0625", name: "Physics", icon: Atom, color: "text-neon-violet", topics: ["Forces", "Energy", "Waves", "Electricity", "Nuclear Physics"] },
  { code: "0620", name: "Chemistry", icon: FlaskConical, color: "text-neon-green", topics: ["Atomic Structure", "Bonding", "Organic Chemistry", "Energetics", "Rates"] },
  { code: "0610", name: "Biology", icon: Leaf, color: "text-neon-orange", topics: ["Cells", "Enzymes", "Genetics", "Ecology", "Human Biology"] },
  { code: "0478", name: "Computer Science", icon: Monitor, color: "text-neon-blue", topics: ["Data Representation", "Programming", "Databases", "Networks", "Logic"] },
  { code: "0500", name: "English", icon: PenTool, color: "text-neon-red", topics: ["Comprehension", "Summary", "Narrative Writing", "Descriptive Writing", "Analysis"] },
  { code: "0455", name: "Economics", icon: TrendingUp, color: "text-neon-cyan", topics: ["Supply & Demand", "Market Failure", "Government", "Trade", "Development"] },
  { code: "0450", name: "Business Studies", icon: Briefcase, color: "text-neon-violet", topics: ["Enterprise", "Marketing", "Finance", "Operations", "HR"] },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Subjects() {
  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-cosmic-text">IGCSE Subjects</span>
          </h1>
          <p className="text-muted-foreground text-lg">Select a subject to start generating questions.</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="grid md:grid-cols-2 gap-5">
          {subjects.map((s) => (
            <motion.div key={s.code} variants={item}>
              <Link
                to={`/generate?subject=${s.code}`}
                className="glass p-6 flex gap-5 items-start hover:neon-glow-cyan hover:border-primary/30 transition-all group block"
              >
                <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center ${s.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{s.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{s.code}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.topics.map((t) => (
                      <span key={t} className="text-xs text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
