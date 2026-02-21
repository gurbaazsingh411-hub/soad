import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Clock, ChevronDown, Sparkles, Loader2, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";
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
  { id: "foundation", label: "Foundation", emoji: "🟢" },
  { id: "standard", label: "Standard", emoji: "🟡" },
  { id: "challenging", label: "Challenging", emoji: "🔴" },
];

const timeLimits = [
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "45 min", seconds: 2700 },
  { label: "60 min", seconds: 3600 },
];

const QUESTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;

interface ExamQuestion {
  question: string;
  answer: string;
  marks: number;
  type: string;
  topic: string;
}

type Phase = "setup" | "exam" | "results";

function gradeFromPercent(p: number): string {
  if (p >= 90) return "A*";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  if (p >= 40) return "E";
  if (p >= 30) return "F";
  return "G";
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function MockExam() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("standard");
  const [timeLimit, setTimeLimit] = useState(1800);
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ score: number; total: number; correct: boolean[] }>({ score: 0, total: 0, correct: [] });
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startExam = async () => {
    if (!subject) return;
    setIsLoading(true);

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
          questionTypes: ["Structured", "Long Answer"],
          numQuestions,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: err.error || "Failed to generate exam", variant: "destructive" });
        return;
      }

      const data = await resp.json();
      const qs = data.questions || [];
      if (qs.length === 0) {
        toast({ title: "Error", description: "No questions generated. Try again.", variant: "destructive" });
        return;
      }

      setQuestions(qs);
      setAnswers({});
      setTimeLeft(timeLimit);
      startTimeRef.current = Date.now();
      setPhase("exam");
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to start exam.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Simple grading: if the user provided an answer, give marks; otherwise 0
    // In a real scenario the AI would grade, but for now we do keyword matching
    let totalScore = 0;
    const totalMarks = questions.reduce((a, q) => a + q.marks, 0);
    const correctArr = questions.map((q, i) => {
      const userAns = (answers[i] || "").trim().toLowerCase();
      if (!userAns) return false;
      // Give partial credit if they answered
      const answerKeywords = q.answer.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const matchCount = answerKeywords.filter((kw) => userAns.includes(kw)).length;
      const ratio = answerKeywords.length > 0 ? matchCount / answerKeywords.length : 0;
      const earned = Math.round(q.marks * Math.min(ratio * 1.5, 1));
      totalScore += earned;
      return ratio > 0.3;
    });

    setResults({ score: totalScore, total: totalMarks, correct: correctArr });
    setPhase("results");

    // Save to Supabase
    if (user) {
      try {
        const { data: exam, error: examError } = await supabase
          .from("mock_exams" as any)
          .insert({
            user_id: user.id,
            subject: subjectNames[subject] || subject,
            difficulty,
            total_marks: totalMarks,
            score: totalScore,
            time_limit_seconds: timeLimit,
            time_taken_seconds: timeTaken,
            completed_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();

        if (examError) throw examError;

        const examId = (exam as any).id;
        const examQs = questions.map((q, i) => ({
          exam_id: examId,
          question_text: q.question,
          answer_text: q.answer,
          marks: q.marks,
          user_answer: answers[i] || "",
          is_correct: correctArr[i],
          order_index: i,
        }));

        await supabase.from("mock_exam_questions" as any).insert(examQs as any);

        // Update study progress
        await supabase.from("study_progress" as any).upsert(
          {
            user_id: user.id,
            subject: subjectNames[subject] || subject,
            questions_solved: questions.length,
            correct_count: correctArr.filter(Boolean).length,
            total_time_seconds: timeTaken,
            last_studied_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,subject" }
        );
      } catch (e) {
        console.error("Failed to save exam results:", e);
      }
    }
  }, [questions, answers, user, subject, difficulty, timeLimit]);

  const resetExam = () => {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setResults({ score: 0, total: 0, correct: [] });
  };

  // ── Setup Phase ──
  if (phase === "setup") {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-4xl font-bold mb-3">
              <span className="gradient-cosmic-text">Mock Exam Builder</span>
            </h1>
            <p className="text-muted-foreground text-lg">Build a timed exam simulation that mirrors real IGCSE papers.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
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
              <label className="text-sm font-medium text-foreground mb-3 block">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${difficulty === d.id
                      ? "border-primary/50 bg-primary/10 neon-glow-cyan"
                      : "border-border bg-muted/50 hover:border-muted-foreground/30"
                      }`}
                  >
                    <span className="text-lg">{d.emoji}</span>
                    <p className={`text-sm font-semibold mt-1 ${difficulty === d.id ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div className="glass p-6">
              <label className="text-sm font-medium text-foreground mb-3 block">Time Limit</label>
              <div className="grid grid-cols-4 gap-3">
                {timeLimits.map((t) => (
                  <button
                    key={t.seconds}
                    onClick={() => setTimeLimit(t.seconds)}
                    className={`p-3 rounded-lg border text-center transition-all ${timeLimit === t.seconds
                      ? "border-primary/50 bg-primary/10 neon-glow-cyan"
                      : "border-border bg-muted/50 hover:border-muted-foreground/30"
                      }`}
                  >
                    <Clock className={`w-4 h-4 mx-auto mb-1 ${timeLimit === t.seconds ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`text-sm font-semibold ${timeLimit === t.seconds ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div className="glass p-6">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Questions: <span className="text-primary">{numQuestions}</span>
              </label>
              <input
                type="range" min={5} max={20} value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5</span><span>10</span><span>15</span><span>20</span>
              </div>
            </div>

            {/* Start */}
            <button
              onClick={startExam}
              disabled={!subject || isLoading}
              className="w-full py-4 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isLoading ? "Generating Exam..." : "Start Mock Exam"}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Exam Phase ──
  if (phase === "exam") {
    const urgency = timeLeft < 60 ? "text-neon-red" : timeLeft < 300 ? "text-neon-orange" : "text-primary";
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Timer bar */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 mb-8 flex items-center justify-between sticky top-20 z-40">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{subjectNames[subject]}</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{questions.length} questions</span>
            </div>
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${urgency}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          </motion.div>

          {/* Questions */}
          <div className="space-y-6 mb-8">
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    Q{i + 1} • {q.marks} mark{q.marks !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">{q.question}</p>
                <textarea
                  value={answers[i] || ""}
                  onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                  placeholder="Type your answer here..."
                  rows={4}
                  className="w-full bg-muted text-foreground rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
              </motion.div>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-xl text-base font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Submit Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Results Phase ──
  const percent = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
  const grade = gradeFromPercent(percent);

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass p-8 text-center mb-8 neon-glow-cyan">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-cosmic-text">Exam Complete</span>
          </h1>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{results.score}/{results.total}</p>
              <p className="text-sm text-muted-foreground">Marks</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{percent}%</p>
              <p className="text-sm text-muted-foreground">Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-neon-green">{grade}</p>
              <p className="text-sm text-muted-foreground">Est. Grade</p>
            </div>
          </div>
        </motion.div>

        {/* Review */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-foreground">Question Review</h3>
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass p-5 border-l-4 ${results.correct[i] ? "border-l-neon-green" : "border-l-neon-red"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {results.correct[i] ? (
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-neon-red" />
                )}
                <span className="text-xs font-mono text-muted-foreground">Q{i + 1} • {q.marks} marks</span>
              </div>
              <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{q.question}</p>
              {answers[i] && (
                <div className="bg-muted/50 rounded-lg p-3 mb-2">
                  <p className="text-xs text-muted-foreground mb-1">Your answer:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{answers[i]}</p>
                </div>
              )}
              <div className="bg-neon-green/5 border border-neon-green/20 rounded-lg p-3">
                <p className="text-xs text-neon-green mb-1">Model answer:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={resetExam}
            className="flex-1 py-3 rounded-xl text-sm font-semibold glass text-foreground hover:bg-card/80 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Exam
          </button>
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="flex-1 py-3 rounded-xl text-sm font-semibold gradient-cosmic text-primary-foreground neon-glow-cyan transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            View Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
