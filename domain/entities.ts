import { ValidationError } from './errors';

export interface ILessonData {
  id: string;
  title: string;
  videoUrl: string;
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  resources?: LessonResource[];
  durationSeconds: number;
  watchedSeconds: number;
  isCompleted: boolean;
  position: number;
}

export type LessonResourceType = 'PDF' | 'AUDIO' | 'IMAGE' | 'LINK' | 'FILE';

export interface LessonResource {
  id: string;
  title: string;
  type: LessonResourceType;
  url: string;
  position: number;
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
  ) { }
}

export class Lesson {
  private _id: string;
  private _title: string;
  private _videoUrl: string;
  private _content: string;
  private _audioUrl: string;
  private _imageUrl: string;
  private _resources: LessonResource[];
  private _durationSeconds: number;
  private _watchedSeconds: number;
  private _isCompleted: boolean;
  private _position: number;

  constructor(data: ILessonData) {
    this._id = data.id;
    this._title = data.title;
    this._videoUrl = data.videoUrl || '';
    this._content = data.content || '';
    this._audioUrl = data.audioUrl || '';
    this._imageUrl = data.imageUrl || '';
    this._resources = data.resources ? [...data.resources] : [];
    this._durationSeconds = data.durationSeconds;
    this._watchedSeconds = data.watchedSeconds || 0;
    this._isCompleted = data.isCompleted || false;
    this._position = data.position || 0;
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get videoUrl(): string { return this._videoUrl; }
  get content(): string { return this._content; }
  get audioUrl(): string { return this._audioUrl; }
  get imageUrl(): string { return this._imageUrl; }
  get resources(): LessonResource[] { return [...this._resources]; }
  get durationSeconds(): number { return this._durationSeconds; }
  get watchedSeconds(): number { return this._watchedSeconds; }
  get isCompleted(): boolean { return this._isCompleted; }
  get position(): number { return this._position; }

  public updateProgress(watched: number): boolean {
    if (watched < 0) throw new ValidationError('O tempo assistido não pode ser negativo.');

    const wasCompleted = this._isCompleted;

    if (this._durationSeconds <= 0) {
      this._watchedSeconds = Math.max(0, watched);
      if (this._watchedSeconds > 0) this._isCompleted = true;
      return !wasCompleted && this._isCompleted;
    }

    this._watchedSeconds = Math.min(watched, this._durationSeconds);
    const progressPercentage = (this._watchedSeconds / this._durationSeconds) * 100;

    if (progressPercentage >= 90) {
      this._isCompleted = true;
    }

    return !wasCompleted && this._isCompleted;
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
    if (amount < 0) throw new ValidationError('A quantidade de XP deve ser positiva.');
    this._xp += amount;
    this._level = Math.floor(this._xp / 1000) + 1;
  }

  public checkAndAddAchievements(type: 'LESSON' | 'MODULE' | 'COURSE' | 'XP' | 'LEVEL'): Achievement | null {
    let newlyUnlocked: Achievement | null = null;
    const hasAchievement = (id: string) => this._achievements.some(a => a.id === id);

    if (type === 'LESSON') {
      if (!hasAchievement('first-lesson')) {
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

    if (type === 'MODULE') {
      if (!hasAchievement('module-master')) {
        newlyUnlocked = {
          id: 'module-master',
          title: 'Mestre do Módulo',
          description: 'Você completou um módulo inteiro!',
          dateEarned: new Date(),
          icon: 'fa-crown'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'COURSE') {
      if (!hasAchievement('course-complete')) {
        newlyUnlocked = {
          id: 'course-complete',
          title: 'Conquistador do Curso',
          description: 'Você completou todas as aulas deste curso!',
          dateEarned: new Date(),
          icon: 'fa-trophy'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'XP') {
      if (this._xp >= 5000 && !hasAchievement('xp-5000')) {
        newlyUnlocked = {
          id: 'xp-5000',
          title: 'Veterano do Estudo',
          description: 'Você alcançou 5.000 XP acumulados!',
          dateEarned: new Date(),
          icon: 'fa-award'
        };
        this._achievements.push(newlyUnlocked);
      } else if (this._xp >= 1000 && !hasAchievement('xp-1000')) {
        newlyUnlocked = {
          id: 'xp-1000',
          title: 'Aprendiz Dedicado',
          description: 'Você alcançou 1.000 XP acumulados!',
          dateEarned: new Date(),
          icon: 'fa-bolt'
        };
        this._achievements.push(newlyUnlocked);
      }
    }

    if (type === 'LEVEL') {
      if (this._level >= 5 && !hasAchievement('level-5')) {
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
    return new User(this.id, this.name, this.email, this.role, this._xp, [...this._achievements]);
  }
}

export class Module {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly lessons: Lesson[]
  ) { }

  public isFullyCompleted(): boolean {
    return this.lessons.length > 0 && this.lessons.every(l => l.isCompleted);
  }
}

export class Course {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly imageUrl: string | null,
    public readonly modules: Module[]
  ) { }

  public isFullyCompleted(): boolean {
    return this.modules.length > 0 && this.modules.every(m => m.isFullyCompleted());
  }
}

/**
 * Representa uma inscrição de usuário em um curso
 */
export class CourseEnrollment {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly courseId: string,
    public readonly enrolledAt: Date,
    public readonly isActive: boolean = true
  ) { }
}
