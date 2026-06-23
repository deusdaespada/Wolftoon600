-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create reading goals table
CREATE TABLE public.reading_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  weekly_goal INTEGER DEFAULT 10,
  monthly_goal INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform stats table for averages
CREATE TABLE public.platform_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_users INTEGER DEFAULT 0,
  avg_chapters_per_user NUMERIC(10,2) DEFAULT 0,
  avg_reading_time_hours NUMERIC(10,2) DEFAULT 0,
  top_genre TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reading_goals
CREATE POLICY "Users can view their own goals" 
ON public.reading_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
ON public.reading_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.reading_goals FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for platform_stats - everyone can read
CREATE POLICY "Anyone can view platform stats" 
ON public.platform_stats FOR SELECT 
USING (true);

-- Trigger for updated_at on reading_goals
CREATE TRIGGER update_reading_goals_updated_at
BEFORE UPDATE ON public.reading_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();