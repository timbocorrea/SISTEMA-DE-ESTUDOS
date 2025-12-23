import { Course, UserProgress, User, Achievement } from '../domain/entities';

export interface ICourseRepository {
  getCourseById(id: string, userId?: string): Promise<Course>;
  updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void>;
  getAllCourses(userId?: string): Promise<Course[]>;
  getUserProgress(userId: string): Promise<UserProgress[]>;

  // Métodos de Identidade e Gamificação
  getUserById(userId: string): Promise<User>;
  updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void>;

  // Métodos de Enrollment (Inscrição em Cursos)
  /**
   * Retorna apenas cursos nos quais o usuário está inscrito
   */
  getEnrolledCourses(userId: string): Promise<Course[]>;

  /**
   * Inscreve um usuário em um curso
   */
  enrollInCourse(userId: string, courseId: string): Promise<void>;

  /**
   * Cancela inscrição de um usuário em um curso (soft delete)
   */
  unenrollFromCourse(userId: string, courseId: string): Promise<void>;

  /**
   * Verifica se usuário está inscrito em um curso
   */
  isEnrolled(userId: string, courseId: string): Promise<boolean>;
}
