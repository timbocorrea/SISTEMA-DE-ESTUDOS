import { SupabaseClient } from '@supabase/supabase-js';
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, LessonResource, LessonResourceType, UserProgress, User, Achievement } from '../domain/entities';
import { NotFoundError, DomainError } from '../domain/errors';
import { createSupabaseClient } from '../services/supabaseClient';

type LessonProgressRow = {
  lesson_id: string;
  watched_seconds: number;
  is_completed: boolean;
};

export class SupabaseCourseRepository implements ICourseRepository {
  private client: SupabaseClient;

  constructor() {
    this.client = createSupabaseClient();
  }

  private async getProgressByUser(userId?: string): Promise<Map<string, LessonProgressRow>> {
    if (!userId) return new Map();

    const { data, error } = await this.client
      .from('lesson_progress')
      .select('lesson_id, watched_seconds, is_completed')
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

  private mapLesson(row: any, progressMap: Map<string, LessonProgressRow>): Lesson {
    const progress = progressMap.get(row.id);
    const resources = this.mapResources(row.resources || row.lesson_resources || []);
    const payload: ILessonData = {
      id: row.id,
      title: row.title,
      videoUrl: row.video_url || '',
      content: row.content || '',
      audioUrl: row.audio_url || '',
      imageUrl: row.image_url || '',
      resources,
      durationSeconds: row.duration_seconds || 0,
      watchedSeconds: progress?.watched_seconds || 0,
      isCompleted: progress?.is_completed || false,
      position: row.position || 0
    };
    return new Lesson(payload);
  }

  private mapResources(raw: any[] = []): LessonResource[] {
    return (raw || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((r: any) => ({
        id: r.id,
        title: r.title,
        type: (r.resource_type || r.type) as LessonResourceType,
        url: r.url,
        position: r.position ?? 0
      }));
  }

  private mapModule(row: any, progressMap: Map<string, LessonProgressRow>): Module {
    const lessons = (row.lessons || [])
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((lesson: any) => this.mapLesson(lesson, progressMap));
    return new Module(row.id, row.title, lessons);
  }

  private mapAchievements(rawAchievements: any[] = []): Achievement[] {
    return rawAchievements.map((ach: any) => ({
      id: ach.id,
      title: ach.title,
      description: ach.description,
      dateEarned: ach.dateEarned
        ? new Date(ach.dateEarned)
        : ach.date_earned
          ? new Date(ach.date_earned)
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
              audio_url,
              image_url,
              duration_seconds,
              position,
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
  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void> {
    const { error } = await this.client
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          watched_seconds: watchedSeconds,
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,lesson_id' }
      );

    if (error) throw new DomainError(`Falha ao persistir progresso: ${error.message}`);
  }

  async getAllCourses(userId?: string): Promise<Course[]> {
    const { data, error } = await this.client.from('courses').select('id');
    if (error) throw new DomainError('Falha ao buscar cursos');

    const ids = (data || []).map((c: any) => c.id);
    const results = await Promise.allSettled(ids.map(id => this.getCourseById(id, userId)));
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value as Course);
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const { data, error } = await this.client
      .from('lesson_progress')
      .select('user_id, lesson_id, watched_seconds, is_completed')
      .eq('user_id', userId);

    if (error) {
      throw new DomainError(`Falha ao buscar progresso: ${error.message}`);
    }

    return (data || []).map(
      (p: any) =>
        new UserProgress(p.user_id, p.lesson_id, p.watched_seconds || 0, p.is_completed || false)
    );
  }

  /**
   * Recupera o usuário do Supabase e converte para Entidade de Domínio.
   */
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, xp_total, current_level, achievements')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundError('User', userId);

    return new User(
      data.id,
      data.name || data.email,
      data.email,
      data.role || 'STUDENT',
      data.xp_total || 0,
      this.mapAchievements(data.achievements || [])
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

  /**
   * Retorna apenas cursos nos quais o usuário está inscrito
   */
  async getEnrolledCourses(userId: string): Promise<Course[]> {
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

    // Buscar cursos completos usando getCourseById
    const results = await Promise.allSettled(
      enrolledCourseIds.map(id => this.getCourseById(id, userId))
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
}

