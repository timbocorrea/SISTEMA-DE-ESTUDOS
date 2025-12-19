
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, User, Module } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  /**
   * Atualiza progresso e aplica regras de gamificação em memória
   */
  public async updateUserProgress(user: User, lesson: Lesson, course: Course): Promise<void> {
    const wasCompletedBefore = lesson.isCompleted;
    
    // 1. Atualiza progresso técnico via repositório (simulado)
    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 2. Lógica de Gamificação
    // Só concede bônus se a aula não estava concluída e agora está
    if (lesson.isCompleted && !wasCompletedBefore) {
      // Bônus de Aula: 150 XP
      user.addXp(150);

      // Bônus de Módulo: 500 XP se for a última aula do módulo
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
      }

      // Persiste gamificação (simulado)
      await this.courseRepository.updateUserGamification(
        user.id,
        user.xp,
        user.level,
        user.achievements
      );
    }
  }

  public async fetchAvailableCourses(): Promise<Course[]> {
    return this.courseRepository.getAllCourses();
  }
}
