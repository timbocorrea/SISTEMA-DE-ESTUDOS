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

        const MAX_CONTEXT_LENGTH = 15000;
        const MAX_HISTORY_MESSAGES = 10;

        const truncatedContext = currentContext && currentContext.length > MAX_CONTEXT_LENGTH
            ? currentContext.substring(0, MAX_CONTEXT_LENGTH) + "\n...[conteúdo truncado]..."
            : currentContext;

        const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

        const fullContext = `
      Contexto do Sistema: ${systemContext}
      ${truncatedContext ? `Conteúdo da Aula Atual: ${truncatedContext}` : ''}
    `;

        const systemInstruction = `
      Você é o 'Study Buddy', um assistente inteligente integrado à plataforma de ensino.
      Seu objetivo é ajudar o usuário ${userName} tanto com dúvidas sobre o conteúdo das aulas quanto com a navegação no sistema.
      
      Diretrizes:
      1. Se a pergunta for sobre a matéria, explique de forma didática e DIRETA. SEMPRE comece respondendo à pergunta imediatamente.
      2. PROIBIDO: Não use frases de introdução como "Olá", "Que bom que perguntou", "Entendo sua dúvida", etc. Corte todo o "fluff".
      3. Se a pergunta for sobre o sistema, guie o usuário com base no contexto do sistema.
      4. Responda em português do Brasil.
      5. Mantenha a resposta CONCISA (máx 3-4 parágrafos). Priorize a informação essencial.
      6. VISÃO: Analise imagens se fornecidas.
      7. ACESSIBILIDADE: Use aspas duplas ("") em vez de asteriscos para destaque.

      CRÍTICO:
      Ao final da resposta, SEMPRE adicione uma ou duas perguntas curtas sugerindo como continuar o assunto.
      Exemplo:
      "Gostaria de ver um exemplo prático de Pilha?" ou "Quer saber as vantagens sobre Vetores?"
      Formate assim no final:
      
      💡 **Sugestões:** [Sua sugestão aqui]
    `;

        try {
            // history might not yet include the optimistic update in this closure
            const { data, error } = await supabase.functions.invoke('ask-ai', {
                body: {
                    messages: [
                        { role: 'system', text: `${systemInstruction}\nContexto: ${fullContext}` },
                        ...recentHistory.map(m => ({ role: m.role, text: m.text, image: (m as any).image })),
                        { role: 'user', text: text || 'Analise a imagem.', image: image }
                    ],
                    model: 'gemini-1.5-flash-latest' // Force efficient model
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

            const isQuotaError = errorMessage.includes('Quota exceeded') || errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

            if (userId) {
                if (isQuotaError) {
                    addMessage(userId, {
                        role: 'ai',
                        text: `⏳ **Limite de uso atingido**\n\nO plano gratuito da IA excedeu a cota momentânea. Por favor, aguarde cerca de 1 minuto antes de tentar novamente.\n\n*Dica: Perguntas mais curtas consomem menos cota.*`
                    }, threadTitle);
                } else {
                    addMessage(userId, {
                        role: 'ai',
                        text: `❌ **O Buddy encontrou um problema:**\n${errorMessage}\n\n*Dica: Verifique se sua chave de API está configurada no Perfil.*`
                    }, threadTitle);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, history }; // Return filtered history for convenience
};
