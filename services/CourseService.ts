
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, Achievement } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  public async updateUserProgress(userId: string, lesson: Lesson): Promise<void> {
    // 1. Recuperar estado atual do curso e do usuário
    const course = await this.courseRepository.getCourseById('course-1'); // Mock ID para o exemplo
    const user = await this.courseRepository.getUserById(userId);
    
    // 2. Verificar se a aula já estava concluída antes (prevenção de duplicidade de XP)
    const previousProgress = await this.courseRepository.getUserProgress(userId, course.id);
    const wasCompleted = previousProgress.find(p => p.lessonId === lesson.id)?.isCompleted || false;

    // 3. Persistir o progresso técnico
    await this.courseRepository.updateLessonProgress(
      userId,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 4. Lógica de Gamificação (Apenas se a aula mudou para concluída agora)
    if (!wasCompleted && lesson.isCompleted) {
      console.log(`[Gamification] Lesson "${lesson.title}" completed by ${user.name}`);
      
      // Conclusão de Aula: 100 XP
      user.addXp(100);

      // Achievement: Primeira Aula
      if (user.achievements.length === 0) {
        user.unlockAchievement({
          id: 'ach-first-step',
          title: 'Primeiro Passo',
          description: 'Concluiu sua primeira aula no StudySystem.',
          dateEarned: new Date()
        });
      }

      // 5. Verificar Módulo (Bonus 500 XP)
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
        user.unlockAchievement({
          id: `ach-mod-${module.id}`,
          title: 'Mestre do Módulo',
          description: `Concluiu todas as aulas do módulo: ${module.title}`,
          dateEarned: new Date()
        });
      }

      // 6. Verificar Curso (Bonus 1500 XP)
      if (course.isFullyCompleted()) {
        user.addXp(1500);
        user.unlockAchievement({
          id: `ach-course-${course.id}`,
          title: 'Graduado ADS',
          description: `Concluiu o curso completo: ${course.title}`,
          dateEarned: new Date()
        });
      }

      // 7. Persistir estado de gamificação
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
