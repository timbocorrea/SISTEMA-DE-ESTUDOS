
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
  icon?: string;
}

// Fixed: Added missing UserProgress entity used by repositories
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
    
    // Regra de Negócio: Aula concluída com 90%
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
    this._level = 1;
    this.recalculateLevel();
  }

  get xp(): number { return this._xp; }
  get level(): number { return this._level; }
  get achievements(): Achievement[] { return [...this._achievements]; }

  /**
   * Adiciona XP e recalcula o nível baseado na progressão aritmética.
   * Regra: Lvl 2 = 1000 total, Lvl 3 = 3000 total, Lvl 4 = 6000 total.
   */
  public addXp(amount: number): void {
    if (amount < 0) throw new ValidationError("A quantidade de XP deve ser positiva.");
    this._xp += amount;
    this.recalculateLevel();
  }

  private recalculateLevel(): void {
    // Threshold para nível n = 1000 * (n * (n-1) / 2)
    while (this._xp >= this.getXpThresholdForLevel(this._level + 1)) {
      this._level++;
    }
  }

  public getXpThresholdForLevel(level: number): number {
    if (level <= 1) return 0;
    const n = level - 1;
    return 1000 * (n * (n + 1) / 2);
  }

  public unlockAchievement(achievement: Achievement): boolean {
    const alreadyUnlocked = this._achievements.some(a => a.id === achievement.id);
    if (!alreadyUnlocked) {
      this._achievements.push(achievement);
      return true;
    }
    return false;
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

  public isFullyCompleted(): boolean {
    return this.modules.length > 0 && this.modules.every(m => m.isFullyCompleted());
  }
}
