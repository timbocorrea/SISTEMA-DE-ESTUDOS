-- Function to get database size
-- Run this in your Supabase SQL Editor

create or replace function get_db_stats()
returns json
language plpgsql
security definer
as $$
declare
  total_size text;
  user_count integer;
  course_count integer;
  lesson_count integer;
  file_count integer;
  file_size bigint;
begin
  -- Get DB Size
  select pg_size_pretty(pg_database_size(current_database())) into total_size;
  
  -- Get Counts
  select count(*) into user_count from auth.users;
  select count(*) into course_count from public.courses;
  select count(*) into lesson_count from public.lessons;
  
  -- Get Storage Stats (estimated from metadata if possible, or just return 0 and let frontend calc)
  -- Doing storage summation in SQL is hard because 'storage.objects' might not be accessible easily or accurate
  -- We will let frontend handle storage stats via the existing FileManagement logic or just count the objects here if permissions allow
  select count(*) into file_count from storage.objects where owner is not null;
  select sum((metadata->>'size')::bigint) into file_size from storage.objects where owner is not null;

  return json_build_object(
    'db_size', total_size,
    'user_count', user_count,
    'course_count', course_count,
    'lesson_count', lesson_count,
    'file_count', coalesce(file_count, 0),
    'storage_size_bytes', coalesce(file_size, 0)
  );
end;
$$;
