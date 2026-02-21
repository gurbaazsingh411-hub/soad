-- ============================================================
-- ExamForge AI — Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables
-- ============================================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Generated Questions
create table if not exists public.generated_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text,
  difficulty text not null default 'standard',
  question_type text not null default 'Structured',
  question_text text not null,
  answer_text text,
  marks integer default 4,
  created_at timestamptz default now() not null
);

alter table public.generated_questions enable row level security;

create policy "Users can view own questions"
  on public.generated_questions for select
  using (auth.uid() = user_id);

create policy "Users can insert own questions"
  on public.generated_questions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own questions"
  on public.generated_questions for delete
  using (auth.uid() = user_id);


-- 3. Mock Exams
create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  difficulty text not null default 'standard',
  total_marks integer not null default 0,
  score integer,
  time_limit_seconds integer not null default 3600,
  time_taken_seconds integer,
  started_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.mock_exams enable row level security;

create policy "Users can view own exams"
  on public.mock_exams for select
  using (auth.uid() = user_id);

create policy "Users can insert own exams"
  on public.mock_exams for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exams"
  on public.mock_exams for update
  using (auth.uid() = user_id);


-- 4. Mock Exam Questions
create table if not exists public.mock_exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.mock_exams(id) on delete cascade,
  question_text text not null,
  answer_text text not null,
  marks integer not null default 4,
  user_answer text,
  is_correct boolean,
  order_index integer not null default 0
);

alter table public.mock_exam_questions enable row level security;

create policy "Users can view own exam questions"
  on public.mock_exam_questions for select
  using (
    exists (
      select 1 from public.mock_exams
      where mock_exams.id = mock_exam_questions.exam_id
        and mock_exams.user_id = auth.uid()
    )
  );

create policy "Users can insert own exam questions"
  on public.mock_exam_questions for insert
  with check (
    exists (
      select 1 from public.mock_exams
      where mock_exams.id = mock_exam_questions.exam_id
        and mock_exams.user_id = auth.uid()
    )
  );

create policy "Users can update own exam questions"
  on public.mock_exam_questions for update
  using (
    exists (
      select 1 from public.mock_exams
      where mock_exams.id = mock_exam_questions.exam_id
        and mock_exams.user_id = auth.uid()
    )
  );


-- 5. Flashcard Decks
create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  title text not null,
  created_at timestamptz default now() not null
);

alter table public.flashcard_decks enable row level security;

create policy "Users can view own decks"
  on public.flashcard_decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.flashcard_decks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own decks"
  on public.flashcard_decks for delete
  using (auth.uid() = user_id);


-- 6. Flashcards (with SM-2 spaced repetition fields)
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  next_review_at timestamptz default now() not null,
  review_count integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.flashcards enable row level security;

create policy "Users can view own flashcards"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
        and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can insert own flashcards"
  on public.flashcards for insert
  with check (
    exists (
      select 1 from public.flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
        and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can update own flashcards"
  on public.flashcards for update
  using (
    exists (
      select 1 from public.flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
        and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can delete own flashcards"
  on public.flashcards for delete
  using (
    exists (
      select 1 from public.flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
        and flashcard_decks.user_id = auth.uid()
    )
  );


-- 7. Study Progress (aggregated per subject)
create table if not exists public.study_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  questions_solved integer not null default 0,
  correct_count integer not null default 0,
  total_time_seconds integer not null default 0,
  last_studied_at timestamptz default now() not null,
  unique (user_id, subject)
);

alter table public.study_progress enable row level security;

create policy "Users can view own progress"
  on public.study_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.study_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.study_progress for update
  using (auth.uid() = user_id);


-- Index for faster lookups
create index if not exists idx_generated_questions_user on public.generated_questions(user_id);
create index if not exists idx_mock_exams_user on public.mock_exams(user_id);
create index if not exists idx_flashcard_decks_user on public.flashcard_decks(user_id);
create index if not exists idx_study_progress_user on public.study_progress(user_id);
create index if not exists idx_flashcards_next_review on public.flashcards(next_review_at);
