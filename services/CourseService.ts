
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, Achievement } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  public async updateUserProgress(userId: string, lesson: Lesson): Promise<void> {
    // 1. Obter estado atual do domínio
    const course = await this.courseRepository.getCourseById('course-1'); // Mock ID
    const user = await this.courseRepository.getUserById(userId);
    
    // 2. Verificar idempotência (XP só é dado na primeira conclusão)
    const previousProgress = await this.courseRepository.getUserProgress(userId, course.id);
    const wasCompleted = previousProgress.find(p => p.lessonId === lesson.id)?.isCompleted || false;

    // 3. Persistir o progresso técnico
    await this.courseRepository.updateLessonProgress(
      userId,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 4. Lógica de Gamificação (Triggered apenas na conclusão)
    if (!wasCompleted && lesson.isCompleted) {
      // Regra 1: Concluir aula = 100 XP
      user.addXp(100);

      // Regra 2: Concluir módulo = 500 XP Bônus
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
        user.unlockAchievement({
          id: `ach-mod-${module.id}`,
          title: 'Explorador de Módulo',
          description: `Concluiu todas as aulas de: ${module.title}`,
          dateEarned: new Date()
        });
      }

      // Regra 3: Concluir curso = 1000 XP Bônus
      if (course.isFullyCompleted()) {
        user.addXp(1000);
        user.unlockAchievement({
          id: `ach-course-${course.id}`,
          title: 'Arquiteto de Software ADS',
          description: `Concluiu o curso completo: ${course.title}`,
          dateEarned: new Date()
        });
      }

      // 5. Persistir o estado atualizado do domínio do usuário
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
