import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord, ProfileRecord } from '../domain/admin';

export interface IAdminRepository {
  listCourses(): Promise<CourseRecord[]>;
  createCourse(title: string, description?: string, imageUrl?: string): Promise<CourseRecord>;
  updateCourse(id: string, patch: { title?: string; description?: string | null; imageUrl?: string | null }): Promise<CourseRecord>;
  deleteCourse(id: string): Promise<void>;

  listModules(courseId: string): Promise<ModuleRecord[]>;
  createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord>;
  updateModule(id: string, patch: { title?: string; position?: number | null }): Promise<ModuleRecord>;
  deleteModule(id: string): Promise<void>;

  listLessons(moduleId: string): Promise<LessonRecord[]>;
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
  ): Promise<LessonRecord>;
  updateLesson(
    id: string,
    patch: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
      audioUrl?: string | null;
      imageUrl?: string | null;
      durationSeconds?: number | null;
      position?: number | null;
      contentBlocks?: any[] | null;
    }
  ): Promise<LessonRecord>;
  deleteLesson(id: string): Promise<void>;

  listLessonResources(lessonId: string): Promise<LessonResourceRecord[]>;
  createLessonResource(
    lessonId: string,
    payload: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; position?: number }
  ): Promise<LessonResourceRecord>;
  updateLessonResource(
    id: string,
    patch: { title?: string; resourceType?: LessonResourceRecord['resource_type']; url?: string; position?: number | null }
  ): Promise<LessonResourceRecord>;
  deleteLessonResource(id: string): Promise<void>;

  listProfiles(): Promise<ProfileRecord[]>;
  updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR'): Promise<void>;
  updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR'; geminiApiKey?: string | null }): Promise<void>;

  // User Approval System
  fetchPendingUsers(): Promise<ProfileRecord[]>;
  fetchApprovedUsers(): Promise<ProfileRecord[]>;
  fetchRejectedUsers(): Promise<ProfileRecord[]>;
  approveUser(userId: string, adminId: string): Promise<void>;
  rejectUser(userId: string, adminId: string, reason?: string): Promise<void>;
  assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void>;
  getUserCourseAssignments(userId: string): Promise<string[]>;
  removeUserCourseAssignment(userId: string, courseId: string): Promise<void>;
  removeAllUserCourseAssignments(userId: string): Promise<void>;
  deleteProfile(userId: string): Promise<void>;

  // System Stats
  getSystemStats(): Promise<any>;
}
