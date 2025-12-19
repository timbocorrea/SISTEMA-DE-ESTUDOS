
import { Course, UserProgress, User, Achievement } from '../domain/entities';

export interface ICourseRepository {
  getCourseById(id: string): Promise<Course>;
  updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void>;
  getAllCourses(): Promise<Course[]>;
  getUserProgress(userId: string, courseId: string): Promise<UserProgress[]>;
  
  // Métodos de Identidade e Gamificação
  getUserById(userId: string): Promise<User>;
  updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void>;
}
