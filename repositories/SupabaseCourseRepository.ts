import { SupabaseClient } from '@supabase/supabase-js';
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, LessonResource, LessonResourceType, UserProgress, User, Achievement } from '../domain/entities';
import { Quiz, QuizQuestion, QuizOption, QuizAttempt } from '../domain/quiz-entities';
import { NotFoundError, DomainError } from '../domain/errors';
import { createSupabaseClient } from '../services/supabaseClient';
import { DatabaseLessonResponse, DatabaseResourceResponse, DatabaseModuleResponse, DatabaseAchievementResponse } from '../types/supabase-dtos';

type LessonProgressRow = {
  lesson_id: string;
  watched_seconds: number;
  is_completed: boolean;
  last_accessed_block_id: string | null;
  video_progress?: number;
  text_blocks_read?: string[];
  pdfs_viewed?: string[];
  audios_played?: string[];
  materials_accessed?: string[];
};

export class SupabaseCourseRepository implements ICourseRepository {
  private client: SupabaseClient;

  /**
   * Construtor com Injeção de Dependência (DIP - Dependency Inversion Principle)
   * @param client Instância do SupabaseClient injetada externamente
   */
  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private async getProgressByUser(userId?: string): Promise<Map<string, LessonProgressRow>> {
    if (!userId) return new Map();

    const { data, error } = await this.client
      .from('lesson_progress')
      .select('lesson_id, watched_seconds, is_completed, last_accessed_block_id, video_progress, text_blocks_read, pdfs_viewed, audios_played, materials_accessed')
      .eq('user_id', userId);

    if (error) {
      throw new DomainError(`Falha ao buscar progresso: ${error.message}`);
    }

    const progressMap = new Map<string, LessonProgressRow>();
    (data || []).forEach(row => {
      progressMap.set(row.lesson_id, row);
    });
    return progressMap;
  }

  private mapLesson(row: DatabaseLessonResponse, progressMap: Map<string, LessonProgressRow>): Lesson {
    const progress = progressMap.get(row.id);
    const resources = this.mapResources((row as any).resources || (row as any).lesson_resources || []);
    const payload: ILessonData = {
      id: row.id,
      title: row.title,
      videoUrl: row.video_url || '',
      videoUrls: row.video_urls || [],
      content: row.content || '',
      audioUrl: row.audio_url || '',
      imageUrl: row.image_url || '',
      resources,
      durationSeconds: row.duration_seconds || 0,
      watchedSeconds: progress?.watched_seconds || 0,
      isCompleted: progress?.is_completed || false,
      position: row.position || 0,
      lastAccessedBlockId: progress?.last_accessed_block_id || null,
      contentBlocks: (row as any).content_blocks || []
    };
    return new Lesson(payload);
  }

  private mapResources(raw: DatabaseResourceResponse[] = []): LessonResource[] {
    return (raw || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type as LessonResourceType,
        url: r.url,
        position: r.position ?? 0
      }));
  }

  private mapModule(row: DatabaseModuleResponse, progressMap: Map<string, LessonProgressRow>): Module {
    const lessons = (row.lessons || [])
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((lesson) => this.mapLesson(lesson, progressMap));
    return new Module(row.id, row.title, lessons);
  }

  private mapAchievements(rawAchievements: DatabaseAchievementResponse[] = []): Achievement[] {
    return rawAchievements.map((ach) => ({
      id: ach.id,
      title: ach.title,
      description: ach.description,
      dateEarned: ach.earned_at
        ? new Date(ach.earned_at)
        : new Date(),
      icon: ach.icon
    }));
  }

  /**
   * Recupera o curso e reconstrói o domínio injetando progresso e hierarquia (courses -> modules -> lessons).
   */
  async getCourseById(id: string, userId?: string): Promise<Course> {
    try {
      const progressMap = await this.getProgressByUser(userId);

      const { data: courseData, error } = await this.client
        .from('courses')
        .select(`
          id,
          title,
          description,
          image_url,
          modules:modules (
            id,
            title,
            position,
            lessons:lessons (
              id,
              title,
              content,
              video_url,
              video_urls,
              audio_url,
              image_url,
              duration_seconds,
              position,
              content_blocks,
              resources:lesson_resources (
                id,
                title,
                resource_type,
                url,
                position
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error || !courseData) {
        throw new NotFoundError('Course', id);
      }

      const modules = (courseData.modules || [])
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
        .map((m: any) => this.mapModule(m, progressMap));

      return new Course(courseData.id, courseData.title, courseData.description, courseData.image_url || null, modules);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new DomainError(`Erro ao carregar curso: ${(err as Error).message}`);
    }
  }

  /**
   * Salva o progresso técnico da aula.
   */
  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean, lastBlockId?: string): Promise<void> {
    // Buscar duração da aula para calcular video_progress
    const { data: lessonData } = await this.client
      .from('lessons')
      .select('duration_seconds')
      .eq('id', lessonId)
      .single();

    const durationSeconds = lessonData?.duration_seconds || 0;
    const videoProgress = durationSeconds > 0
      ? Math.min(100, (watchedSeconds / durationSeconds) * 100)
      : (watchedSeconds > 0 ? 100 : 0);

    const { error } = await this.client
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          watched_seconds: watchedSeconds,
          is_completed: isCompleted,
          last_accessed_block_id: lastBlockId || null,
          video_progress: videoProgress,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,lesson_id' }
      );

    if (error) throw new DomainError(`Falha ao persistir progresso: ${error.message}`);
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const { data, error } = await this.client
      .from('lesson_progress')
      .select('lesson_id, watched_seconds, is_completed, last_accessed_block_id, video_progress, text_blocks_read, pdfs_viewed, audios_played, materials_accessed')
      .eq('user_id', userId);

    if (error) {
      throw new DomainError(`Erro ao buscar progresso do usuário: ${error.message}`);
    }

    return (data || []).map(row => new UserProgress(
      userId,
      row.lesson_id,
      row.watched_seconds,
      row.is_completed,
      row.last_accessed_block_id,
      row.video_progress || 0,
      row.text_blocks_read || [],
      row.pdfs_viewed || [],
      row.audios_played || [],
      row.materials_accessed || []
    ));
  }

  /**
   * Recupera o usuรกrio do Supabase e converte para Entidade de Domínio.
   */
  async getUserById(userId: string): Promise<User> {
    // 1. Fetch Profile
    const { data: profile, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, xp_total, current_level, gemini_api_key, approval_status, last_access_at, is_temp_password')
      .eq('id', userId)
      .single();

    if (error || !profile) throw new NotFoundError('User', userId);

    // 2. Fetch Achievements Separately
    const { data: achievementsData } = await this.client
      .from('user_achievements')
      .select('achievement_id, date_earned')
      .eq('user_id', userId);

    const achievements = (achievementsData || []).map((row: any) => ({
      id: row.achievement_id,
      title: "Conquista Desbloqueada",
      description: "Você desbloqueou uma nova conquista!",
      icon: "fas fa-trophy",
      dateEarned: new Date(row.date_earned)
    }));

    return new User(
      profile.id,
      profile.name || 'Estudante',
      profile.email || '',
      profile.role || 'STUDENT',
      profile.xp_total || 0,
      achievements,
      profile.gemini_api_key || null,
      profile.approval_status || 'approved',
      profile.last_access_at ? new Date(profile.last_access_at) : null,
      profile.is_temp_password || false
    );
  }

  async updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void> {
    const serializedAchievements = achievements.map(a => ({
      ...a,
      dateEarned: a.dateEarned instanceof Date ? a.dateEarned.toISOString() : a.dateEarned
    }));

    const { error } = await this.client
      .from('profiles')
      .update({
        xp_total: xp,
        current_level: level,
        achievements: serializedAchievements,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Erro ao atualizar gamificação: ${error.message}`);
  }

  async logXpChange(userId: string, amount: number, actionType: string, description: string): Promise<void> {
    const { error } = await this.client
      .from('xp_history')
      .insert({
        user_id: userId,
        amount: amount,
        action_type: actionType,
        description: description
      });

    if (error) {
      console.error('Failed to log XP change:', error);
      // We do not throw to avoid blocking the main flow
    }
  }

  /**
   * Retorna cursos atribuídos ao usuário (user_course_assignments)
   * Se o usuário for INSTRUCTOR, retorna todos os cursos
   */
  private async getUserAssignedCourseIds(userId: string): Promise<string[]> {
    // Verificar se é instrutor
    const { data: profileData } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    // Instrutores veem todos os cursos
    if (profileData?.role === 'INSTRUCTOR') {
      const { data: allCourses } = await this.client
        .from('courses')
        .select('id');
      return (allCourses || []).map(c => c.id);
    }

    // Estudantes veem apenas cursos atribuídos/ativos
    const { data: assignments } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    return (assignments || []).map(a => a.course_id);
  }

  async getCoursesSummary(userId?: string): Promise<{ id: string; title: string; description: string; imageUrl: string | null; modules: { id: string; lessons: { id: string }[] }[] }[]> {
    if (!userId) {
      const { data, error } = await this.client
        .from('courses')
        .select(`
          id, 
          title, 
          description, 
          image_url,
          modules:modules (
            id,
            lessons:lessons (id)
          )
        `);
      if (error) throw new DomainError('Falha ao buscar resumo dos cursos');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        modules: row.modules || []
      }));
    }

    // Com userId, retorna apenas cursos atribuídos (mesma lógica de permissão)
    const assignedIds = await this.getUserAssignedCourseIds(userId);
    if (assignedIds.length === 0) return [];

    const { data, error } = await this.client
      .from('courses')
      .select(`
        id, 
        title, 
        description, 
        image_url,
        modules:modules (
          id,
          lessons:lessons (id)
        )
      `)
      .in('id', assignedIds);

    if (error) throw new DomainError('Falha ao buscar resumo dos cursos');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      modules: row.modules || []
    }));
  }

  async getAllCourses(userId?: string): Promise<Course[]> {
    if (!userId) {
      // Sem userId, retorna todos (público)
      const { data, error } = await this.client.from('courses').select('id');
      if (error) throw new DomainError('Falha ao buscar cursos');
      const ids = (data || []).map((c: any) => c.id);
      const results = await Promise.allSettled(ids.map(id => this.getCourseById(id)));
      return results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value as Course);
    }
    // ... existing implementation
    const assignedIds = await this.getUserAssignedCourseIds(userId);
    if (assignedIds.length === 0) return [];

    const results = await Promise.allSettled(
      assignedIds.map(id => this.getCourseById(id, userId))
    );
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value as Course);
  }

  /**
   * Retorna apenas cursos nos quais o usuário está inscrito E que foram atribuídos
   */
  async getEnrolledCourses(userId: string): Promise<Course[]> {
    // Buscar IDs dos cursos atribuídos
    const assignedIds = await this.getUserAssignedCourseIds(userId);
    if (assignedIds.length === 0) return [];

    // Buscar IDs dos cursos inscritos
    const { data: enrollments, error: enrollError } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (enrollError) throw new DomainError(enrollError.message);

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const enrolledCourseIds = enrollments.map(e => e.course_id);

    // Intersecção: cursos que estão TANTO atribuídos QUANTO inscritos
    const validCourseIds = enrolledCourseIds.filter(id => assignedIds.includes(id));

    if (validCourseIds.length === 0) return [];

    // Buscar cursos completos usando getCourseById
    const results = await Promise.allSettled(
      validCourseIds.map(id => this.getCourseById(id, userId))
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value as Course);
  }

  /**
   * Inscreve um usuário em um curso (idempotente)
   */
  async enrollInCourse(userId: string, courseId: string): Promise<void> {
    const { error } = await this.client
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        is_active: true
      });

    if (error) {
      // Se erro de unique constraint (já existe), reativar
      if (error.code === '23505') {
        const { error: updateError } = await this.client
          .from('course_enrollments')
          .update({ is_active: true, enrolled_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('course_id', courseId);

        if (updateError) throw new DomainError(updateError.message);
      } else {
        throw new DomainError(error.message);
      }
    }
  }

  /**
   * Cancela inscrição (soft delete)
   */
  async unenrollFromCourse(userId: string, courseId: string): Promise<void> {
    const { error } = await this.client
      .from('course_enrollments')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) throw new DomainError(error.message);
  }

  /**
   * Verifica se usuário está inscrito
   */
  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new DomainError(error.message);
    return !!data;
  }

  // ============ QUIZ METHODS ============

  async getQuizByLessonId(lessonId: string): Promise<Quiz | null> {
    console.log('🔍 [REPOSITORY] getQuizByLessonId chamado com lessonId:', lessonId);

    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .select(`
        id,
        lesson_id,
        title,
        description,
        passing_score,
        is_manually_released,
        questions_count,
        pool_difficulty,
        quiz_questions (
          id,
          quiz_id,
          question_text,
          question_type,
          position,
          points,
          quiz_options (
            id,
            question_id,
            option_text,
            is_correct,
            position
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    console.log('🔍 [REPOSITORY] Supabase response - data:', quizData);
    console.log('🔍 [REPOSITORY] Supabase response - error:', quizError);

    if (quizError) throw new DomainError(`Erro ao buscar quiz: ${quizError.message}`);
    if (!quizData) {
      console.log('⚠️ [REPOSITORY] Nenhum quiz encontrado no banco para lesson_id:', lessonId);
      return null;
    }

    const questions = (quizData.quiz_questions || []).map((q: any) => {
      const options = (q.quiz_options || []).map((o: any) =>
        new QuizOption(o.id, o.question_id, o.option_text, o.is_correct, o.position)
      );
      return new QuizQuestion(q.id, q.quiz_id, q.question_text, q.question_type, q.position, q.points, options);
    });

    console.log('✅ [REPOSITORY] Quiz construído com sucesso:', {
      id: quizData.id,
      title: quizData.title,
      questionsCount: questions.length
    });

    return new Quiz(quizData.id, quizData.lesson_id, quizData.title, quizData.description, quizData.passing_score, questions, quizData.is_manually_released ?? false, quizData.questions_count, quizData.pool_difficulty);
  }

  async createQuiz(quiz: Quiz): Promise<Quiz> {
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .insert({
        lesson_id: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore,
        is_manually_released: quiz.isManuallyReleased,
        questions_count: quiz.questionsCount,
        pool_difficulty: quiz.poolDifficulty
      })
      .select()
      .single();

    if (quizError) throw new DomainError(`Erro ao criar quiz: ${quizError.message}`);

    for (const question of quiz.questions) {
      const { data: questionData, error: questionError } = await this.client
        .from('quiz_questions')
        .insert({
          quiz_id: quizData.id,
          question_text: question.questionText,
          question_type: question.questionType,
          position: question.position,
          points: question.points
        })
        .select()
        .single();

      if (questionError) throw new DomainError(`Erro ao criar pergunta: ${questionError.message}`);

      const options = question.options.map(o => ({
        question_id: questionData.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
      }));

      const { error: optionsError } = await this.client
        .from('quiz_options')
        .insert(options);

      if (optionsError) throw new DomainError(`Erro ao criar opções: ${optionsError.message}`);
    }

    const createdQuiz = await this.getQuizByLessonId(quiz.lessonId);
    if (!createdQuiz) throw new DomainError('Quiz criado mas não foi possível recuperá-lo');
    return createdQuiz;
  }

  async updateQuiz(quiz: Quiz): Promise<Quiz> {
    console.log('🔄 [REPOSITORY] Iniciando atualização do Quiz:', quiz.id);

    // 1. Atualizar cabeçalho do Quiz
    const { error: quizError } = await this.client
      .from('quizzes')
      .update({
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore,
        questions_count: quiz.questionsCount,
        pool_difficulty: quiz.poolDifficulty,
        is_manually_released: quiz.isManuallyReleased
      })
      .eq('id', quiz.id);

    if (quizError) throw new DomainError(`Erro ao atualizar quiz: ${quizError.message}`);
    console.log('✅ [REPOSITORY] Cabeçalho do Quiz atualizado.');

    // 2. Sincronizar Questões
    const { data: currentQuestions, error: qFetchError } = await this.client
      .from('quiz_questions')
      .select('id')
      .eq('quiz_id', quiz.id);

    if (qFetchError) throw new DomainError(`Erro ao sincronizar questões (fetch): ${qFetchError.message}`);

    const currentQIds = (currentQuestions || []).map(q => q.id);
    const incomingQIds = quiz.questions.map(q => q.id);

    console.log('📊 [REPOSITORY] Sync Questões:', {
      existentesNoBanco: currentQIds.length,
      recebidasDoFrontend: incomingQIds.length
    });

    // Questões a deletar - Deletar opções primeiro para evitar restrição de chave estrangeira
    const qIdsToDelete = currentQIds.filter(id => !incomingQIds.includes(id));
    if (qIdsToDelete.length > 0) {
      console.log('🗑️ [REPOSITORY] Deletando questões removidas:', qIdsToDelete);

      // Deletar todas as opções das questões que serão removidas
      const { error: oDelError } = await this.client
        .from('quiz_options')
        .delete()
        .in('question_id', qIdsToDelete);

      if (oDelError) throw new DomainError(`Erro ao limpar opções das questões removidas: ${oDelError.message}`);

      // Agora deletar as questões
      const { error: delError } = await this.client
        .from('quiz_questions')
        .delete()
        .in('id', qIdsToDelete);

      if (delError) throw new DomainError(`Erro ao deletar questões removidas: ${delError.message}`);
      console.log('✅ [REPOSITORY] Questões removidas deletadas com sucesso.');
    }

    // Upsert das questões atuais/novas
    for (const question of quiz.questions) {
      console.log('📝 [REPOSITORY] Processando questão:', question.id);

      const { error: qUpsertError } = await this.client
        .from('quiz_questions')
        .upsert({
          id: question.id,
          quiz_id: quiz.id,
          question_text: question.questionText,
          question_type: question.questionType,
          position: question.position,
          points: question.points
        });

      if (qUpsertError) throw new DomainError(`Erro ao salvar questão ${question.id}: ${qUpsertError.message}`);

      // Sincronizar Opções para esta questão
      const { data: currentOptions, error: oFetchError } = await this.client
        .from('quiz_options')
        .select('id')
        .eq('question_id', question.id);

      if (oFetchError) throw new DomainError(`Erro ao sincronizar opções da questão ${question.id}: ${oFetchError.message}`);

      const currentOIds = (currentOptions || []).map(o => o.id);
      const incomingOIds = question.options.map(o => o.id);

      // Opções a deletar
      const oIdsToDelete = currentOIds.filter(id => !incomingOIds.includes(id));
      if (oIdsToDelete.length > 0) {
        console.log(`  🗑️ Deletando ${oIdsToDelete.length} opções da questão ${question.id}`);
        const { error: oDelError } = await this.client
          .from('quiz_options')
          .delete()
          .in('id', oIdsToDelete);
        if (oDelError) throw new DomainError(`Erro ao deletar opções removidas da questão ${question.id}: ${oDelError.message}`);
      }

      // Upsert das opções atuais/novas
      const optionsToUpsert = question.options.map(o => ({
        id: o.id,
        question_id: question.id,
        option_text: o.optionText,
        is_correct: o.isCorrect,
        position: o.position
      }));

      const { error: oUpsertError } = await this.client
        .from('quiz_options')
        .upsert(optionsToUpsert);

      if (oUpsertError) throw new DomainError(`Erro ao salvar opções da questão ${question.id}: ${oUpsertError.message}`);
    }

    console.log('🎉 [REPOSITORY] Sincronização de Quiz concluída!');

    const updated = await this.getQuizByLessonId(quiz.lessonId);
    if (!updated) throw new NotFoundError('Quiz', quiz.id);
    return updated;
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await this.client
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw new DomainError(`Erro ao deletar quiz: ${error.message} `);
  }

  async toggleQuizRelease(quizId: string, released: boolean): Promise<void> {
    const { error } = await this.client
      .from('quizzes')
      .update({ is_manually_released: released })
      .eq('id', quizId);

    if (error) throw new DomainError(`Erro ao atualizar liberação do quiz: ${error.message}`);
  }

  async submitQuizAttempt(userId: string, quizId: string, answers: Record<string, string>): Promise<QuizAttempt> {
    const { data, error } = await this.client
      .rpc('submit_quiz_attempt', {
        p_quiz_id: quizId,
        p_answers: answers
      });

    if (error) throw new DomainError(`Erro ao registrar tentativa: ${error.message} `);

    // Map the returned JSON to QuizAttempt entity
    return new QuizAttempt(
      data.id,
      data.user_id,
      data.quiz_id,
      data.score,
      data.passed,
      data.answers,
      data.attempt_number,
      new Date(data.completed_at)
    );
  }

  async getLatestQuizAttempt(userId: string, quizId: string): Promise<QuizAttempt | null> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar tentativa: ${error.message} `);
    if (!data) return null;

    return new QuizAttempt(
      data.id,
      data.user_id,
      data.quiz_id,
      data.score,
      data.passed,
      data.answers,
      data.attempt_number,
      new Date(data.completed_at)
    );
  }

  async getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar tentativas: ${error.message} `);

    const attempts: QuizAttempt[] = (data || []).map(row =>
      new QuizAttempt(
        row.id,
        row.user_id,
        row.quiz_id,
        row.score,
        row.passed,
        row.answers,
        row.attempt_number,
        new Date(row.completed_at)
      )
    );

    return attempts;
  }

  // ===== QUIZ REPORTING =====

  async createQuizReport(report: import('../domain/quiz-entities').QuizReport): Promise<void> {
    const { error } = await this.client
      .from('quiz_reports')
      .insert({
        quiz_id: report.quizId,
        question_id: report.questionId,
        user_id: report.userId,
        issue_type: report.issueType,
        comment: report.comment,
        status: report.status || 'pending'
      });

    if (error) throw new DomainError(`Erro ao criar reporte de erro: ${error.message} `);
  }

  async getQuizReports(quizId: string): Promise<import('../domain/quiz-entities').QuizReport[]> {
    const { data, error } = await this.client
      .from('quiz_reports')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar reportes: ${error.message} `);

    return (data || []).map(row => ({
      id: row.id,
      quizId: row.quiz_id,
      questionId: row.question_id,
      userId: row.user_id,
      issueType: row.issue_type,
      comment: row.comment,
      status: row.status,
      createdAt: new Date(row.created_at)
    }));
  }

  // ===== LESSON PROGRESS REQUIREMENTS =====

  async getLessonRequirements(lessonId: string): Promise<import('../domain/lesson-requirements').LessonProgressRequirements> {
    const { LessonProgressRequirements } = await import('../domain/lesson-requirements');

    const { data, error } = await this.client
      .from('lesson_progress_requirements')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar requisitos: ${error.message} `);

    // Se não configurado, retorna padrão (90% vídeo)
    if (!data) {
      return new LessonProgressRequirements(lessonId, 90, 0, [], [], []);
    }

    return new LessonProgressRequirements(
      data.lesson_id,
      data.video_required_percent,
      data.text_blocks_required_percent,
      data.required_pdfs || [],
      data.required_audios || [],
      data.required_materials || []
    );
  }

  async saveLessonRequirements(requirements: import('../domain/lesson-requirements').LessonProgressRequirements): Promise<void> {
    const { error } = await this.client
      .from('lesson_progress_requirements')
      .upsert({
        lesson_id: requirements.lessonId,
        video_required_percent: requirements.videoRequiredPercent,
        text_blocks_required_percent: requirements.textBlocksRequiredPercent,
        required_pdfs: requirements.requiredPdfs,
        required_audios: requirements.requiredAudios,
        required_materials: requirements.requiredMaterials
      });

    if (error) throw new DomainError(`Erro ao salvar requisitos: ${error.message} `);
  }

  // ===== DETAILED PROGRESS TRACKING =====

  async markTextBlockAsRead(userId: string, lessonId: string, blockId: string): Promise<void> {
    // Buscar progresso atual
    const { data: progress } = await this.client
      .from('lesson_progress')
      .select('text_blocks_read')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const blocksRead: string[] = progress?.text_blocks_read || [];

    // Adicionar se ainda não estiver na lista
    if (!blocksRead.includes(blockId)) {
      blocksRead.push(blockId);

      const { error } = await this.client
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          text_blocks_read: blocksRead,
          last_updated: new Date().toISOString()
        });

      if (error) throw new DomainError(`Erro ao marcar bloco como lido: ${error.message} `);
    }
  }

  async markPdfViewed(userId: string, lessonId: string, pdfId: string): Promise<void> {
    const { data: progress } = await this.client
      .from('lesson_progress')
      .select('pdfs_viewed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const pdfsViewed: string[] = progress?.pdfs_viewed || [];

    if (!pdfsViewed.includes(pdfId)) {
      pdfsViewed.push(pdfId);

      const { error } = await this.client
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          pdfs_viewed: pdfsViewed,
          last_updated: new Date().toISOString()
        });

      if (error) throw new DomainError(`Erro ao marcar PDF como visualizado: ${error.message} `);
    }
  }

  async markAudioPlayed(userId: string, lessonId: string, audioId: string): Promise<void> {
    const { data: progress } = await this.client
      .from('lesson_progress')
      .select('audios_played')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const audiosPlayed: string[] = progress?.audios_played || [];

    if (!audiosPlayed.includes(audioId)) {
      audiosPlayed.push(audioId);

      const { error } = await this.client
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          audios_played: audiosPlayed,
          last_updated: new Date().toISOString()
        });

      if (error) throw new DomainError(`Erro ao marcar áudio como reproduzido: ${error.message} `);
    }
  }

  async markMaterialAccessed(userId: string, lessonId: string, materialId: string): Promise<void> {
    const { data: progress } = await this.client
      .from('lesson_progress')
      .select('materials_accessed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const materialsAccessed: string[] = progress?.materials_accessed || [];

    if (!materialsAccessed.includes(materialId)) {
      materialsAccessed.push(materialId);

      const { error } = await this.client
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          materials_accessed: materialsAccessed,
          last_updated: new Date().toISOString()
        });

      if (error) throw new DomainError(`Erro ao marcar material como acessado: ${error.message} `);
    }
  }

  // ===== ANALYTICS & GAMIFICATION =====

  async getWeeklyXpHistory(userId: string): Promise<{ date: string; xp: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await this.client
      .from('xp_history')
      .select('created_at, amount')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw new DomainError(`Erro ao buscar histórico de XP: ${error.message} `);

    //Group by date
    const groupedByDate = (data || []).reduce((acc, record) => {
      const date = new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and fill missing days with 0
    const result: { date: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      result.push({ date: dateStr, xp: groupedByDate[dateStr] || 0 });
    }

    return result;
  }

  async getCourseProgressSummary(userId: string): Promise<{ courseId: string; title: string; progress: number }[]> {
    // Get enrolled courses
    const enrolledCourses = await this.getEnrolledCourses(userId);

    const summary: { courseId: string; title: string; progress: number }[] = [];

    for (const course of enrolledCourses) {
      const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
      const completedLessons = course.modules.reduce(
        (sum, module) => sum + module.lessons.filter(lesson => lesson.isCompleted).length,
        0
      );

      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      summary.push({
        courseId: course.id,
        title: course.title,
        progress
      });
    }

    return summary;
  }
}
