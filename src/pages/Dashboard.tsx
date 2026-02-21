import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Target, Clock, TrendingUp, Flame, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface Stat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([
    { label: "Questions Solved", value: "0", icon: Target, color: "text-neon-cyan" },
    { label: "Study Streak", value: "0 days", icon: Flame, color: "text-neon-orange" },
    { label: "Avg. Time/Q", value: "—", icon: Clock, color: "text-neon-violet" },
    { label: "Grade Prediction", value: "—", icon: TrendingUp, color: "text-neon-green" },
  ]);
  const [subjectMastery, setSubjectMastery] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch study progress per subject
      const { data: progress } = await supabase
        .from("study_progress" as any)
        .select("*")
        .eq("user_id", user?.id);

      // 2. Fetch mock exams for grade prediction
      const { data: exams } = await supabase
        .from("mock_exams" as any)
        .select("*")
        .eq("user_id", user?.id)
        .order("completed_at", { ascending: false });

      // Calculate stats
      const totalSolved = progress?.reduce((acc: number, curr: any) => acc + curr.questions_solved, 0) || 0;
      const totalTime = progress?.reduce((acc: number, curr: any) => acc + curr.total_time_seconds, 0) || 0;

      let avgTime = "—";
      if (totalSolved > 0 && totalTime > 0) {
        const seconds = Math.round(totalTime / totalSolved);
        avgTime = seconds > 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
      }

      let gradePred = "—";
      if (exams && exams.length > 0) {
        const avgScore = exams.reduce((acc: number, curr: any) => acc + (curr.score / curr.total_marks), 0) / exams.length;
        const p = avgScore * 100;
        if (p >= 90) gradePred = "A*";
        else if (p >= 80) gradePred = "A";
        else if (p >= 70) gradePred = "B";
        else if (p >= 60) gradePred = "C";
        else if (p >= 50) gradePred = "D";
        else gradePred = "E";
      }

      setStats([
        { label: "Questions Solved", value: totalSolved, icon: Target, color: "text-neon-cyan" },
        { label: "Study Streak", value: `1 day`, icon: Flame, color: "text-neon-orange" }, // Simplified streak logic
        { label: "Avg. Time/Q", value: avgTime, icon: Clock, color: "text-neon-violet" },
        { label: "Grade Prediction", value: gradePred, icon: TrendingUp, color: "text-neon-green" },
      ]);

      setSubjectMastery(progress?.map((p: any) => ({
        name: p.subject,
        mastery: Math.min(Math.round((p.correct_count / Math.max(p.questions_solved, 1)) * 100), 100)
      })) || []);

      // 3. Fetch recent history (unionized logically)
      const { data: qs } = await supabase.from("generated_questions" as any).select("*").limit(3).order("created_at", { ascending: false });
      setRecentActivity(qs || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-cosmic-text">Performance Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-lg">Track your IGCSE progress and predicted grades.</p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {stats.map((s) => (
            <div key={s.label} className="glass p-5">
              <s.icon className={`w-6 h-6 ${s.color} mb-3`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subject mastery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Subject Mastery (Accuracy %)</h3>
            </div>
            <div className="space-y-5">
              {subjectMastery.length > 0 ? subjectMastery.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.mastery}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-cosmic rounded-full transition-all duration-1000"
                      style={{ width: `${s.mastery}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-10">Solve some questions to see mastery stats.</p>
              )}
            </div>
          </motion.div>

          {/* Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{act.subject}</p>
                      <p className="text-xs text-muted-foreground">{act.difficulty} • {new Date(act.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No activity yet.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
