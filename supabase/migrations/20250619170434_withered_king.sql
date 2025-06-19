-- =============================================
-- TUDUAI DATABASE SETUP - COMPLETE RESET & CREATE
-- =============================================
-- This migration completely resets and creates the TuduAI database
-- Run this as a single migration to avoid conflicts

-- =============================================
-- STEP 1: COMPLETE CLEANUP (if anything exists)
-- =============================================

-- 1. Create the users table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- 3. Add RLS policy: allow users to read/update their own profile
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

-- 4. Create a trigger function to insert into users when a new auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- 5. Create the trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- 6. Backfill existing auth.users into public.users (optional if users already signed up)
insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- 1. Create tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now()),
  completed_at timestamp with time zone
);

-- 2. Enable RLS (Row Level Security)
alter table public.tasks enable row level security;

-- 3. Policy: allow logged-in users to access only their own tasks
create policy "Users can select their own tasks" on public.tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on public.tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

-- 4. Trigger: auto-update updated_at on update
create or replace function update_task_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at
before update on public.tasks
for each row
execute procedure update_task_updated_at_column();

-- 5. Trigger: auto-set completed_at if is_completed = true
create or replace function update_completed_at_column()
returns trigger as $$
begin
  if new.is_completed and not old.is_completed then
    new.completed_at = now();
  elsif not new.is_completed and old.is_completed then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_completed_at on public.tasks;
create trigger set_completed_at
before update on public.tasks
for each row
execute procedure update_completed_at_column();

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS handle_task_completion_trigger ON public.tasks;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_task_completion() CASCADE;

-- Drop all views
DROP VIEW IF EXISTS public.active_tasks CASCADE;
DROP VIEW IF EXISTS public.user_task_stats CASCADE;

-- Drop all tables (in correct order)
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =============================================
-- STEP 2: CREATE TABLES
-- =============================================

-- Create users table first (referenced by tasks)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  preferences jsonb DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text NOT NULL DEFAULT 'other' 
    CHECK (category IN ('work', 'personal', 'health', 'learning', 'other')),
  due_date timestamptz,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  tags jsonb DEFAULT '[]' NOT NULL,
  ai_parsed boolean DEFAULT false NOT NULL,
  original_input text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- STEP 3: CREATE INDEXES
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Tasks table indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_completed ON public.tasks(completed);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_category ON public.tasks(category);

-- Composite indexes for common queries
CREATE INDEX idx_tasks_user_completed ON public.tasks(user_id, completed);
CREATE INDEX idx_tasks_user_due_date ON public.tasks(user_id, due_date) WHERE due_date IS NOT NULL;

-- GIN index for JSON tags
CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);

-- =============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 5: CREATE SECURITY POLICIES
-- =============================================

-- Users policies
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can read own tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: CREATE FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle task completion
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false AND OLD.completed = true THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to create user profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (NEW.id, NEW.email, user_name, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- =============================================
-- STEP 7: CREATE TRIGGERS
-- =============================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_task_completion_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_completion();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 8: SYNC EXISTING AUTH USERS
-- =============================================

INSERT INTO public.users (id, email, name, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1),
    'User'
  ) as name,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STEP 9: VERIFICATION
-- =============================================

DO $$
DECLARE
  users_count integer;
  auth_users_count integer;
BEGIN
  SELECT COUNT(*) INTO users_count FROM public.users;
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ================================';
  RAISE NOTICE '   TuduAI Setup Complete!';
  RAISE NOTICE '🎉 ================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created: users, tasks';
  RAISE NOTICE '✅ Security policies enabled';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Triggers set up for automation';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Users synced: % public.users from % auth.users', users_count, auth_users_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to use TuduAI!';
  RAISE NOTICE '================================';
END $$;