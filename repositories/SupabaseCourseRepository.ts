
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, UserProgress } from '../domain/entities';
import { NotFoundError } from '../domain/errors';

export class SupabaseCourseRepository implements ICourseRepository {
  private _mockProgress: Map<string, UserProgress> = new Map();

  async getCourseById(id: string): Promise<Course> {
    if (id !== 'course-1') throw new NotFoundError('Course', id);

    const lessonsData: ILessonData[] = [
      { id: 'lesson-1', title: 'Introdução à POO', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', durationSeconds: 60, watchedSeconds: 0, isCompleted: false },
      { id: 'lesson-2', title: 'Encapsulamento e Modificadores', videoUrl: 'https://www.w3schools.com/html/movie.mp4', durationSeconds: 45, watchedSeconds: 0, isCompleted: false },
      { id: 'lesson-3', title: 'Herança e Polimorfismo', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', durationSeconds: 120, watchedSeconds: 0, isCompleted: false },
    ];

    // Merge with persisted progress
    const lessons = lessonsData.map(l => {
      const progress = this._mockProgress.get(l.id);
      return new Lesson({
        ...l,
        watchedSeconds: progress?.watchedSeconds ?? l.watchedSeconds,
        isCompleted: progress?.isCompleted ?? l.isCompleted
      });
    });

    const modules = [
      new Module('mod-1', 'Módulo 1: Fundamentos de ADS', lessons.slice(0, 2)),
      new Module('mod-2', 'Módulo 2: Arquitetura de Software', lessons.slice(2, 3)),
    ];

    return new Course('course-1', 'Engenharia de Software Moderna', 'Estudo de caso POO/ADS.', modules);
  }

  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void> {
    const progress = new UserProgress(userId, lessonId, watchedSeconds, isCompleted);
    this._mockProgress.set(lessonId, progress);
    console.log(`[Supabase Progress] Updated ${lessonId} for ${userId}`);
  }

  async getAllCourses(): Promise<Course[]> {
    const course = await this.getCourseById('course-1');
    return [course];
  }

  async getUserProgress(userId: string, courseId: string): Promise<UserProgress[]> {
    return Array.from(this._mockProgress.values()).filter(p => p.userId === userId);
  }
}
