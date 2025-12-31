export type CourseRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at?: string;
};

export type ModuleRecord = {
  id: string;
  course_id: string;
  title: string;
  position: number | null;
  created_at?: string;
};

export type LessonRecord = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_urls?: { url: string; title: string }[] | null; // Multiple video URLs
  audio_url: string | null;
  image_url: string | null;
  duration_seconds: number | null;
  position: number | null;
  content_blocks?: any[] | null;
  created_at?: string;
};

export type LessonResourceRecord = {
  id: string;
  lesson_id: string;
  title: string;
  resource_type: 'PDF' | 'AUDIO' | 'IMAGE' | 'LINK' | 'FILE';
  url: string;
  position: number | null;
  created_at?: string;
};

export type ProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  role: 'STUDENT' | 'INSTRUCTOR';
  xp_total: number | null;
  current_level: number | null;
  gemini_api_key?: string | null;
  updated_at?: string;
};

export type CourseEnrollmentRecord = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
};

export type SystemStats = {
  db_size: string;
  user_count: number;
  course_count: number;
  lesson_count: number;
  file_count: number;
  storage_size_bytes: number;
};
