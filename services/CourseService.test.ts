import { describe, expect, it, vi } from 'vitest';
import { CourseService } from './CourseService';
import { Course, Lesson, Module, User } from '../domain/entities';
import { ICourseRepository } from '../repositories/ICourseRepository';

const createRepo = (): ICourseRepository => ({
  getCourseById: vi.fn(),
  updateLessonProgress: vi.fn().mockResolvedValue(undefined),
  getAllCourses: vi.fn(),
  getUserProgress: vi.fn(),
  getUserById: vi.fn(),
  updateUserGamification: vi.fn().mockResolvedValue(undefined)
});

describe('CourseService.updateUserProgress', () => {
  it('only persists technical progress when not completed', async () => {
    const repo = createRepo();
    const service = new CourseService(repo);

    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    const lesson = new Lesson({
      id: 'l1',
      title: 'Aula 1',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 100,
      watchedSeconds: 10,
      isCompleted: false
    });
    const course = new Course('c1', 'Curso', 'Desc', [new Module('m1', 'Módulo', [lesson])]);

    const unlocked = await service.updateUserProgress(user, lesson, course, false);

    expect(unlocked).toEqual([]);
    expect(repo.updateLessonProgress).toHaveBeenCalledWith('u1', 'l1', 10, false);
    expect(repo.updateUserGamification).not.toHaveBeenCalled();
  });

  it('awards xp, unlocks achievements and persists gamification on completion', async () => {
    const repo = createRepo();
    const service = new CourseService(repo);

    const user = new User('u1', 'User', 'user@example.com', 'STUDENT', 0, []);
    const lesson = new Lesson({
      id: 'l1',
      title: 'Aula 1',
      videoUrl: 'https://example.com/video.mp4',
      durationSeconds: 100,
      watchedSeconds: 0,
      isCompleted: false
    });
    const module = new Module('m1', 'Módulo', [lesson]);
    const course = new Course('c1', 'Curso', 'Desc', [module]);

    const becameCompleted = lesson.updateProgress(90);
    expect(becameCompleted).toBe(true);

    const unlocked = await service.updateUserProgress(user, lesson, course, becameCompleted);

    expect(repo.updateLessonProgress).toHaveBeenCalledWith('u1', 'l1', 90, true);
    expect(repo.updateUserGamification).toHaveBeenCalledWith('u1', user.xp, user.level, user.achievements);

    expect(user.xp).toBe(650); // 150 (aula) + 500 (módulo completo)
    expect(unlocked.map(a => a.id)).toEqual(['first-lesson', 'module-master', 'course-complete']);
  });
});

