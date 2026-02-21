# ExamForge AI — Master IGCSE with Precision

ExamForge AI is a premium, AI-powered study platform engineered for Cambridge IGCSE students. It moves beyond generic AI wrappers by providing a structured academic engine trained on real exam patterns.

## 🚀 Key Features

- **AI Question Generator**: Generate exam-style questions mirroring real IGCSE patterns with detailed mark schemes.
- **Mock Exam Builder**: Build timed 15–60 minute paper simulations with auto-grading and grade estimation (A*–G).
- **Smart Note Engine**: Stream AI notes in 4 modes: Concise, Deep Conceptual, Bullet Summary, and Formula Sheet.
- **Spaced Repetition Flashcards**: AI-generated decks using the SM-2 algorithm for long-term mastery.
- **Performance Dashboard**: Live tracking of questions solved, study streaks, and subject-specific mastery.
- **Pro Design**: Immersive cosmic UI with 3D particle fields, glassmorphism, and neon aesthetics.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeSript, Tailwind CSS
- **Animations**: Framer Motion, Lucide React
- **Backend/DB**: Supabase (Auth, RLS, Storage)
- **AI Infrastructure**: Supabase Edge Functions + Lovable AI Gateway (Gemini 3 Flash)
- **UI Components**: Shadcn/UI

## 📦 Setup & Installation

1. **Clone the repository**:
   ```sh
   git clone <repo-url>
   cd examforge-ai
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Initialize Database**:
   Run the SQL provided in `supabase/schema.sql` in your Supabase SQL Editor.

5. **Deploy Edge Functions**:
   ```sh
   supabase functions deploy generate-notes
   supabase functions deploy generate-questions
   supabase functions deploy generate-flashcards
   ```

6. **Start Development Server**:
   ```sh
   npm run dev
   ```

## 📂 Folder Structure

- `src/pages`: Main application views (Dashboard, Flashcards, MockExam, etc.)
- `src/components`: Reusable UI elements and Auth providers
- `src/integrations`: Supabase client and auto-generated types
- `supabase/functions`: Deno edge functions for AI logic
- `supabase/schema.sql`: Database definition and RLS policies

## 📄 License

MIT © ExamForge AI
