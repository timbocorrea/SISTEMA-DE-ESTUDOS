
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, User, Module } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  /**
   * Atualiza progresso e aplica regras de gamificação.
   * Injeta a regra de negócio de recompensa por conclusão.
   */
  public async updateUserProgress(user: User, lesson: Lesson, course: Course): Promise<void> {
    const wasCompletedBefore = lesson.isCompleted;
    
    // 1. Persistência técnica via repositório
    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 2. Lógica de Gamificação Orquestrada
    // Se a aula foi concluída neste ciclo de atualização
    if (lesson.isCompleted && !wasCompletedBefore) {
      // Regra de Negócio: Recompensa de 150 XP por aula concluída
      user.addXp(150);

      // Regra Adicional: Bônus de Módulo (500 XP se todas as aulas do módulo forem concluídas)
      const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (parentModule && parentModule.isFullyCompleted()) {
        user.addXp(500);
      }

      // 3. Sincroniza estado de gamificação no repositório
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
