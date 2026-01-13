
import { SupabaseClient } from '@supabase/supabase-js';
import { DomainError } from '../domain/errors';
import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord, ProfileRecord } from '../domain/admin';
import { IAdminRepository } from './IAdminRepository';
import { createSupabaseClient } from '../services/supabaseClient';

export class SupabaseAdminRepository implements IAdminRepository {
  private client: SupabaseClient;

  constructor() {
    this.client = createSupabaseClient();
  }

  async listCourses(): Promise<CourseRecord[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('id,title,description,image_url,created_at')
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar cursos: ${error.message}`);
    return (data || []) as CourseRecord[];
  }

  async listCoursesWithContent(): Promise<import('../domain/admin').CourseStructure[]> {
    const { data, error } = await this.client
      .from('courses')
      .select(`
        *,
        modules (
          *,
          lessons (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar cursos completos: ${error.message}`);

    // Client-side sorting for nested arrays (Supabase direct nested ordering is limited)
    const courses = (data || []) as import('../domain/admin').CourseStructure[];

    courses.forEach(course => {
      // Sort modules by position
      if (course.modules) {
        course.modules.sort((a, b) => (a.position || 0) - (b.position || 0));

        // Sort lessons by position
        course.modules.forEach(module => {
          if (module.lessons) {
            module.lessons.sort((a, b) => (a.position || 0) - (b.position || 0));
          }
        });
      }
    });

    return courses;
  }

  async createCourse(title: string, description?: string, imageUrl?: string): Promise<CourseRecord> {
    const { data, error } = await this.client
      .from('courses')
      .insert({ title, description: description ?? null, image_url: imageUrl ?? null })
      .select('id,title,description,image_url,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar curso: ${error?.message || 'dados inválidos'}`);
    return data as CourseRecord;
  }

  async updateCourse(id: string, patch: { title?: string; description?: string | null; imageUrl?: string | null }): Promise<CourseRecord> {
    const updates: any = { ...patch };
    if (patch.imageUrl !== undefined) {
      updates.image_url = patch.imageUrl;
      delete updates.imageUrl;
    }

    const { data, error } = await this.client
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select('id,title,description,image_url,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar curso: ${error?.message || 'dados inválidos'}`);
    return data as CourseRecord;
  }

  async deleteCourse(id: string): Promise<void> {
    const { data, error } = await this.client.from('courses').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir curso: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum curso foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `courses_delete_instructors` (RLS) na tabela `courses`.'
      );
    }
  }

  async listModules(courseId: string): Promise<ModuleRecord[]> {
    const { data, error } = await this.client
      .from('modules')
      .select('id,course_id,title,position,created_at')
      .eq('course_id', courseId)
      .order('position', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar módulos: ${error.message}`);
    return (data || []) as ModuleRecord[];
  }

  async createModule(courseId: string, title: string, position?: number): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .insert({ course_id: courseId, title, position: position ?? 0 })
      .select('id,course_id,title,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar módulo: ${error?.message || 'dados inválidos'}`);
    return data as ModuleRecord;
  }

  async updateModule(id: string, patch: { title?: string; position?: number | null }): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .update({ ...patch })
      .eq('id', id)
      .select('id,course_id,title,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar módulo: ${error?.message || 'dados inválidos'}`);
    return data as ModuleRecord;
  }

  async getModule(id: string): Promise<ModuleRecord> {
    const { data, error } = await this.client
      .from('modules')
      .select('id,course_id,title,position,created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new DomainError(`Falha ao buscar módulo: ${error?.message || 'módulo não encontrado'}`);
    return data as ModuleRecord;
  }

  async deleteModule(id: string): Promise<void> {
    const { data, error } = await this.client.from('modules').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir módulo: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum módulo foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `modules_delete_instructors` (RLS) na tabela `modules`.'
      );
    }
  }

  async listLessons(moduleId: string): Promise<LessonRecord[]> {
    const { data, error } = await this.client
      .from('lessons')
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .eq('module_id', moduleId)
      .order('position', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar aulas: ${error.message}`);
    return (data || []) as LessonRecord[];
  }

  async createLesson(
    moduleId: string,
    payload: {
      title: string;
      content?: string;
      videoUrl?: string;
      audioUrl?: string;
      imageUrl?: string;
      durationSeconds?: number;
      position?: number;
    }
  ): Promise<LessonRecord> {
    const { data, error } = await this.client
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: payload.title,
        content: payload.content ?? null,
        video_url: payload.videoUrl ?? null,
        audio_url: payload.audioUrl ?? null,
        image_url: payload.imageUrl ?? null,
        duration_seconds: payload.durationSeconds ?? 0,
        position: payload.position ?? 0
      })
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar aula: ${error?.message || 'dados inválidos'}`);
    return data as LessonRecord;
  }

  async updateLesson(
    id: string,
    patch: {
      title?: string;
      content?: string | null;
      videoUrl?: string | null;
      videoUrls?: { url: string; title: string }[] | null;
      audioUrl?: string | null;
      imageUrl?: string | null;
      durationSeconds?: number | null;
      position?: number | null;
      contentBlocks?: any[] | null;
    }
  ): Promise<LessonRecord> {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.content !== undefined) updates.content = patch.content;
    if (patch.videoUrl !== undefined) updates.video_url = patch.videoUrl;
    if (patch.videoUrls !== undefined) updates.video_urls = patch.videoUrls;
    if (patch.audioUrl !== undefined) updates.audio_url = patch.audioUrl;
    if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;
    if (patch.durationSeconds !== undefined) updates.duration_seconds = patch.durationSeconds;
    if (patch.position !== undefined) updates.position = patch.position;
    if (patch.contentBlocks !== undefined) updates.content_blocks = patch.contentBlocks;

    console.log('🗄️ SUPABASE - Enviando para DB:', JSON.stringify(updates, null, 2));

    const { data, error } = await this.client
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .single();

    if (error) {
      console.error('❌ SUPABASE - ERRO ao atualizar:', error);
    }

    console.log('🗄️ SUPABASE - Retornado do DB:', JSON.stringify(data, null, 2));

    if (error || !data) throw new DomainError(`Falha ao atualizar aula: ${error?.message || 'dados inválidos'}`);
    return data as LessonRecord;
  }

  async getLesson(id: string): Promise<LessonRecord> {
    const { data, error } = await this.client
      .from('lessons')
      .select('id,module_id,title,content,video_url,video_urls,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new DomainError(`Falha ao buscar aula: ${error?.message || 'aula não encontrada'}`);
    return data as LessonRecord;
  }

  async deleteLesson(id: string): Promise<void> {
    const { data, error } = await this.client.from('lessons').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir aula: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhuma aula foi excluída. Verifique se você está logado como INSTRUCTOR e se existe a policy `lessons_delete_instructors` (RLS) na tabela `lessons`.'
      );
    }
  }

  async listLessonResources(lessonId: string): Promise<LessonResourceRecord[]> {
    const { data, error } = await this.client
      .from('lesson_resources')
      .select('id,lesson_id,title,resource_type,url,position,category,created_at')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar materiais: ${error.message}`);
    return (data || []) as LessonResourceRecord[];
  }

  async createLessonResource(
    lessonId: string,
    payload: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; position?: number; category?: string }
  ): Promise<LessonResourceRecord> {
    const { data, error } = await this.client
      .from('lesson_resources')
      .insert({
        lesson_id: lessonId,
        title: payload.title,
        resource_type: payload.resourceType,
        url: payload.url,
        position: payload.position ?? 0,
        category: payload.category ?? 'Outros'
      })
      .select('id,lesson_id,title,resource_type,url,position,category,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao criar material: ${error?.message || 'dados inválidos'}`);
    return data as LessonResourceRecord;
  }

  async updateLessonResource(
    id: string,
    patch: {
      title?: string;
      resourceType?: LessonResourceRecord['resource_type'];
      url?: string;
      position?: number | null;
      category?: string;
    }
  ): Promise<LessonResourceRecord> {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.resourceType !== undefined) updates.resource_type = patch.resourceType;
    if (patch.url !== undefined) updates.url = patch.url;
    if (patch.position !== undefined) updates.position = patch.position;
    if (patch.category !== undefined) updates.category = patch.category;

    const { data, error } = await this.client
      .from('lesson_resources')
      .update(updates)
      .eq('id', id)
      .select('id,lesson_id,title,resource_type,url,position,category,created_at')
      .single();

    if (error || !data) throw new DomainError(`Falha ao atualizar material: ${error?.message || 'dados inválidos'}`);
    return data as LessonResourceRecord;
  }

  async deleteLessonResource(id: string): Promise<void> {
    const { data, error } = await this.client.from('lesson_resources').delete().eq('id', id).select('id');
    if (error) throw new DomainError(`Falha ao excluir material: ${error.message}`);
    if (!data || data.length === 0) {
      throw new DomainError(
        'Nenhum material foi excluído. Verifique se você está logado como INSTRUCTOR e se existe a policy `lesson_resources_delete_instructors` (RLS) na tabela `lesson_resources`.'
      );
    }
  }

  async listProfiles(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,name,role,xp_total,current_level,gemini_api_key,updated_at,approval_status,approved_at,approved_by,rejection_reason')
      .order('updated_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar usuários: ${error.message}`);

    return (data || []) as ProfileRecord[];
  }

  async fetchPendingUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending');

    if (error) throw new DomainError(`Falha ao buscar usuários pendentes: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchApprovedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('approval_status', 'approved');

    if (error) throw new DomainError(`Falha ao buscar usuários aprovados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async fetchRejectedUsers(): Promise<ProfileRecord[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('approval_status', 'rejected');

    if (error) throw new DomainError(`Falha ao buscar usuários rejeitados: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async assignCoursesToUser(userId: string, courseIds: string[], adminId: string): Promise<void> {
    if (courseIds.length === 0) return;
    const records = courseIds.map(cid => ({
      user_id: userId,
      course_id: cid,
      assigned_at: new Date().toISOString(),
      assigned_by: adminId, // Also adding assigned_by since we have adminId
      is_active: true
    }));

    const { error } = await this.client.from('user_course_assignments').upsert(records);
    if (error) throw new DomainError(`Falha ao atribuir cursos: ${error.message}`);
  }

  async addUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    return this.assignCoursesToUser(userId, [courseId], 'system');
  }

  async removeAllUserCourseAssignments(userId: string): Promise<void> {
    const { error } = await this.client.from('user_course_assignments').delete().eq('user_id', userId);
    if (error) throw new DomainError(`Falha ao remover todos os cursos do usuário: ${error.message}`);
  }

  async deleteProfile(userId: string): Promise<void> {
    // First remove related data if not cascaded
    await this.removeAllUserCourseAssignments(userId);
    const { error } = await this.client.from('profiles').delete().eq('id', userId);
    if (error) throw new DomainError(`Falha ao excluir perfil: ${error.message}`);
  }

  async updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR'): Promise<void> {
    return this.updateProfile(profileId, { role });
  }

  async approveUser(userId: string, adminId: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminId,
        rejection_reason: null
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Falha ao aprovar usuário: ${error.message}`);
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.client.rpc('admin_reset_password', {
      target_user_id: userId,
      new_password: newPassword
    });

    if (error) throw new DomainError(`Falha ao resetar senha: ${error.message}`);
  }

  async rejectUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .update({
        approval_status: 'rejected',
        approved_at: null,
        approved_by: adminId,
        rejection_reason: reason || 'Bloqueado pelo administrador'
      })
      .eq('id', userId);

    if (error) throw new DomainError(`Falha ao bloquear usuário: ${error.message}`);
  }

  async getUserCourseAssignments(userId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', userId);

    if (error) throw new DomainError(`Falha ao buscar cursos do usuário: ${error.message}`);
    return (data || []).map(d => d.course_id);
  }

  async removeUserCourseAssignment(userId: string, courseId: string): Promise<void> {
    const { error } = await this.client
      .from('course_enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) throw new DomainError(`Falha ao remover atribuição de curso: ${error.message}`);
  }

  async updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR'; geminiApiKey?: string | null }): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (patch.role) updates.role = patch.role;
    if (patch.geminiApiKey !== undefined) updates.gemini_api_key = patch.geminiApiKey;

    const { error } = await this.client.from('profiles').update(updates).eq('id', id);
    if (error) throw new DomainError(`Falha ao atualizar perfil: ${error.message}`);
  }

  async getSystemStats(): Promise<any> {
    const { data, error } = await this.client.rpc('get_db_stats');

    // Fallback if RPC fails or not created yet
    if (error) {
      console.warn("RPC get_db_stats failed, falling back to manual count", error);
      return {
        db_size: 'N/A',
        user_count: 0,
        course_count: 0,
        lesson_count: 0,
        file_count: 0,
        storage_size_bytes: 0
      };
    }
    return data;
  }

  // ============ QUIZ METHODS IMPLEMENTATION ============

  /**
   * Busca quiz completo (com perguntas e opções) por lesson_id
   */
  async getQuizByLessonId(lessonId: string): Promise<any | null> {
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .select(`
        id,
        lesson_id,
        title,
        description,
        passing_score,
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

    if (quizError) throw new DomainError(`Erro ao buscar quiz: ${quizError.message}`);
    if (!quizData) return null;

    return quizData;
  }

  /**
   * Cria quiz completo (quiz + perguntas + opções)
   */
  async createQuiz(quiz: any): Promise<any> {
    // 1. Inserir quiz
    const { data: quizData, error: quizError } = await this.client
      .from('quizzes')
      .insert({
        lesson_id: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore
      })
      .select()
      .single();

    if (quizError) throw new DomainError(`Erro ao criar quiz: ${quizError.message}`);

    // 2. Inserir perguntas
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

      // 3. Inserir opções
      const options = question.options.map((o: any) => ({
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

    // Retornar quiz criado
    const createdQuiz = await this.getQuizByLessonId(quiz.lessonId);
    if (!createdQuiz) throw new DomainError('Quiz criado mas não foi possível recuperá-lo');
    return createdQuiz;
  }

  /**
   * Atualiza quiz existente (apenas metadados, não perguntas)
   */
  async updateQuiz(quiz: any): Promise<any> {
    const { error } = await this.client
      .from('quizzes')
      .update({
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passingScore
      })
      .eq('id', quiz.id);

    if (error) throw new DomainError(`Erro ao atualizar quiz: ${error.message}`);

    const updated = await this.getQuizByLessonId(quiz.lessonId);
    if (!updated) throw new DomainError('Quiz não encontrado após atualização');
    return updated;
  }

  /**
   * Deleta quiz (CASCADE deleta perguntas e opções)
   */
  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await this.client
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw new DomainError(`Erro ao deletar quiz: ${error.message}`);
  }

  /**
   * Registra tentativa de quiz
   */
  async submitQuizAttempt(
    userId: string,
    quizId: string,
    score: number,
    passed: boolean,
    answers: Record<string, string>
  ): Promise<any> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        passed,
        answers
      })
      .select()
      .single();

    if (error) throw new DomainError(`Erro ao registrar tentativa: ${error.message}`);

    return data;
  }

  /**
   * Busca última tentativa do usuário
   */
  async getLatestQuizAttempt(userId: string, quizId: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new DomainError(`Erro ao buscar tentativa: ${error.message}`);
    if (!data) return null;

    return data;
  }

  /**
   * Busca todas as tentativas do usuário em um quiz
   */
  async getQuizAttempts(userId: string, quizId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar tentativas: ${error.message}`);

    return (data || []);
  }


  // ============ XP HISTORY ============
  async getXpHistory(userId: string): Promise<import('../domain/admin').XpLogRecord[]> {
    const { data, error } = await this.client
      .from('xp_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new DomainError(`Erro ao buscar histórico de XP: ${error.message}`);
    return (data || []) as import('../domain/admin').XpLogRecord[];
  }

  async logActivity(userId: string, actionType: string, description: string): Promise<void> {
    // Reuse xp_history for general logging (Amount = 0)
    const { error } = await this.client.from('xp_history').insert({
      user_id: userId,
      amount: 0,
      action_type: actionType,
      description: description
    });

    if (error) {
      console.error("Failed to log activity", error);
      // Do not throw to avoid blocking UI
    }
  }

  // ============ COURSE ACCESS CONTROL ============

  async getCourseUserAssignments(courseId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('user_course_assignments')
      .select('user_id')
      .eq('course_id', courseId);

    if (error) throw new DomainError(`Falha ao buscar usuários do curso: ${error.message}`);
    return (data || []).map(d => d.user_id);
  }

  async assignUsersToCourse(courseId: string, userIds: string[], adminId: string): Promise<void> {
    // 1. Remove current assignments for this course
    const { error: deleteError } = await this.client
      .from('user_course_assignments')
      .delete()
      .eq('course_id', courseId);

    if (deleteError) throw new DomainError(`Erro ao limpar atribuições antigas: ${deleteError.message}`);

    // 2. Insert new assignments
    if (userIds.length > 0) {
      const rows = userIds.map(userId => ({
        user_id: userId,
        course_id: courseId,
        assigned_at: new Date().toISOString(),
        assigned_by: adminId
      }));

      const { error: insertError } = await this.client
        .from('user_course_assignments')
        .insert(rows);

      if (insertError) throw new DomainError(`Erro ao atribuir usuários ao curso: ${insertError.message}`);
    }
  }

  // ============ SYSTEM SETTINGS ============
  async getSystemSettings(): Promise<{ key: string; value: string; description: string }[]> {
    const { data, error } = await this.client
      .from('system_settings')
      .select('*');

    if (error) throw new DomainError(`Erro ao buscar configurações do sistema: ${error.message}`);
    return (data || []) as { key: string; value: string; description: string }[];
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    const { error } = await this.client
      .from('system_settings')
      .upsert({ key, value })
      .select();

    if (error) throw new DomainError(`Erro ao atualizar configuração ${key}: ${error.message}`);
  }
}
