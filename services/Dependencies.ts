import { createSupabaseClient } from './supabaseClient';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { SupabaseQuestionBankRepository } from '../repositories/SupabaseQuestionBankRepository';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';
import { AdminService } from './AdminService';

const supabaseClient = createSupabaseClient();

export const courseRepository = new SupabaseCourseRepository(supabaseClient);
export const questionBankRepository = new SupabaseQuestionBankRepository(supabaseClient);
export const adminRepository = new SupabaseAdminRepository(supabaseClient);
export const adminService = new AdminService(adminRepository);

export { supabaseClient };
