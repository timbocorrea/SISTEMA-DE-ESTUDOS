export type CourseRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  color?: string | null;
  color_legend?: string | null;
  created_at?: string;
};

export type CourseStructure = CourseRecord & {
  modules: (ModuleRecord & {
    lessons: LessonRecord[]
  })[]
};

export type LessonOutlineRecord = {
  id: string;
  module_id: string;
  title: string;
  position: number | null;
};

export type ModuleOutlineRecord = {
  id: string;
  course_id: string;
  title: string;
  position: number | null;
  lessons: LessonOutlineRecord[];
};

export type CourseOutline = CourseRecord & {
  modules: ModuleOutlineRecord[];
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
  video_urls?: { url: string; title: string; image_url?: string; type?: 'video' | 'slides'; slides?: string[]; fileUrl?: string; fileType?: 'pdf' | 'pptx' }[] | null;
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
  category?: string;
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
  is_temp_password?: boolean;
  is_minor?: boolean;
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
  module_count: number;
  lesson_count: number;
  file_count: number;
  storage_size_bytes: number;
};

export type XpLogRecord = {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  description: string | null;
  created_at: string;
};
