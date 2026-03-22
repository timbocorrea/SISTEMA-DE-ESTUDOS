import { supabaseClient as supabase } from '@/services/Dependencies';
import { ForumMessage } from '../domain/entities';

export class LessonForumRepository {
    private client = supabase;

    /**
     * Busca todas as mensagens de uma aula específica
     */
    async getMessagesByLesson(lessonId: string): Promise<ForumMessage[]> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar mensagens do fórum:', error);
            return [];
        }

        return data as ForumMessage[];
    }

    /**
     * Envia uma nova mensagem para o fórum
     */
    async createMessage(lessonId: string, userId: string, content: string): Promise<ForumMessage | null> {
        const { data, error } = await this.client
            .from('lesson_forum_messages')
            .insert({
                lesson_id: lessonId,
                user_id: userId,
                content: content
            })
            .select(`
                *,
                profiles (
                    name,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('Erro ao enviar mensagem:', error);
            return null;
        }

        return data as ForumMessage;
    }

    /**
     * Busca o perfil de um usuário específico (auxiliar para realtime)
     */
    async getUserProfile(userId: string) {
        const { data, error } = await this.client
            .from('profiles')
            .select('name, role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil:', error);
            return null;
        }

        return data;
    }
}
