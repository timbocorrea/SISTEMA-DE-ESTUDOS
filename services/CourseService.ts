
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, User, Module, Achievement } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  /**
   * Atualiza progresso e verifica conquistas de aula e nível.
   */
  public async updateUserProgress(user: User, lesson: Lesson, course: Course): Promise<Achievement | null> {
    const wasCompletedBefore = lesson.isCompleted;
    let unlocked: Achievement | null = null;
    
    // 1. Persistência técnica
    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 2. Lógica de Gamificação
    if (lesson.isCompleted && !wasCompletedBefore) {
      user.addXp(150);
      
      // Verifica conquistas de aula
      unlocked = user.checkAndAddAchievements('LESSON');

      // Verifica bônus de módulo (sem conquista atrelada por agora, apenas XP)
      const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (parentModule && parentModule.isFullyCompleted()) {
        user.addXp(500);
      }

      // Verifica conquistas de nível (ex: Level 5)
      const levelAch = user.checkAndAddAchievements('LEVEL');
      if (!unlocked) unlocked = levelAch;

      // 3. Sincroniza com repositório
      await this.courseRepository.updateUserGamification(
        user.id,
        user.xp,
        user.level,
        user.achievements
      );
    }

    return unlocked;
  }

  public async fetchAvailableCourses(): Promise<Course[]> {
    return this.courseRepository.getAllCourses();
  }
}
