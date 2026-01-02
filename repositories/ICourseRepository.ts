import { Course, User, Achievement } from '../domain/entities';
import { Quiz, QuizAttempt } from '../domain/quiz-entities';

export interface ICourseRepository {
  getCourseById(id: string, userId?: string): Promise<Course>;
  getAllCourses(userId?: string): Promise<Course[]>;
  updateLessonProgress(
    userId: string,
    lessonId: string,
    watchedSeconds: number,
    isCompleted: boolean,
    lastBlockId?: string
  ): Promise<void>;
  updateUserGamification(
    userId: string,
    xp: number,
    level: number,
    achievements: Achievement[]
  ): Promise<void>;
  logXpChange(userId: string, amount: number, actionType: string, description: string): Promise<void>;
  getUserById(userId: string): Promise<User>;
  getAllCourses(userId?: string): Promise<Course[]>;
  getCoursesSummary(userId?: string): Promise<{ id: string; title: string; description: string; imageUrl: string | null; }[]>;
  getEnrolledCourses(userId: string): Promise<Course[]>;
  enrollInCourse(userId: string, courseId: string): Promise<void>;
  unenrollFromCourse(userId: string, courseId: string): Promise<void>;
  isEnrolled(userId: string, courseId: string): Promise<boolean>;

  // ============ QUIZ METHODS ============

  /**
   * Busca quiz associado a uma aula
   * @returns Quiz ou null se aula não tem quiz
   */
  getQuizByLessonId(lessonId: string): Promise<Quiz | null>;

  /**
   * Cria um novo quiz para uma aula
   */
  createQuiz(quiz: Quiz): Promise<Quiz>;

  /**
   * Atualiza quiz existente
   */
  updateQuiz(quiz: Quiz): Promise<Quiz>;

  /**
   * Deleta quiz (e cascateia perguntas/opções)
   */
  deleteQuiz(quizId: string): Promise<void>;

  /**
   * Alterna liberação manual do quiz (permite acesso independente do progresso)
   */
  toggleQuizRelease(quizId: string, released: boolean): Promise<void>;

  /**
   * Registra tentativa de quiz do usuário
   */
  submitQuizAttempt(userId: string, quizId: string, answers: Record<string, string>): Promise<QuizAttempt>;

  /**
   * Busca última tentativa do usuário em um quiz
   * @returns Última tentativa ou null se nunca tentou
   */
  getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | null>;

  /**
   * Busca todas as tentativas do usuário em um quiz
   */
  getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;

  // ===== LESSON PROGRESS REQUIREMENTS =====

  /**
   * Busca requisitos de progresso de uma aula
   * @returns Requisitos ou padrão (90% vídeo) se não configurado
   */
  getLessonRequirements(lessonId: string): Promise<import('../domain/lesson-requirements').LessonProgressRequirements>;

  /**
   * Salva requisitos de progresso configurados pelo instrutor
   */
  saveLessonRequirements(requirements: import('../domain/lesson-requirements').LessonProgressRequirements): Promise<void>;

  // ===== DETAILED PROGRESS TRACKING =====

  /**
   * Marca bloco de texto como lido
   */
  markTextBlockAsRead(userId: string, lessonId: string, blockId: string): Promise<void>;

  /**
   * Marca PDF como visualizado  
   */
  markPdfViewed(userId: string, lessonId: string, pdfId: string): Promise<void>;

  /**
   * Marca áudio como reproduzido
   */
  markAudioPlayed(userId: string, lessonId: string, audioId: string): Promise<void>;

  /**
   * Marca material como acessado
   */
  markMaterialAccessed(userId: string, lessonId: string, materialId: string): Promise<void>;

  // ===== ANALYTICS & GAMIFICATION =====

  /**
   * Busca histórico de XP dos últimos 7 dias
   * @returns Array com data e XP ganho por dia
   */
  getWeeklyXpHistory(userId: string): Promise<{ date: string; xp: number }[]>;

  /**
   * Busca resumo de progresso de todos os cursos inscritos
   * @returns Array com courseId, título e porcentagem de conclusão
   */
  getCourseProgressSummary(userId: string): Promise<{ courseId: string; title: string; progress: number }[]>;
}
