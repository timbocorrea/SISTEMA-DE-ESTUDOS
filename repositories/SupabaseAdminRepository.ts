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
      .select('id,module_id,title,content,video_url,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
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
      .select('id,module_id,title,content,video_url,audio_url,image_url,duration_seconds,position,created_at')
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
      .select('id,module_id,title,content,video_url,audio_url,image_url,duration_seconds,position,content_blocks,created_at')
      .single();

    if (error) {
      console.error('❌ SUPABASE - ERRO ao atualizar:', error);
    }

    console.log('🗄️ SUPABASE - Retornado do DB:', JSON.stringify(data, null, 2));

    if (error || !data) throw new DomainError(`Falha ao atualizar aula: ${error?.message || 'dados inválidos'}`);
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
      .select('id,lesson_id,title,resource_type,url,position,created_at')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new DomainError(`Falha ao listar materiais: ${error.message}`);
    return (data || []) as LessonResourceRecord[];
  }

  async createLessonResource(
    lessonId: string,
    payload: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; position?: number }
  ): Promise<LessonResourceRecord> {
    const { data, error } = await this.client
      .from('lesson_resources')
      .insert({
        lesson_id: lessonId,
        title: payload.title,
        resource_type: payload.resourceType,
        url: payload.url,
        position: payload.position ?? 0
      })
      .select('id,lesson_id,title,resource_type,url,position,created_at')
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
    }
  ): Promise<LessonResourceRecord> {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.resourceType !== undefined) updates.resource_type = patch.resourceType;
    if (patch.url !== undefined) updates.url = patch.url;
    if (patch.position !== undefined) updates.position = patch.position;

    const { data, error } = await this.client
      .from('lesson_resources')
      .update(updates)
      .eq('id', id)
      .select('id,lesson_id,title,resource_type,url,position,created_at')
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
      .select('id,email,name,role,xp_total,current_level,gemini_api_key,updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw new DomainError(`Falha ao listar usuários: ${error.message}`);
    return (data || []) as ProfileRecord[];
  }

  async updateProfileRole(profileId: string, role: 'STUDENT' | 'INSTRUCTOR'): Promise<void> {
    return this.updateProfile(profileId, { role });
  }

  async updateProfile(id: string, patch: { role?: 'STUDENT' | 'INSTRUCTOR'; geminiApiKey?: string | null }): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (patch.role) updates.role = patch.role;
    if (patch.geminiApiKey !== undefined) updates.gemini_api_key = patch.geminiApiKey;

    const { error } = await this.client.from('profiles').update(updates).eq('id', id);
    if (error) throw new DomainError(`Falha ao atualizar perfil: ${error.message}`);
  }
}
