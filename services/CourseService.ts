import { ICourseRepository } from '../repositories/ICourseRepository';
import { Achievement, Course, Lesson, User } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) { }

  public async loadCourseDetails(id: string, userId?: string): Promise<Course> {
    return this.courseRepository.getCourseById(id, userId);
  }

  public async updateUserProgress(
    user: User,
    lesson: Lesson,
    course: Course,
    becameCompleted: boolean,
    lastBlockId?: string
  ): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];

    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted,
      lastBlockId
    );

    if (!becameCompleted) return unlocked;

    // ============ QUIZ VALIDATION ============
    // Verificar se aula tem quiz
    const quiz = await this.courseRepository.getQuizByLessonId(lesson.id);

    if (quiz) {
      // Se tem quiz, verificar se usuário já passou
      const latestAttempt = await this.courseRepository.getLatestQuizAttempt(user.id, quiz.id);

      if (!latestAttempt || !latestAttempt.passed) {
        // Aula "completa" mas quiz não passou - NÃO ganha XP nem conquistas
        // Apenas atualiza progresso
        return unlocked;
      }

      // Marcar quiz como passado na entidade Lesson
      lesson.setQuizPassed(true);
    }

    // ============ GAMIFICATION (só executa se passou no quiz ou aula sem quiz) ============
    user.addXp(150);
    await this.courseRepository.logXpChange(user.id, 150, 'LESSON_COMPLETE', `Conclusão da Aula: ${lesson.title}`);

    const lessonAch = user.checkAndAddAchievements('LESSON');
    if (lessonAch) unlocked.push(lessonAch);

    const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
    if (parentModule && parentModule.isFullyCompleted()) {
      user.addXp(500);
      await this.courseRepository.logXpChange(user.id, 500, 'MODULE_COMPLETE', `Módulo Completo: ${parentModule.title}`);
      const moduleAch = user.checkAndAddAchievements('MODULE');
      if (moduleAch) unlocked.push(moduleAch);
    }

    if (course.isFullyCompleted()) {
      const courseAch = user.checkAndAddAchievements('COURSE');
      if (courseAch) unlocked.push(courseAch);
    }

    let xpAch: Achievement | null;
    do {
      xpAch = user.checkAndAddAchievements('XP');
      if (xpAch) unlocked.push(xpAch);
    } while (xpAch);

    const levelAch = user.checkAndAddAchievements('LEVEL');
    if (levelAch) unlocked.push(levelAch);

    await this.courseRepository.updateUserGamification(user.id, user.xp, user.level, user.achievements);

    return unlocked;
  }

  public async fetchAvailableCourses(userId: string): Promise<Course[]> {
    // Legacy: Keeping for backward compatibility if needed, or switch to summary.
    // Ideally this should use getCoursesSummary but return type is Course[].
    // Phase 3 Plan says: "Optimize fetchAvailableCourses to return summary only" or we change usage.
    // Since we created getCoursesSummary in Repo, let's expose it as such.
    return this.courseRepository.getAllCourses(userId);
  }

  async getCoursesSummary(userId: string): Promise<{ id: string; title: string; description: string; imageUrl: string | null; }[]> {
    return this.courseRepository.getCoursesSummary(userId);
  }

  async getCourseById(courseId: string, userId?: string): Promise<Course> {
    return this.courseRepository.getCourseById(courseId, userId);
  }

  public async fetchUserProfile(userId: string): Promise<User> {
    return this.courseRepository.getUserById(userId);
  }

  /**
   * Busca apenas cursos inscritos
   */
  public async fetchEnrolledCourses(userId: string): Promise<Course[]> {
    return this.courseRepository.getEnrolledCourses(userId);
  }

  /**
   * Inscreve usuário em um curso
   */
  public async enrollUserInCourse(userId: string, courseId: string): Promise<void> {
    await this.courseRepository.enrollInCourse(userId, courseId);
  }

  /**
   * Cancela inscrição
   */
  public async unenrollUser(userId: string, courseId: string): Promise<void> {
    await this.courseRepository.unenrollFromCourse(userId, courseId);
  }

  /**
   * Verifica inscrição
   */
  public async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    return this.courseRepository.isEnrolled(userId, courseId);
  }
}
