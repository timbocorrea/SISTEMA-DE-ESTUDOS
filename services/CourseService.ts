
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, Achievement } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  public async updateUserProgress(userId: string, lesson: Lesson): Promise<void> {
    // 1. Obter estado atual para validação de regras de negócio
    const course = await this.courseRepository.getCourseById('course-1'); // Mock ID
    const user = await this.courseRepository.getUserById(userId);
    
    // 2. Verificar se a aula já foi concluída anteriormente (Idempotência)
    const previousProgress = await this.courseRepository.getUserProgress(userId, course.id);
    const wasCompleted = previousProgress.find(p => p.lessonId === lesson.id)?.isCompleted || false;

    // 3. Persistir o progresso técnico no repositório
    await this.courseRepository.updateLessonProgress(
      userId,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 4. Lógica de Gamificação (Se a aula acabou de ser concluída)
    if (!wasCompleted && lesson.isCompleted) {
      // Bônus base por aula: 100 XP
      user.addXp(100);

      // 5. Verificar se concluiu o módulo atual (Bônus 500 XP)
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
        user.unlockAchievement({
          id: `mod-complete-${module.id}`,
          title: 'Mestre de Módulo',
          description: `Concluiu todas as aulas do módulo ${module.title}`,
          dateEarned: new Date()
        });
      }

      // 6. Verificar se concluiu o curso completo (Bônus 1500 XP)
      if (course.isFullyCompleted()) {
        user.addXp(1500);
        user.unlockAchievement({
          id: `course-complete-${course.id}`,
          title: 'Graduado em ADS',
          description: `Concluiu o curso: ${course.title}`,
          dateEarned: new Date()
        });
      }

      // 7. Persistir o novo estado de gamificação do usuário
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
