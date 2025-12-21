
import { ValidationError } from './errors';

export interface ILessonData {
  id: string;
  title: string;
  videoUrl: string;
  durationSeconds: number;
  watchedSeconds: number;
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  dateEarned: Date;
  icon: string;
}

export class UserProgress {
  constructor(
    public readonly userId: string,
    public readonly lessonId: string,
    public readonly watchedSeconds: number,
    public readonly isCompleted: boolean
  ) {}
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
    if (watched < 0) throw new ValidationError("O tempo assistido não pode ser negativo.");
    this._watchedSeconds = Math.min(watched, this._durationSeconds);
    const progressPercentage = (this._watchedSeconds / this._durationSeconds) * 100;
    
    if (progressPercentage >= 90) {
      this._isCompleted = true;
    }
  }
}

export class User {
  private _xp: number;
  private _level: number;
  private _achievements: Achievement[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly role: 'STUDENT' | 'INSTRUCTOR',
    xp: number = 0,
    achievements: Achievement[] = []
  ) {
    this._xp = xp;
    this._achievements = achievements;
    this._level = Math.floor(xp / 1000) + 1;
  }

  get xp(): number { return this._xp; }
  get level(): number { return this._level; }
  get achievements(): Achievement[] { return [...this._achievements]; }

  public addXp(amount: number): void {
    if (amount < 0) throw new ValidationError("A quantidade de XP deve ser positiva.");
    this._xp += amount;
    this._level = Math.floor(this._xp / 1000) + 1;
  }

  /**
   * Verifica se o usuário atingiu critérios para novas conquistas.
   */
  public checkAndAddAchievements(type: 'LESSON' | 'LEVEL'): Achievement | null {
    let newlyUnlocked: Achievement | null = null;

    if (type === 'LESSON') {
      const hasFirstLesson = this._achievements.some(a => a.id === 'first-lesson');
      if (!hasFirstLesson) {
        newlyUnlocked = {
          id: 'first-lesson',
          title: 'Primeiro Passo',
          description: 'Você concluiu sua primeira aula no sistema!',
          dateEarned: new Date(),
          icon: 'fa-rocket'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'LEVEL') {
      const hasLevel5 = this._achievements.some(a => a.id === 'level-5');
      if (this._level >= 5 && !hasLevel5) {
        newlyUnlocked = {
          id: 'level-5',
          title: 'Mestre do Conhecimento',
          description: 'Respeito! Você atingiu o Nível 5.',
          dateEarned: new Date(),
          icon: 'fa-brain'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    return newlyUnlocked;
  }

  public clone(): User {
    return new User(
      this.id, 
      this.name, 
      this.email, 
      this.role, 
      this._xp, 
      [...this._achievements]
    );
  }
}

export class Module {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly lessons: Lesson[]
  ) {}

  public isFullyCompleted(): boolean {
    return this.lessons.length > 0 && this.lessons.every(l => l.isCompleted);
  }
}

export class Course {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly modules: Module[]
  ) {}
}
