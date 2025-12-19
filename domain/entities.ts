
import { ValidationError } from './errors';

export interface ILessonData {
  id: string;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  watchedSeconds: number;
  isCompleted: boolean;
}

export class Lesson {
  private _id: string;
  private _title: string;
  private _videoUrl: string;
  private _durationSeconds: number;
  private _watchedSeconds: number;
  private _isCompleted: boolean;

  constructor(data: ILessonData) {
    this._id = data.id;
    this._title = data.title;
    this._videoUrl = data.videoUrl;
    this._durationSeconds = data.durationSeconds;
    this._watchedSeconds = data.watchedSeconds || 0;
    this._isCompleted = data.isCompleted || false;
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get videoUrl(): string { return this._videoUrl; }
  get durationSeconds(): number { return this._durationSeconds; }
  get watchedSeconds(): number { return this._watchedSeconds; }
  get isCompleted(): boolean { return this._isCompleted; }

  public updateProgress(watched: number): void {
    if (watched < 0) throw new ValidationError("Watched time cannot be negative.");
    this._watchedSeconds = Math.min(watched, this._durationSeconds);
    const progressPercentage = (this._watchedSeconds / this._durationSeconds) * 100;
    if (progressPercentage >= 90) {
      this._isCompleted = true;
    }
  }

  public toJSON(): ILessonData {
    return {
      id: this._id,
      title: this._title,
      videoUrl: this._videoUrl,
      durationSeconds: this._durationSeconds,
      watchedSeconds: this._watchedSeconds,
      isCompleted: this._isCompleted
    };
  }
}

export class UserProgress {
  constructor(
    public readonly userId: string,
    public readonly lessonId: string,
    public readonly watchedSeconds: number,
    public readonly isCompleted: boolean,
    public readonly updatedAt: Date = new Date()
  ) {}
}

export class Module {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly lessons: Lesson[]
  ) {}

  public getProgress(): number {
    const total = this.lessons.length;
    if (total === 0) return 0;
    const completed = this.lessons.filter(l => l.isCompleted).length;
    return Math.round((completed / total) * 100);
  }
}

export class Course {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly modules: Module[]
  ) {}

  public getTotalLessons(): number {
    return this.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  }

  public getCompletedLessons(): number {
    return this.modules.reduce((acc, mod) => 
      acc + mod.lessons.filter(l => l.isCompleted).length, 0);
  }

  public getProgressPercentage(): number {
    const total = this.getTotalLessons();
    if (total === 0) return 0;
    return Math.round((this.getCompletedLessons() / total) * 100);
  }
}

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly role: 'STUDENT' | 'INSTRUCTOR'
  ) {}
}
