
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson, Achievement } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  public async updateUserProgress(userId: string, lesson: Lesson): Promise<void> {
    // 1. Obter estado atual do curso e do usuário para validação
    const course = await this.courseRepository.getCourseById('course-1'); // Mock ID
    const user = await this.courseRepository.getUserById(userId);
    
    // 2. Verificar se a aula já foi concluída anteriormente (prevenção de bônus duplicado)
    const previousProgress = await this.courseRepository.getUserProgress(userId, course.id);
    const wasCompleted = previousProgress.find(p => p.lessonId === lesson.id)?.isCompleted || false;

    // 3. Atualizar progresso técnico no repositório
    await this.courseRepository.updateLessonProgress(
      userId,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );

    // 4. Lógica de Gamificação (Apenas se concluir a aula pela primeira vez)
    if (!wasCompleted && lesson.isCompleted) {
      // Bônus padrão por aula: 100 XP
      user.addXp(100);

      // 5. Verificar se o módulo foi concluído (Bônus 500 XP)
      const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
      if (module && module.isFullyCompleted()) {
        user.addXp(500);
        user.unlockAchievement({
          id: `mod-complete-${module.id}`,
          title: 'Mestre do Módulo',
          description: `Você concluiu todas as lições do módulo: ${module.title}`,
          dateEarned: new Date()
        });
      }

      // 6. Verificar conclusão do curso (Bônus opcional: 1000 XP)
      if (course.isFullyCompleted()) {
        user.addXp(1000);
        user.unlockAchievement({
          id: `course-complete-${course.id}`,
          title: 'Arquiteto de Software ADS',
          description: `Concluiu o curso completo: ${course.title}`,
          dateEarned: new Date()
        });
      }

      // 7. Persistir estado de gamificação atualizado
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
