import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, FileQuestion, CheckCircle2, Loader2, Save, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

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

const difficulties = [
  { id: "foundation", label: "Foundation", emoji: "🟢", desc: "Core syllabus basics" },
  { id: "standard", label: "Standard", emoji: "🟡", desc: "Real exam level" },
  { id: "challenging", label: "Challenging", emoji: "🔴", desc: "Top grade preparation" },
  { id: "stress", label: "Exam Stress", emoji: "🔥", desc: "Hardest patterns" },
];

const questionTypes = ["MCQ", "Structured", "Long Answer"];

const QUESTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;

interface GeneratedQuestion {
  question: string;
  answer: string;
  marks: number;
  type: string;
  topic: string;
}

export default function Generate() {
  const [searchParams] = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [difficulty, setDifficulty] = useState("standard");
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Structured"]);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const s = searchParams.get("subject");
    if (s) setSubject(s);
  }, [searchParams]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleGenerate = async () => {
    if (!subject) return;
    setIsLoading(true);
    setQuestions([]);
    setSaved(false);

    try {
      const resp = await fetch(QUESTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          subject: subjectNames[subject] || subject,
          difficulty,
          questionTypes: selectedTypes,
          numQuestions,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: err.error || "Failed to generate questions", variant: "destructive" });
        return;
      }

      const data = await resp.json();
      setQuestions(data.questions || []);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate questions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || questions.length === 0) return;

    try {
      const rows = questions.map((q) => ({
        user_id: user.id,
        subject: subjectNames[subject] || subject,
        topic: q.topic || "",
        difficulty,
        question_type: q.type,
        question_text: q.question,
        answer_text: q.answer,
        marks: q.marks,
      }));

      const { error } = await supabase.from("generated_questions" as any).insert(rows as any);
      if (error) throw error;

      // Update study progress
      await supabase.from("study_progress" as any).upsert(
        {
          user_id: user.id,
          subject: subjectNames[subject] || subject,
          questions_solved: questions.length,
          correct_count: 0,
          total_time_seconds: 0,
          last_studied_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,subject" }
      );

      setSaved(true);
      toast({ title: "Saved!", description: `${questions.length} questions saved to your library.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Save Failed", description: e.message || "Could not save questions", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-cosmic-text">Question Generator</span>
          </h1>
          <p className="text-muted-foreground text-lg">Generate AI-powered IGCSE exam-style questions.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Subject */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Subject</label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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

          {/* Difficulty */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Difficulty Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${difficulty === d.id
                    ? "border-primary/50 bg-primary/10 neon-glow-cyan"
                    : "border-border bg-muted/50 hover:border-muted-foreground/30"
                    }`}
                >
                  <span className="text-lg">{d.emoji}</span>
                  <p className={`text-sm font-semibold mt-1 ${difficulty === d.id ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question Type */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">Question Types</label>
            <div className="flex gap-3 flex-wrap">
              {questionTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedTypes.includes(t)
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground border border-transparent hover:text-foreground"
                    }`}
                >
                  {selectedTypes.includes(t) && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Number of questions */}
          <div className="glass p-6">
            <label className="text-sm font-medium text-foreground mb-3 block">
              Number of Questions: <span className="text-primary">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span><span>10</span><span>20</span>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!subject || isLoading}
            className="w-full py-4 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isLoading ? "Generating..." : `Generate ${numQuestions} Question${numQuestions > 1 ? "s" : ""}`}
          </button>

          {/* Generated questions */}
          <AnimatePresence>
            {questions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <FileQuestion className="w-5 h-5" />
                    <h3 className="font-semibold">Generated Questions</h3>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all disabled:opacity-50"
                  >
                    {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? "Saved" : "Save All"}
                  </button>
                </div>

                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        Q{i + 1} • {q.type} • {q.marks} mark{q.marks !== 1 ? "s" : ""} {q.topic ? `• ${q.topic}` : ""}
                      </span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{q.question}</p>
                    <button
                      onClick={() => setShowAnswers((p) => ({ ...p, [i]: !p[i] }))}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {showAnswers[i] ? "Hide Answer" : "Show Answer"}
                    </button>
                    <AnimatePresence>
                      {showAnswers[i] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-muted/50 rounded-lg p-4 border border-border/50"
                        >
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
