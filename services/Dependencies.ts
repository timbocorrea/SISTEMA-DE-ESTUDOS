import { createSupabaseClient } from './supabaseClient';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { SupabaseQuestionBankRepository } from '../repositories/SupabaseQuestionBankRepository';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';
import { AdminService } from './AdminService';

import { NotificationRepository } from '../repositories/NotificationRepository';
import { LessonForumRepository } from '../repositories/LessonForumRepository';

const supabaseClient = createSupabaseClient();

export const courseRepository = new SupabaseCourseRepository(supabaseClient);
export const questionBankRepository = new SupabaseQuestionBankRepository(supabaseClient);
export const adminRepository = new SupabaseAdminRepository(supabaseClient);
export const adminService = new AdminService(adminRepository);
export const notificationRepository = new NotificationRepository();
export const lessonForumRepository = new LessonForumRepository();

export { supabaseClient };
