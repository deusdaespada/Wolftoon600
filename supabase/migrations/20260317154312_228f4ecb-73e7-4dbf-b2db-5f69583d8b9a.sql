CREATE OR REPLACE FUNCTION public.get_reading_rankings(_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  score bigint,
  chapters_read bigint,
  achievements_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH chapters AS (
    SELECT rh.user_id, COUNT(*)::bigint AS chapters_read
    FROM public.reading_history rh
    GROUP BY rh.user_id
  ),
  achievements AS (
    SELECT ua.user_id,
           COUNT(*)::bigint AS achievements_count,
           SUM(
             CASE ua.achievement_id
               WHEN 'legend_reader' THEN 100
               WHEN 'streak_30' THEN 100
               WHEN 'bookworm' THEN 50
               WHEN 'time_100h' THEN 50
               WHEN 'avid_reader' THEN 25
               WHEN 'manhwa_fan' THEN 25
               WHEN 'manga_fan' THEN 25
               WHEN 'manhua_fan' THEN 25
               WHEN 'novel_lover' THEN 25
               WHEN 'streak_7' THEN 25
               WHEN 'genre_explorer' THEN 25
               WHEN 'first_chapter' THEN 10
               WHEN 'collector_10' THEN 10
               WHEN 'time_10h' THEN 10
               ELSE 10
             END
           )::bigint AS achievement_points
    FROM public.user_achievements ua
    GROUP BY ua.user_id
  ),
  all_users AS (
    SELECT user_id FROM chapters
    UNION
    SELECT user_id FROM achievements
  )
  SELECT
    au.user_id,
    p.username,
    p.avatar_url,
    ((COALESCE(c.chapters_read, 0) * 2) + COALESCE(a.achievement_points, 0))::bigint AS score,
    COALESCE(c.chapters_read, 0)::bigint AS chapters_read,
    COALESCE(a.achievements_count, 0)::bigint AS achievements_count
  FROM all_users au
  LEFT JOIN chapters c ON c.user_id = au.user_id
  LEFT JOIN achievements a ON a.user_id = au.user_id
  LEFT JOIN public.profiles p ON p.id = au.user_id
  ORDER BY score DESC, chapters_read DESC, achievements_count DESC
  LIMIT GREATEST(COALESCE(_limit, 50), 1)
$$;

CREATE OR REPLACE FUNCTION public.get_chapter_reading_rankings(_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  score bigint,
  chapters_read bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rh.user_id,
    p.username,
    p.avatar_url,
    COUNT(*)::bigint AS score,
    COUNT(*)::bigint AS chapters_read
  FROM public.reading_history rh
  LEFT JOIN public.profiles p ON p.id = rh.user_id
  GROUP BY rh.user_id, p.username, p.avatar_url
  ORDER BY score DESC
  LIMIT GREATEST(COALESCE(_limit, 50), 1)
$$;