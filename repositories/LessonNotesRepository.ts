import { createSupabaseClient } from '../services/supabaseClient';

export interface LessonNote {
    id: string;
    user_id: string;
    lesson_id: string;
    title?: string;
    content?: string;
    position: number;
    has_highlight: boolean;
    highlighted_text?: string;
    highlight_color?: 'yellow' | 'green' | 'blue' | 'pink';
    xpath_start?: string;
    offset_start?: number;
    xpath_end?: string;
    offset_end?: number;
    extra_highlights?: any[];
    created_at: string;
    updated_at: string;
}

export class LessonNotesRepository {
    private static get client() {
        return createSupabaseClient();
    }

    // Carregar notas de uma aula
    static async loadNotes(userId: string, lessonId: string): Promise<LessonNote[]> {
        const { data, error } = await this.client
            .from('lesson_notes')
            .select('*, extra_highlights')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .order('position', { ascending: true });

        if (error) {
            console.error('Erro ao carregar notas:', error);
            return [];
        }

        return data || [];
    }

    // Salvar nova nota
    static async saveNote(note: Omit<LessonNote, 'id' | 'created_at' | 'updated_at'>): Promise<LessonNote | null> {
        const { data, error } = await this.client
            .from('lesson_notes')
            .insert([note])
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar nota:', error);
            return null;
        }

        return data;
    }

    // Atualizar nota
    static async updateNote(id: string, updates: Partial<LessonNote>): Promise<boolean> {
        const { error } = await this.client
            .from('lesson_notes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar nota:', error);
            return false;
        }

        return true;
    }

    // Deletar nota
    static async deleteNote(id: string): Promise<boolean> {
        const { error } = await this.client
            .from('lesson_notes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar nota:', error);
            return false;
        }

        return true;
    }
}
