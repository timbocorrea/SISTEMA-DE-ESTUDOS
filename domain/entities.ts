
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
    
    // Regra de Eng. de Software: Aula considerada concluída com 90% de visualização
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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  dateEarned: Date;
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
    level: number = 1,
    achievements: Achievement[] = []
  ) {
    this._xp = xp;
    this._level = level;
    this._achievements = achievements;
  }

  get xp(): number { return this._xp; }
  get level(): number { return this._level; }
  get achievements(): Achievement[] { return [...this._achievements]; }

  public addXp(amount: number): void {
    if (amount < 0) throw new ValidationError("O valor de XP não pode ser negativo.");
    
    this._xp += amount;
    
    // Lógica de Level Up: Cada nível requer 1000 * nível_atual
    // Ex: Nível 1 -> 2 requer 1000 XP acumulado. Nível 2 -> 3 requer 2000 XP adicionais? 
    // Interpretando como threshold: Nível 2 atingido em 1000, Nível 3 em 3000 (1000 + 2000)...
    while (this._xp >= this.calculateXpForNextLevel()) {
      this._level++;
      console.log(`[Gamification] ${this.name} subiu para o nível ${this._level}!`);
    }
  }

  private calculateXpForNextLevel(): number {
    // Progressão aritmética de níveis: 1000, 2000, 3000...
    // O total necessário para passar do nível L é 1000 * L
    return this._level * 1000;
  }

  public unlockAchievement(achievement: Achievement): boolean {
    const alreadyHas = this._achievements.some(a => a.id === achievement.id);
    if (!alreadyHas) {
      this._achievements.push(achievement);
      return true;
    }
    return false;
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

  public isFullyCompleted(): boolean {
    return this.modules.length > 0 && this.modules.every(m => m.isFullyCompleted());
  }
}
