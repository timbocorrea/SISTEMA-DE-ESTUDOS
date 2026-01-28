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
    // 1. Persist Progress (Core Responsibility)
    await this.courseRepository.updateLessonProgress(
      user.id,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted,
      lastBlockId
    );

    // If lesson didn't just become complete, no rewards to process.
    if (!becameCompleted) return [];

    // 2. Validate Ruls for Rewards (Quiz, etc)
    const canAward = await this.shouldAwardGamification(user, lesson);
    if (!canAward) return [];

    // 3. Process Rewards (Side Effects)
    return this.processGamificationRewards(user, lesson, course);
  }

  private async shouldAwardGamification(user: User, lesson: Lesson): Promise<boolean> {
    const quiz = await this.courseRepository.getQuizByLessonId(lesson.id);
    if (quiz) {
      const latestAttempt = await this.courseRepository.getLatestQuizAttempt(user.id, quiz.id);
      if (!latestAttempt || !latestAttempt.passed) {
        return false;
      }
      lesson.setQuizPassed(true);
    }
    return true;
  }

  private async processGamificationRewards(user: User, lesson: Lesson, course: Course): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];

    // Lesson XP (Local + RPC Update handled by repo/rpc implicitly)
    // We update local state just for immediate UI feedback before refresh
    user.addXp(150);

    const lessonAch = user.checkAndAddAchievements('LESSON');
    if (lessonAch) unlocked.push(lessonAch);

    const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
    if (parentModule && parentModule.isFullyCompleted()) {
      user.addXp(500);
      await this.courseRepository.addXp(user.id, 500, 'MODULE_COMPLETE', `Módulo Completo: ${parentModule.title}`);

      const moduleAch = user.checkAndAddAchievements('MODULE');
      if (moduleAch) unlocked.push(moduleAch);
    }

    if (course.isFullyCompleted()) {
      const courseAch = user.checkAndAddAchievements('COURSE');
      if (courseAch) unlocked.push(courseAch);
    }

    // Badge Checks
    const xpAch = this.checkXpMilestones(user);
    if (xpAch.length) unlocked.push(...xpAch);

    const levelAch = user.checkAndAddAchievements('LEVEL');
    if (levelAch) unlocked.push(levelAch);

    // Persist Achievements
    await this.courseRepository.saveAchievements(user.id, user.achievements);

    return unlocked;
  }

  private checkXpMilestones(user: User): Achievement[] {
    const unlocked: Achievement[] = [];
    let ach: Achievement | null;
    do {
      ach = user.checkAndAddAchievements('XP');
      if (ach) unlocked.push(ach);
    } while (ach);
    return unlocked;
  }

  public async fetchAvailableCourses(userId: string): Promise<Course[]> {
    // Legacy: Keeping for backward compatibility if needed, or switch to summary.
    // Ideally this should use getCoursesSummary but return type is Course[].
    // Phase 3 Plan says: "Optimize fetchAvailableCourses to return summary only" or we change usage.
    // Since we created getCoursesSummary in Repo, let's expose it as such.
    return this.courseRepository.getAllCourses(userId);
  }

  async getCoursesSummary(userId: string): Promise<{ id: string; title: string; description: string; imageUrl: string | null; modules: { id: string; lessons: { id: string }[] }[] }[]> {
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
