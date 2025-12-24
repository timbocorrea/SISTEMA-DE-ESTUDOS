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

    user.addXp(150);

    const lessonAch = user.checkAndAddAchievements('LESSON');
    if (lessonAch) unlocked.push(lessonAch);

    const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
    if (parentModule && parentModule.isFullyCompleted()) {
      user.addXp(500);
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

  public async fetchAvailableCourses(userId?: string): Promise<Course[]> {
    return this.courseRepository.getAllCourses(userId);
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
