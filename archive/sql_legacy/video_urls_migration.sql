-- Migration: Add support for multiple video URLs per lesson
-- This adds a new video_urls column while maintaining backward compatibility with video_url

-- Add new video_urls column to store array of video objects
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS video_urls jsonb DEFAULT '[]'::jsonb;

-- Add a comment to document the new column
COMMENT ON COLUMN public.lessons.video_urls IS 'Array of video objects with structure: [{"url": "...", "title": "..."}]. The first video in the array should match video_url for backward compatibility.';

-- Optional: Create an index for better query performance on video_urls
CREATE INDEX IF NOT EXISTS idx_lessons_video_urls ON public.lessons USING gin(video_urls);
