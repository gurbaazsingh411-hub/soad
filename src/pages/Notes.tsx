import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, Sparkles, List, BookOpen, Lightbulb, FunctionSquare, CheckCircle2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

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

const subjectNames: Record<string, string> = {
  "0580": "Mathematics", "0625": "Physics", "0620": "Chemistry", "0610": "Biology",
  "0478": "Computer Science", "0500": "English", "0455": "Economics", "0450": "Business Studies",
};

const topicsBySubject: Record<string, string[]> = {
  "0580": ["Number", "Algebra", "Geometry", "Statistics", "Probability", "Functions", "Vectors"],
  "0625": ["Forces & Motion", "Energy", "Waves", "Electricity", "Magnetism", "Nuclear Physics", "Thermal Physics"],
  "0620": ["Atomic Structure", "Bonding", "Stoichiometry", "Organic Chemistry", "Energetics", "Rates of Reaction", "Acids & Bases"],
  "0610": ["Cells", "Enzymes", "Genetics", "Ecology", "Human Biology", "Plant Biology", "Respiration"],
  "0478": ["Data Representation", "Programming", "Databases", "Networks", "Logic Gates", "Computer Architecture", "Algorithms"],
  "0500": ["Comprehension", "Summary Writing", "Narrative Writing", "Descriptive Writing", "Argumentative Writing", "Analysis"],
  "0455": ["Supply & Demand", "Market Failure", "Government Policy", "International Trade", "Development", "Money & Banking"],
  "0450": ["Enterprise", "Marketing", "Finance", "Operations", "Human Resources", "Business Environment"],
};

const noteModes = [
  { id: "concise", label: "Concise Revision", icon: List, desc: "Key points stripped to essentials", color: "text-neon-cyan", glowClass: "neon-glow-cyan", borderActive: "border-primary/50 bg-primary/10" },
  { id: "deep", label: "Deep Conceptual", icon: BookOpen, desc: "In-depth explanations & connections", color: "text-neon-violet", glowClass: "neon-glow-violet", borderActive: "border-secondary/50 bg-secondary/10" },
  { id: "bullet", label: "Bullet Summary", icon: Lightbulb, desc: "Quick bullet-point overview", color: "text-neon-green", glowClass: "", borderActive: "border-neon-green/50 bg-neon-green/10" },
  { id: "formula", label: "Formula Sheet", icon: FunctionSquare, desc: "Formulas, equations & key data", color: "text-neon-orange", glowClass: "", borderActive: "border-neon-orange/50 bg-neon-orange/10" },
];

const NOTES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notes`;

export default function Notes() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("concise");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const availableTopics = subject ? topicsBySubject[subject] || [] : [];

  const handleGenerate = useCallback(async () => {
    if (!subject || !topic) return;
    setContent("");
    setIsLoading(true);

    try {
      const resp = await fetch(NOTES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ subject: subjectNames[subject] || subject, topic, mode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: err.error || "Failed to generate notes", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              setContent(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate notes. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [subject, topic, mode, toast]);

  const activeMode = noteModes.find((m) => m.id === mode);

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-cosmic-text">Smart Notes</span>
          </h1>
          <p className="text-muted-foreground text-lg">Generate intelligent revision notes tailored to your study style.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
          {/* Subject */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Subject</label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTopic(""); }}
                className="w-full bg-muted text-foreground rounded-lg px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select a subject...</option>
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Topic */}
          <AnimatePresence>
            {subject && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass p-6">
                <label className="text-sm font-medium text-foreground mb-3 block">Topic</label>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.map((t) => (
                    <button key={t} onClick={() => setTopic(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${topic === t ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-transparent hover:text-foreground"}`}>
                      {topic === t && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Note Mode */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Note Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {noteModes.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={`p-4 rounded-lg border text-left transition-all ${mode === m.id ? `${m.borderActive} ${m.glowClass}` : "border-border bg-muted/50 hover:border-muted-foreground/30"}`}>
                  <m.icon className={`w-5 h-5 mb-2 ${mode === m.id ? m.color : "text-muted-foreground"}`} />
                  <p className={`text-sm font-semibold ${mode === m.id ? m.color : "text-foreground"}`}>{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!subject || !topic || isLoading}
            className="w-full py-4 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isLoading ? "Generating..." : "Generate Notes"}
          </button>

          {/* Output */}
          <AnimatePresence>
            {(content || isLoading) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className={`w-5 h-5 ${activeMode?.color}`} />
                  <h3 className="font-semibold text-foreground">
                    {activeMode?.label} — {topic}
                  </h3>
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary">
                  <ReactMarkdown>{content}</ReactMarkdown>
                  {isLoading && !content && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating notes...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
