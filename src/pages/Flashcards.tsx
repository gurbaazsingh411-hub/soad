import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, RotateCcw, ThumbsUp, ThumbsDown, Plus, Loader2, Sparkles, ChevronDown, Trash2 } from "lucide-react";
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

const FLASHCARDS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`;

interface Card {
  id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  next_review_at: string;
  review_count: number;
}

interface Deck {
  id: string;
  title: string;
  subject: string;
  topic: string;
}

export default function Flashcards() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);

  // Form state
  const [newSub, setNewSub] = useState("");
  const [newTopic, setNewTopic] = useState("");

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchDecks();
  }, [user]);

  const fetchDecks = async () => {
    const { data, error } = await supabase
      .from("flashcard_decks" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setDecks(data || []);
  };

  const fetchCards = async (deckId: string) => {
    const { data, error } = await supabase
      .from("flashcards" as any)
      .select("*")
      .eq("deck_id", deckId)
      .order("next_review_at", { ascending: true });

    if (error) console.error(error);
    else {
      setCards(data || []);
      setCurrentIndex(0);
      setFlipped(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!user || !newSub || !newTopic) return;
    setIsGenerating(true);

    try {
      // 1. Generate via AI
      const resp = await fetch(FLASHCARDS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ subject: newSub, topic: newTopic, count: 10 }),
      });

      if (!resp.ok) throw new Error("Ai generation failed");
      const { flashcards: aiCards } = await resp.json();

      // 2. Save Deck
      const { data: deck, error: deckErr } = await supabase
        .from("flashcard_decks" as any)
        .insert({
          user_id: user.id,
          subject: newSub,
          topic: newTopic,
          title: `${newTopic} (${newSub})`,
        } as any)
        .select()
        .single();

      if (deckErr) throw deckErr;

      // 3. Save Cards
      const cardsToInsert = aiCards.map((c: any) => ({
        deck_id: (deck as any).id,
        front: c.front,
        back: c.back,
      }));

      const { error: cardsErr } = await supabase.from("flashcards" as any).insert(cardsToInsert as any);
      if (cardsErr) throw cardsErr;

      toast({ title: "Deck Created!", description: `Generated ${aiCards.length} flashcards.` });
      setShowNewDeckForm(false);
      fetchDecks();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCardSM2 = async (card: Card, quality: number) => {
    // Basic SM-2 Algorithm Implementation
    let { ease_factor, interval_days, review_count } = card;

    if (quality >= 3) { // Knew it
      if (review_count === 0) interval_days = 1;
      else if (review_count === 1) interval_days = 6;
      else interval_days = Math.round(interval_days * ease_factor);

      review_count++;
      ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else { // Forgot
      review_count = 0;
      interval_days = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
    }

    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval_days);

    const { error } = await supabase
      .from("flashcards" as any)
      .update({
        ease_factor,
        interval_days,
        review_count,
        next_review_at: next_review_at.toISOString(),
      } as any)
      .eq("id", card.id);

    if (error) console.error(error);

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
    } else {
      toast({ title: "Session Finished!", description: "You've reviewed all cards in this deck." });
      setSelectedDeck(null);
    }
  };

  const deleteDeck = async (id: string) => {
    const { error } = await supabase.from("flashcard_decks" as any).delete().eq("id", id);
    if (!error) fetchDecks();
  };

  if (!selectedDeck) {
    return (
      <div className="min-h-screen py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-cosmic-text">Flashcards</span>
              </h1>
              <p className="text-muted-foreground text-lg">Spaced repetition for long-term mastery.</p>
            </div>
            <button
              onClick={() => setShowNewDeckForm(!showNewDeckForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/30 font-semibold transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Deck
            </button>
          </div>

          <AnimatePresence>
            {showNewDeckForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass p-6 mb-8 overflow-hidden"
              >
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject</label>
                    <div className="relative">
                      <select
                        value={newSub}
                        onChange={(e) => setNewSub(e.target.value)}
                        className="w-full bg-muted rounded-lg px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-1"
                      >
                        <option value="">Select subject...</option>
                        {subjects.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Organic Chemistry"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      className="w-full bg-muted rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateDeck}
                  disabled={isGenerating || !newSub || !newTopic}
                  className="w-full py-3 rounded-xl gradient-cosmic text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isGenerating ? "Generating Deck..." : "Generate AI Flashcards"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {decks.map((deck) => (
              <motion.div
                key={deck.id}
                layout
                className="glass p-5 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedDeck(deck);
                  fetchCards(deck.id);
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Brain className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg mb-1">{deck.title}</h3>
                <p className="text-xs text-muted-foreground">{deck.subject} • {deck.topic}</p>
              </motion.div>
            ))}

            {decks.length === 0 && !isGenerating && (
              <div className="col-span-full py-20 text-center glass opacity-50">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No flashcard decks yet. Create your first one!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedDeck(null)}
          className="text-sm text-primary mb-6 flex items-center gap-1 hover:underline"
        >
          ← Back to Decks
        </button>

        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{selectedDeck.subject}</span>
        </div>

        {cards.length > 0 ? (
          <>
            <div
              onClick={() => setFlipped(!flipped)}
              className="cursor-pointer perspective-1000 mb-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={flipped ? "back" : "front"}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`glass p-10 min-h-[300px] flex flex-col items-center justify-center text-center ${flipped ? "neon-glow-violet border-secondary/30" : "neon-glow-cyan border-primary/20"
                    }`}
                >
                  {!flipped ? (
                    <>
                      <Brain className="w-8 h-8 text-primary mb-6" />
                      <p className="text-xl font-semibold leading-relaxed">{card.front}</p>
                      <p className="text-xs text-muted-foreground mt-8">Tap to reveal answer</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg leading-relaxed whitespace-pre-line">{card.back}</p>
                      <p className="text-xs text-muted-foreground mt-8">Tap to see question</p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => updateCardSM2(card, 0)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive/15 text-neon-red border border-destructive/30 text-sm font-bold hover:bg-destructive/25 transition-all"
              >
                <ThumbsDown className="w-4 h-4" />
                Forgot
              </button>
              <button
                onClick={() => setFlipped(!flipped)}
                className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => updateCardSM2(card, 5)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/15 text-primary border border-primary/30 text-sm font-bold hover:bg-primary/25 transition-all"
              >
                <ThumbsUp className="w-4 h-4" />
                Knew it
              </button>
            </div>
          </>
        ) : (
          <div className="glass p-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
