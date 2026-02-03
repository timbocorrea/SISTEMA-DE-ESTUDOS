import { useState } from 'react';
import { createSupabaseClient } from '../services/supabaseClient';
import { useBuddyStore } from '../stores/useBuddyStore';

interface UseBuddyClientProps {
    userId: string;
    systemContext?: string;
    currentContext?: string;
    userName?: string;
    threadTitle?: string;
}

export const useBuddyClient = ({ userId, systemContext = '', currentContext = '', userName = 'Estudante', threadTitle }: UseBuddyClientProps) => {
    const { threadsByUser, activeThreadIdByUser, addMessage, setLoading } = useBuddyStore();

    // Get messages for the active thread
    const threads = threadsByUser[userId] || [];
    const activeThreadId = activeThreadIdByUser[userId];
    const activeThread = threads.find(t => t.id === activeThreadId);
    const history = activeThread?.messages || [];

    const supabase = createSupabaseClient();

    const sendMessage = async (text: string, image?: string | null) => {
        if (!text.trim() && !image) return;

        const displayMessage = image ?
            (text ? `${text}\n[Imagem enviada]` : '[Imagem enviada]')
            : text;

        // Optimistic Update
        if (userId) {
            addMessage(userId, { role: 'user', text: displayMessage, image: image }, threadTitle);
        }
        setLoading(true);

        const fullContext = `
      Contexto do Sistema: ${systemContext}
      ${currentContext ? `Conteúdo da Aula Atual: ${currentContext}` : ''}
    `;

        const systemInstruction = `
      Você é o 'Study Buddy', um assistente inteligente integrado à plataforma de ensino.
      Seu objetivo é ajudar o usuário ${userName} tanto com dúvidas sobre o conteúdo das aulas quanto com a navegação no sistema.
      
      Diretrizes:
      1. Se a pergunta for sobre a matéria (Java, POO, etc), explique de forma didática.
      2. Se a pergunta for sobre o sistema (Onde vejo notas? Como saio?), guie o usuário com base no contextos do sistema fornecido.
      3. IMPORTANTE: Use o HISTÓRICO DE ATIVIDADES para responder perguntas "onde parei?".
      4. NAVEGAÇÃO: Para links, use o formato: [[RESUME:ID_CURSO:ID_AULA]].
      5. Seja sempre encorajador, paciente e educado.
      6. Responda em português do Brasil.
      7. Mantenha a conversa natural.
      8. VISÃO: Analise imagens se fornecidas.
      9. ACESSIBILIDADE: O usuário usa leitor de tela. NÃO use markdown de negrito/itálico com asteriscos (*). Em vez disso, use aspas duplas ("") para destacar termos importantes.
    `;

        try {
            // history might not yet include the optimistic update in this closure
            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: {
                    messages: [
                        { role: 'system', text: `${systemInstruction}\nContexto: ${fullContext}` },
                        ...history.map(m => ({ role: m.role, text: m.text, image: (m as any).image })),
                        { role: 'user', text: text || 'Analise a imagem.', image: image }
                    ]
                }
            });

            if (error) {
                let remoteError = error.message;
                try {
                    // Try to get body from FunctionsHttpError
                    if (error instanceof Error && (error as any).context) {
                        const body = await (error as any).context.json();
                        if (body.error) remoteError = body.error;
                    }
                } catch (e) { /* ignore parse error */ }
                throw new Error(remoteError);
            }

            const aiResponse = data.response;

            // Parse Action
            const actionMatch = aiResponse.match(/\[\[RESUME:(.+?):(.+?)\]\]/);
            let action: { label: string; courseId: string; lessonId: string } | undefined = undefined;

            let cleanResponse = aiResponse;
            if (actionMatch) {
                cleanResponse = aiResponse.replace(actionMatch[0], '');
                action = {
                    label: 'Retomar aula 🚀',
                    courseId: actionMatch[1],
                    lessonId: actionMatch[2]
                };
            }

            if (userId) {
                addMessage(userId, { role: 'ai', text: cleanResponse, action }, threadTitle);
            }

        } catch (error: any) {
            console.error('Buddy Client Error:', error);

            let errorMessage = error.message || "Erro desconhecido ao falar com a IA.";

            if (userId) {
                addMessage(userId, {
                    role: 'ai',
                    text: `❌ **O Buddy encontrou um problema:**\n${errorMessage}\n\n*Dica: Verifique se sua chave de API está configurada no Perfil.*`
                }, threadTitle);
            }
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, history }; // Return filtered history for convenience
};
