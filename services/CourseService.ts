
import { ICourseRepository } from '../repositories/ICourseRepository';
import { Course, Lesson } from '../domain/entities';

export class CourseService {
  constructor(private courseRepository: ICourseRepository) {}

  public async loadCourseDetails(id: string): Promise<Course> {
    return this.courseRepository.getCourseById(id);
  }

  public async syncProgress(lesson: Lesson): Promise<void> {
    // In a real scenario, we would get the userId from a shared context or session
    // For this simulation, we'll assume the repository handles the active user session internally
  }

  public async updateUserProgress(userId: string, lesson: Lesson): Promise<void> {
    await this.courseRepository.updateLessonProgress(
      userId,
      lesson.id,
      lesson.watchedSeconds,
      lesson.isCompleted
    );
  }

  public async fetchAvailableCourses(): Promise<Course[]> {
    return this.courseRepository.getAllCourses();
  }
}
