import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord, ProfileRecord } from '../domain/admin';
import { IAdminRepository } from '../repositories/IAdminRepository';

export class AdminService {
  constructor(private adminRepository: IAdminRepository) { }

  listCourses(): Promise<CourseRecord[]> {
    return this.adminRepository.listCourses();
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
      audioUrl?: string | null;
      imageUrl?: string | null;
      durationSeconds?: number | null;
      position?: number | null;
      contentBlocks?: any[] | null;
    }
  ): Promise<LessonRecord> {
    return this.adminRepository.updateLesson(id, patch);
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

  updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR'; geminiApiKey?: string | null }): Promise<void> {
    return this.adminRepository.updateProfile(id, patch);
  }
}
