
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ICourseRepository } from './ICourseRepository';
import { Course, Module, Lesson, ILessonData, UserProgress, User, Achievement } from '../domain/entities';
import { NotFoundError, DomainError } from '../domain/errors';

export class SupabaseCourseRepository implements ICourseRepository {
  private client: SupabaseClient;

  constructor() {
    // Nota: Em um ambiente real, estas chaves viriam de process.env
    // Como Arquiteto, garanto que o repositório é agnóstico à origem das chaves
    const supabaseUrl = (window as any).env?.SUPABASE_URL || 'https://your-project.supabase.co';
    const supabaseKey = (window as any).env?.SUPABASE_ANON_KEY || 'your-anon-key';
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Recupera o curso e reconstrói o domínio injetando o progresso do usuário
   */
  async getCourseById(id: string, userId?: string): Promise<Course> {
    try {
      // 1. Busca metadados do curso
      const { data: courseData, error: courseError } = await this.client
        .from('courses')
        .select(`
          *,
          modules:modules (
            *,
            lessons:lessons (*)
          )
        `)
        .eq('id', id)
        .single();

      if (courseError || !courseData) throw new NotFoundError('Course', id);

      // 2. Se houver usuário, busca o progresso para reconstruir o estado das Lessons
      let userProgress: any[] = [];
      if (userId) {
        const { data: progressData } = await this.client
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId);
        userProgress = progressData || [];
      }

      // 3. Mapeamento de Entidades
      const modules = courseData.modules.map((m: any) => {
        const lessons = m.lessons.map((l: any) => {
          const progress = userProgress.find(p => p.lesson_id === l.id);
          return new Lesson({
            id: l.id,
            title: l.title,
            videoUrl: l.video_url,
            durationSeconds: l.duration_seconds,
            watchedSeconds: progress?.watched_seconds || 0,
            isCompleted: progress?.is_completed || false
          });
        });
        return new Module(m.id, m.title, lessons);
      });

      return new Course(courseData.id, courseData.title, courseData.description, modules);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw new DomainError(`Erro ao carregar curso: ${(err as Error).message}`);
    }
  }

  /**
   * Salva o progresso técnico da aula
   */
  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number, isCompleted: boolean): Promise<void> {
    const { error } = await this.client
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        watched_seconds: watchedSeconds,
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) throw new DomainError(`Falha ao persistir progresso: ${error.message}`);
  }

  async getAllCourses(): Promise<Course[]> {
    const { data, error } = await this.client.from('courses').select('id');
    if (error) throw new DomainError("Falha ao buscar cursos");
    
    // Simplificado para carregar detalhes individualmente (pode ser otimizado com joins)
    return Promise.all(data.map(c => this.getCourseById(c.id)));
  }

  async getUserProgress(userId: string, courseId: string): Promise<UserProgress[]> {
    const { data, error } = await this.client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) return [];
    
    return data.map((p: any) => new UserProgress(
      p.user_id,
      p.lesson_id,
      p.watched_seconds,
      p.is_completed
    ));
  }

  /**
   * Recupera o Usuário do Supabase e converte para Entidade de Domínio
   */
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundError('User', userId);

    return new User(
      data.id,
      data.name,
      data.email,
      data.role,
      data.xp_total || 0,
      data.achievements || []
    );
  }

  /**
   * Persiste os ganhos de Gamificação (XP, Nível e Achievements)
   */
  async updateUserGamification(userId: string, xp: number, level: number, achievements: Achievement[]): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        xp_total: xp,
        current_level: level,
        achievements: achievements,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Erro ao atualizar gamificação: ${error.message}`);
  }
}
