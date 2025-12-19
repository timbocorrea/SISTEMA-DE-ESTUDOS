
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, User } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  /**
   * Atualiza progresso e retorna o objeto User atualizado para refletir no estado local
   */
  public async updateUserProgress(user: User, lesson: Lesson): Promise<User> {
    // 1. Carregar curso para verificar bônus de módulo
    const course = await this.courseRepository.getCourseById('course-1'); // Mock ID
    
    // 2. Verificar se a aula foi concluída agora
    // No estado local, a instância da lesson já vem com o novo watchedSeconds
    const wasCompletedBefore = lesson.watchedSeconds < (lesson.durationSeconds * 0.9);
    const isNowCompleted = lesson.isCompleted;

    // 3. Persistir no repositório (Mock ou Supabase)
    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 4. Lógica de Gamificação
    if (isNowCompleted && wasCompletedBefore) {
      // Bônus de Aula
      user.addXp(150);

      // Bônus de Módulo
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
      }

      // 5. Persistir gamificação
      await this.courseRepository.updateUserGamification(
        user.id,
        user.xp,
        user.level,
        user.achievements
      );
    }

    return user;
  }

  public async fetchAvailableCourses(): Promise<Course[]> {
    return this.courseRepository.getAllCourses();
  }
}
