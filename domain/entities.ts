import { ValidationError } from './errors';

export interface ILessonData {
  id: string;
  title: string;
  videoUrl: string;
  videoUrls?: { url: string; title: string; imageUrl?: string }[]; // Multiple video URLs
  content?: string;
  audioUrl?: string;
  imageUrl?: string;
  resources?: LessonResource[];
  durationSeconds: number;
  watchedSeconds: number;
  isCompleted: boolean;
  position: number;
  lastAccessedBlockId?: string | null;
  contentBlocks?: IContentBlock[];
  hasQuiz?: boolean; // NOVO: indica se aula tem quiz
  quizPassed?: boolean; // NOVO: indica se usuário passou no quiz
}

export interface IContentBlock {
  id: string;
  text: string;
  audioUrl?: string;
  spacing?: number;
  lineHeight?: string;
  featured?: boolean;
  featuredColor?: string;
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
    public readonly isCompleted: boolean,
    public readonly lastAccessedBlockId: string | null = null,
    // Campos de rastreamento detalhado
    public readonly videoProgress: number = 0,
    public readonly textBlocksRead: string[] = [],
    public readonly pdfsViewed: string[] = [],
    public readonly audiosPlayed: string[] = [],
    public readonly materialsAccessed: string[] = []
  ) { }

  /**
   * Calcula a porcentagem de progresso (Rich Domain Model)
   * @param durationSeconds Duração total da aula
   * @returns Porcentagem de 0 a 100
   */
  public calculateProgressPercentage(durationSeconds: number): number {
    if (durationSeconds <= 0) {
      return this.watchedSeconds > 0 ? 100 : 0;
    }
    return Math.round((this.watchedSeconds / durationSeconds) * 100);
  }

  /**
   * Verifica se uma ação já foi realizada
   */
  public hasReadTextBlock(blockId: string): boolean {
    return this.textBlocksRead.includes(blockId);
  }

  public hasViewedPdf(pdfId: string): boolean {
    return this.pdfsViewed.includes(pdfId);
  }

  public hasPlayedAudio(audioId: string): boolean {
    return this.audiosPlayed.includes(audioId);
  }

  public hasAccessedMaterial(materialId: string): boolean {
    return this.materialsAccessed.includes(materialId);
  }
}

export class Lesson {
  private _id: string;
  private _title: string;
  private _videoUrl: string;
  private _videoUrls: { url: string; title: string; imageUrl?: string }[];
  private _content: string;
  private _audioUrl: string;
  private _imageUrl: string;
  private _resources: LessonResource[];
  private _durationSeconds: number;
  private _watchedSeconds: number;
  private _isCompleted: boolean;
  private _position: number;
  private _lastAccessedBlockId: string | null;
  private _contentBlocks: IContentBlock[];

  // NOVO: Suporte a Quiz System
  private _hasQuiz: boolean;
  private _quizPassed: boolean;

  constructor(data: ILessonData) {
    this._id = data.id;
    this._title = data.title;
    this._videoUrl = data.videoUrl || '';
    this._videoUrls = data.videoUrls || [];
    this._content = data.content || '';
    this._audioUrl = data.audioUrl || '';
    this._imageUrl = data.imageUrl || '';
    this._resources = data.resources ? [...data.resources] : [];
    this._durationSeconds = data.durationSeconds;
    this._watchedSeconds = data.watchedSeconds || 0;
    this._isCompleted = data.isCompleted || false;
    this._position = data.position || 0;
    this._lastAccessedBlockId = data.lastAccessedBlockId || null;
    this._contentBlocks = data.contentBlocks ? [...data.contentBlocks] : [];
    this._hasQuiz = data.hasQuiz || false;
    this._quizPassed = data.quizPassed || false;
  }

  get id(): string { return this._id; }
  get title(): string { return this._title; }
  get videoUrl(): string { return this._videoUrl; }
  get videoUrls(): { url: string; title: string; imageUrl?: string }[] { return [...this._videoUrls]; }
  get content(): string { return this._content; }
  get audioUrl(): string { return this._audioUrl; }
  get imageUrl(): string { return this._imageUrl; }
  get resources(): LessonResource[] { return [...this._resources]; }
  get durationSeconds(): number { return this._durationSeconds; }
  get watchedSeconds(): number { return this._watchedSeconds; }
  get isCompleted(): boolean { return this._isCompleted; }
  get position(): number { return this._position; }
  get lastAccessedBlockId(): string | null { return this._lastAccessedBlockId; }
  get contentBlocks(): IContentBlock[] { return [...this._contentBlocks]; }
  get hasQuiz(): boolean { return this._hasQuiz; }
  get quizPassed(): boolean { return this._quizPassed; }

  // Setter para quiz passed (usado quando usuário passa no quiz)
  public setQuizPassed(passed: boolean): void {
    this._quizPassed = passed;
  }

  // Setter para hasQuiz (usado ao carregar dados)
  public setHasQuiz(has: boolean): void {
    this._hasQuiz = has;
  }

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

  /**
   * Calcula a porcentagem de progresso da aula (Rich Domain Model)
   * @returns Porcentagem de 0 a 100
   */
  public calculateProgressPercentage(): number {
    if (this._durationSeconds <= 0) {
      return this._watchedSeconds > 0 ? 100 : 0;
    }
    return Math.round((this._watchedSeconds / this._durationSeconds) * 100);
  }

  /**
   * Determina se a aula está REALMENTE concluída
   * Considera se há quiz e se o usuário passou nele (Rich Domain Model + Quiz System)
   * @returns true se aula está concluída E (não tem quiz OU passou no quiz)
   */
  public isTrulyCompleted(): boolean {
    if (!this._isCompleted) return false;
    if (this._hasQuiz && !this._quizPassed) return false;
    return true;
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
    achievements: Achievement[] = [],
    public readonly geminiApiKey: string | null = null,
    public readonly approvalStatus: 'pending' | 'approved' | 'rejected' = 'approved',
    public readonly lastAccess: Date | null = null,
    public readonly isTempPassword: boolean = false,
    public readonly approvedAt: Date | null = null,
    public readonly approvedBy: string | null = null,
    public readonly rejectionReason: string | null = null,
    public readonly isMinor: boolean = false
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

  /**
   * Calcula o XP dentro do nível atual (Rich Domain Model)
   * @returns XP de 0 a 999
   */
  public calculateXpInCurrentLevel(): number {
    return this._xp % 1000;
  }

  /**
   * Calcula o XP restante para o próximo nível (Rich Domain Model)
   * @returns XP necessário para subir de nível
   */
  public getRemainingXpForNextLevel(): number {
    return 1000 - this.calculateXpInCurrentLevel();
  }

  /**
   * Calcula a porcentagem de progresso no nível atual (Rich Domain Model)
   * @returns Porcentagem de 0 a 100
   */
  public calculateLevelProgress(): number {
    return Math.round((this.calculateXpInCurrentLevel() / 1000) * 100);
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

  public isPending(): boolean {
    return this.approvalStatus === 'pending';
  }

  public isApproved(): boolean {
    return this.approvalStatus === 'approved';
  }

  public isRejected(): boolean {
    return this.approvalStatus === 'rejected';
  }

  public clone(): User {
    return new User(
      this.id,
      this.name,
      this.email,
      this.role,
      this._xp,
      [...this._achievements],
      this.geminiApiKey,
      this.approvalStatus,
      this.lastAccess,
      this.isTempPassword,
      this.approvedAt,
      this.approvedBy,
      this.rejectionReason,
      this.isMinor
    );
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
