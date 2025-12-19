
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, UserProgress, User, Achievement } from '../domain/entities';
import { NotFoundError } from '../domain/errors';

export class SupabaseCourseRepository implements ICourseRepository {
  private _mockProgress: Map<string, UserProgress> = new Map();
  private _mockUsers: Map<string, User> = new Map();

  async getCourseById(id: string): Promise<Course> {
    if (id !== 'course-1') throw new NotFoundError('Course', id);

    // Mock de dados para o estudo de caso
    const lessonsData: ILessonData[] = [
      { id: 'lesson-1', title: 'Introdução à POO', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', durationSeconds: 60, watchedSeconds: 0, isCompleted: false },
      { id: 'lesson-2', title: 'Encapsulamento e Modificadores', videoUrl: 'https://www.w3schools.com/html/movie.mp4', durationSeconds: 45, watchedSeconds: 0, isCompleted: false },
    ];

    const lessons = lessonsData.map(l => {
      const progress = this._mockProgress.get(l.id);
      return new Lesson({
        ...l,
        watchedSeconds: progress?.watchedSeconds ?? l.watchedSeconds,
        isCompleted: progress?.isCompleted ?? l.isCompleted
      });
    });

    const modules = [
      new Module('mod-1', 'Módulo 1: Fundamentos de ADS', lessons),
    ];

    return new Course('course-1', 'Engenharia de Software Moderna', 'Estudo de caso POO/ADS.', modules);
  }

  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void> {
    const progress = new UserProgress(userId, lessonId, watchedSeconds, isCompleted);
    this._mockProgress.set(lessonId, progress);
    console.log(`[Mock DB] Progresso atualizado: Aula ${lessonId}, Status: ${isCompleted ? 'Concluída' : 'Em andamento'}`);
  }

  async getAllCourses(): Promise<Course[]> {
    const course = await this.getCourseById('course-1');
    return [course];
  }

  async getUserProgress(userId: string, courseId: string): Promise<UserProgress[]> {
    return Array.from(this._mockProgress.values()).filter(p => p.userId === userId);
  }

  async getUserById(userId: string): Promise<User> {
    let user = this._mockUsers.get(userId);
    if (!user) {
      user = new User(userId, 'Estudante ADS', 'aluno@estudo.br', 'STUDENT');
      this._mockUsers.set(userId, user);
    }
    return user;
  }

  async updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void> {
    console.log(`[Mock DB] Persistindo Gamificação: User ${userId} | XP: ${xp} | Level: ${level} | Achievements: ${achievements.length}`);
    // No Supabase real: await supabase.from('users').update({ xp, level, achievements }).eq('id', userId);
  }
}
