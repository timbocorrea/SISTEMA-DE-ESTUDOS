import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord, ProfileRecord } from '../domain/admin';
import { Course, Module, Lesson } from '../domain/entities';
import { IAdminRepository } from '../repositories/IAdminRepository';

export class AdminService {
  constructor(private adminRepository: IAdminRepository) { }

  listCourses(): Promise<CourseRecord[]> {
    return this.adminRepository.listCourses();
  }

  async listCoursesFull(): Promise<Course[]> {
    const rawCourses = await this.adminRepository.listCoursesWithContent();

    return rawCourses.map(rc => {
      const modules = rc.modules.map(rm => {
        const lessons = rm.lessons.map(rl => {
          return new Lesson({
            id: rl.id,
            title: rl.title,
            videoUrl: rl.video_url || '',
            videoUrls: rl.video_urls || [],
            content: rl.content || '',
            audioUrl: rl.audio_url || '',
            imageUrl: rl.image_url || '',
            durationSeconds: rl.duration_seconds || 0,
            watchedSeconds: 0,
            isCompleted: false,
            position: rl.position || 0,
            contentBlocks: rl.content_blocks || []
          });
        });

        return new Module(rm.id, rm.title, lessons);
      });

      return new Course(rc.id, rc.title, rc.description || '', rc.image_url || '', modules);
    });
  }

  async listCoursesOutline(): Promise<Course[]> {
    const rawCourses = await this.adminRepository.listCoursesOutline();

    return rawCourses.map(rc => {
      const modules = (rc.modules || []).map(rm => {
        const lessons = (rm.lessons || []).map(rl => {
          return new Lesson({
            id: rl.id,
            title: rl.title,
            videoUrl: '',
            videoUrls: [],
            content: '',
            audioUrl: '',
            imageUrl: '',
            durationSeconds: 0,
            watchedSeconds: 0,
            isCompleted: false,
            position: rl.position || 0,
            contentBlocks: []
          });
        });

        return new Module(rm.id, rm.title, lessons);
      });

      return new Course(rc.id, rc.title, rc.description || '', rc.image_url || '', modules);
    });
  }

  createCourse(title: string, description?: string, imageUrl?: string): Promise<CourseRecord> {
    return this.adminRepository.createCourse(title, description, imageUrl);
  }

  updateCourse(id: string, patch: { title?: string; description?: string | null; imageUrl?: string | null }): Promise<CourseRecord> {
    return this.adminRepository.updateCourse(id, patch);
  }

  deleteCourse(id: string): Promise<void> {
    return this.adminRepository.deleteCourse(id);
  }

  listModules(courseId: string): Promise<ModuleRecord[]> {
    return this.adminRepository.listModules(courseId);
  }

  createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord> {
    return this.adminRepository.createModule(courseId, title, position);
  }

  updateModule(id: string, patch: { title?: string; position?: number | null }): Promise<ModuleRecord> {
    return this.adminRepository.updateModule(id, patch);
  }

  deleteModule(id: string): Promise<void> {
    return this.adminRepository.deleteModule(id);
  }

  listLessons(moduleId: string): Promise<LessonRecord[]> {
    return this.adminRepository.listLessons(moduleId);
  }

  createLesson(
    moduleId: string,
    payload: {
      title: string;
      content?: string;
      videoUrl?: string;
      audioUrl?: string;
      imageUrl?: string;
      durationSeconds?: number;
      position?: number;
    }
  ): Promise<LessonRecord> {
    return this.adminRepository.createLesson(moduleId, payload);
  }

  updateLesson(
    id: string,
    patch: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
      videoUrls?: { url: string; title: string }[] | null;
      audioUrl?: string | null;
      imageUrl?: string | null;
      durationSeconds?: number | null;
      position?: number | null;
      contentBlocks?: any[] | null;
    }
  ): Promise<LessonRecord> {
    return this.adminRepository.updateLesson(id, patch);
  }

  getLesson(id: string): Promise<LessonRecord> {
    return this.adminRepository.getLesson(id);
  }

  deleteLesson(id: string): Promise<void> {
    return this.adminRepository.deleteLesson(id);
  }

  listLessonResources(lessonId: string): Promise<LessonResourceRecord[]> {
    return this.adminRepository.listLessonResources(lessonId);
  }

  createLessonResource(
    lessonId: string,
    payload: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; position?: number }
  ): Promise<LessonResourceRecord> {
    return this.adminRepository.createLessonResource(lessonId, payload);
  }

  updateLessonResource(
    id: string,
    patch: { title?: string; resourceType?: LessonResourceRecord['resource_type']; url?: string; position?: number | null }
  ): Promise<LessonResourceRecord> {
    return this.adminRepository.updateLessonResource(id, patch);
  }

  deleteLessonResource(id: string): Promise<void> {
    return this.adminRepository.deleteLessonResource(id);
  }

  listProfiles(): Promise<ProfileRecord[]> {
    return this.adminRepository.listProfiles();
  }

  updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR'): Promise<void> {
    return this.adminRepository.updateProfileRole(profileId, role);
  }

  updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR'; geminiApiKey?: string | null; isMinor?: boolean }): Promise<void> {
    return this.adminRepository.updateProfile(id, patch);
  }

  resetUserPassword(userId: string, newPassword: string): Promise<void> {
    return this.adminRepository.resetUserPassword(userId, newPassword);
  }

  // ========================================
  // USER APPROVAL SYSTEM
  // ========================================

  fetchPendingUsers(): Promise<ProfileRecord[]> {
    return this.adminRepository.fetchPendingUsers();
  }

  fetchApprovedUsers(): Promise<ProfileRecord[]> {
    return this.adminRepository.fetchApprovedUsers();
  }

  fetchRejectedUsers(): Promise<ProfileRecord[]> {
    return this.adminRepository.fetchRejectedUsers();
  }

  approveUser(userId: string, adminId: string): Promise<void> {
    return this.adminRepository.approveUser(userId, adminId);
  }

  rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    return this.adminRepository.rejectUser(userId, adminId, reason);
  }

  assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void> {
    return this.adminRepository.assignCoursesToUser(userId, courseIds, adminId);
  }

  getUserCourseAssignments(userId: string): Promise<string[]> {
    return this.adminRepository.getUserCourseAssignments(userId);
  }

  removeUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    return this.adminRepository.removeUserCourseAssignment(userId, courseId);
  }

  deleteProfile(userId: string): Promise<void> {
    return this.adminRepository.deleteProfile(userId);
  }

  getSystemStats(): Promise<any> {
    return this.adminRepository.getSystemStats();
  }

  getXpHistory(userId: string): Promise<import('../domain/admin').XpLogRecord[]> {
    return this.adminRepository.getXpHistory(userId);
  }

  // Generic Activity Logging (uses XP history with 0 XP)
  logActivity(userId: string, actionType: string, description: string): Promise<void> {
    // We treat generic logs as XP logs with amount 0.
    // Ideally we would have a separate table, but per user request "historico de atividades" is "xp_history" currently.
    // We use the Repository directly via a cast or if IAdminRepository supports it.
    // Since IAdminRepository doesn't have a generic "log" method, checking if I can use existing mechanisms.
    // Actually, I should probably add this to IAdminRepository or just use the Supabase client directly if needed,
    // but better to keep it clean.
    // Let's assume we can reuse logXpChange from CourseRepository context if we had it, but here we are in AdminService.
    // Since SupabaseAdminRepository is available, let's look at `xp_history` table access there.
    // Wait, AdminService uses IAdminRepository. I should add `logActivity` to IAdminRepository first.
    return this.adminRepository.logActivity(userId, actionType, description);
  }

  // ============ SYSTEM SETTINGS ============
  getSystemSettings(): Promise<{ key: string; value: string; description: string }[]> {
    return this.adminRepository.getSystemSettings();
  }

  updateSystemSetting(key: string, value: string): Promise<void> {
    return this.adminRepository.updateSystemSetting(key, value);
  }

  // ============ COURSE ACCESS CONTROL ============
  getCourseUserAssignments(courseId: string): Promise<string[]> {
    return this.adminRepository.getCourseUserAssignments(courseId);
  }

  assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void> {
    return this.adminRepository.assignUsersToCourse(courseId, userIds, adminId);
  }
}
