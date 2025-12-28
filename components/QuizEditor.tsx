import React, { useState } from 'react';
import { Quiz, QuizQuestion, QuizOption } from '../domain/quiz-entities';
import { LessonResource } from '../domain/entities';

interface QuizEditorProps {
    lessonId: string;
    existingQuiz?: Quiz | null;
    onSave: (quizData: {
        title: string;
        description: string;
        passingScore: number;
        questionsCount: number | null;
        questions: Array<{
            questionText: string;
            questionType: 'multiple_choice' | 'true_false';
            points: number;
            options: Array<{
                optionText: string;
                isCorrect: boolean;
            }>;
        }>;
    }) => Promise<void>;
    onClose: () => void;
    apiKey?: string;
    lessonContent?: string | Promise<string>;
    lessonResources?: LessonResource[];
}

const QuizEditor: React.FC<QuizEditorProps> = ({ lessonId, existingQuiz, onSave, onClose, apiKey, lessonContent, lessonResources }) => {
    const [title, setTitle] = useState(existingQuiz?.title || 'Questionário da Aula');
    const [description, setDescription] = useState(existingQuiz?.description || 'Teste seus conhecimentos');
    const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore || 80);
    const [questionsCount, setQuestionsCount] = useState<number | null>(existingQuiz?.questionsCount || null);

    // Reports State
    const [showReports, setShowReports] = useState(false);
    const [reports, setReports] = useState<import('../domain/quiz-entities').QuizReport[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    const loadReports = async () => {
        if (!existingQuiz?.id) return;

        setIsLoadingReports(true);
        try {
            // Dynamic import to avoid cycles
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseCourseRepository } = await import('../repositories/SupabaseCourseRepository');

            const supabase = createSupabaseClient();
            const repo = new SupabaseCourseRepository(supabase);

            const fetchedReports = await repo.getQuizReports(existingQuiz.id);
            setReports(fetchedReports);
            setShowReports(true);
        } catch (error) {
            console.error('Erro ao carregar reports:', error);
            alert('Erro ao carregar relatórios de erro.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const [questions, setQuestions] = useState<any[]>(
        existingQuiz?.questions.map(q => ({
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            options: q.options.map(o => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect
            }))
        })) || []
    );
    const [isSaving, setIsSaving] = useState(false);

    // 🆕 FIX 4.1: Estado de geração com detalhamento de progresso
    const [isGenerating, setIsGenerating] = useState<{
        active: boolean;
        stage: 'extracting-pdfs' | 'calling-ai' | 'parsing' | null;
        progress: number;
    }>({
        active: false,
        stage: null,
        progress: 0
    });

    // 🆕 FIX 4.3: Estado para preview de perguntas
    const [pendingQuestions, setPendingQuestions] = useState<any[] | null>(null);

    const resolveLessonContent = async (): Promise<string> => {
        if (!lessonContent) return '';
        try {
            return typeof lessonContent === 'string' ? lessonContent : await lessonContent;
        } catch (error) {
            console.error('Erro ao carregar conteudo da aula para IA:', error);
            return '';
        }
    };

    const buildContext = async (): Promise<string> => {
        const contentText = await resolveLessonContent();
        const resourcesText = (lessonResources || [])
            .map(r => `- [${r.type}] ${r.title}${r.url ? ` -> ${r.url}` : ''}`)
            .join('\n');
        return [contentText, resourcesText].filter(Boolean).join('\n\n').trim();
    };

    // 🆕 FIX 1.4: Função auxiliar para normalizar perguntas
    const normalizeQuestions = (parsed: any[]) => {
        return parsed
            .filter((q: any) => q?.questionText)
            .map((q: any) => ({
                questionText: q.questionText,
                questionType: 'multiple_choice' as const,
                points: q.points ?? 1,
                options: (q.options || [])
                    .filter((o: any) => o?.optionText)
                    .map((o: any) => ({
                        optionText: o.optionText,
                        isCorrect: Boolean(o.isCorrect)
                    }))
            }))
            .filter((q: any) => q.options?.length >= 2);
    };

    // 🆕 FIX 1.4: Parsing melhorado com fallback robusto
    const extractQuestionsFromResponse = (responseText: string) => {
        try {
            // Tentar limpeza padrão
            const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
            const target = arrayMatch ? arrayMatch[0] : cleaned;

            const parsed = JSON.parse(target);
            if (!Array.isArray(parsed)) {
                throw new Error('Resposta não é um array');
            }

            return normalizeQuestions(parsed);

        } catch (parseError) {
            console.error('❌ Falha no parsing inicial:', parseError);

            // FALLBACK: Tentar extrair JSONs individuais de perguntas
            try {
                const questionMatches = [...responseText.matchAll(/\{[^{}]*"questionText"[^{}]*\}/g)];
                if (questionMatches.length > 0) {
                    const questions = questionMatches.map(m => {
                        try {
                            return JSON.parse(m[0]);
                        } catch {
                            return null;
                        }
                    }).filter(q => q !== null);

                    if (questions.length > 0) {
                        console.warn(`✓ Fallback: Extraídas ${questions.length} perguntas individuais`);
                        return normalizeQuestions(questions);
                    }
                }
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
            }

            return [];
        }
    };

    const callAi = async (prompt: string): Promise<string> => {
        if (!apiKey) throw new Error('Chave de API ausente');

        // Detecção automática de API (igual ao GeminiBuddy)
        if (apiKey.startsWith('gsk_')) {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.7,        // 🆕 FIX 2.2 - Consistência vs criatividade
                    top_p: 0.9,             // 🆕 FIX 2.2 - Reduz respostas aleatórias
                    max_tokens: 2000,       // 🆕 FIX 2.2 - Limita tamanho da resposta
                    messages: [
                        { role: "system", content: "Você é um assistente útil que responde APENAS com JSON válido." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro Groq API');
            return data.choices[0]?.message?.content || "";

        } else if (apiKey.startsWith('sk-')) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    temperature: 0.7,        // 🆕 FIX 2.2 - Consistência vs criatividade
                    top_p: 0.9,             // 🆕 FIX 2.2 - Reduz respostas aleatórias
                    max_tokens: 2000,       // 🆕 FIX 2.2 - Limita tamanho da resposta
                    messages: [
                        { role: "system", content: "Você é um assistente útil que responde APENAS com JSON válido." },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Erro OpenAI');
            return data.choices[0]?.message?.content || "";
        }

        throw new Error('Chave de API não reconhecida. Use uma chave Groq (gsk_...) ou OpenAI (sk-...).');
    };

    // Função auxiliar para calcular limite de contexto baseado na API
    const getMaxContextChars = (apiKey: string): number => {
        // Groq: 32k tokens ≈ 112k chars | OpenAI: 16k tokens ≈ 56k chars
        // Usando margem de segurança de ~10% para tokens do sistema e prompt
        return apiKey.startsWith('gsk_') ? 100000 : 50000;
    };

    // 🆕 FIX 2.1: Calcular número ótimo de perguntas baseado no tamanho do conteúdo
    const calculateOptimalQuestions = (contextLength: number): number => {
        // Regra: 1 pergunta a cada 3.000 caracteres de conteúdo
        const calculated = Math.floor(contextLength / 3000);

        // Mínimo 3, máximo 10
        return Math.max(3, Math.min(10, calculated));
    };

    // 🆕 FIX 2.3: Função para traduzir erros técnicos em mensagens amigáveis
    const getUserFriendlyError = (error: any): string => {
        const msg = error.message || String(error);

        if (msg.includes('Chave de API') || msg.includes('API') || msg.includes('key')) {
            return '🔑 Problema com a Chave de API\n\n' +
                'Verifique se a chave está correta nas configurações.\n' +
                'A chave deve começar com "gsk_" (Groq) ou "sk-" (OpenAI).';
        }

        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
            return '🌐 Erro de Conexão\n\n' +
                'Verifique sua conexão com a internet e tente novamente.\n' +
                'Se o problema persistir, o serviço de IA pode estar temporáriamente indisponível.';
        }

        if (msg.includes('JSON') || msg.includes('parse') || msg.includes('Unexpected token')) {
            return '⚠️ Resposta Inválida da IA\n\n' +
                'A IA retornou dados incompatíveis.\n' +
                'Tente novamente ou reduza o tamanho do conteúdo.';
        }

        if (msg.includes('não retornou perguntas') || msg.includes('utilizáveis')) {
            return '📋 Conteúdo Insuficiente\n\n' +
                'O conteúdo da aula pode ser muito curto ou genérico.\n' +
                'Adicione mais texto explicativo ou materiais PDF para melhorar a geração.';
        }

        if (msg.includes('timeout') || msg.includes('timed out')) {
            return '⏱️ Tempo Esgotado\n\n' +
                'A geração demorou muito tempo.\n' +
                'Tente reduzir o tamanho do conteúdo ou divida em múltiplas gerações.';
        }

        // Erro genérico com detalhes
        return '❌ Erro Inesperado\n\n' +
            msg.substring(0, 150) + (msg.length > 150 ? '...' : '') + '\n\n' +
            'Tente novamente. Se o erro persistir, contate o suporte.';
    };

    // 🆕 FIX 3.2: Sistema de chunking para conteúdos muito grandes
    const generateQuestionsWithChunking = async (
        fullContext: string,
        maxChars: number,
        questionCount: number
    ): Promise<any[]> => {
        const allQuestions: any[] = [];

        // Se cabe em uma chamada, processar normalmente
        if (fullContext.length <= maxChars) {
            const prompt = buildPrompt(fullContext, questionCount);
            const response = await callAi(prompt);
            return extractQuestionsFromResponse(response);
        }

        // Dividir em chunks
        const chunks: string[] = [];
        for (let i = 0; i < fullContext.length; i += maxChars) {
            chunks.push(fullContext.substring(i, i + maxChars));
        }

        // Limitar a 3 chunks para evitar custo excessivo
        const chunksToProcess = Math.min(chunks.length, 3);
        const questionsPerChunk = Math.floor(questionCount / chunksToProcess);

        console.debug(
            `📦 Conteúdo muito grande (${fullContext.length} chars). ` +
            `Dividindo em ${chunksToProcess} chunks de ~${maxChars} chars. ` +
            `${questionsPerChunk} perguntas por chunk.`
        );

        // Processar cada chunk
        for (let i = 0; i < chunksToProcess; i++) {
            try {
                const chunkPrompt = buildPrompt(chunks[i], questionsPerChunk);
                const response = await callAi(chunkPrompt);
                const questions = extractQuestionsFromResponse(response);

                if (questions.length > 0) {
                    console.debug(`✓ Chunk ${i + 1}/${chunksToProcess}: ${questions.length} perguntas extraídas`);
                    allQuestions.push(...questions);
                } else {
                    console.warn(`⚠️ Chunk ${i + 1}/${chunksToProcess}: nenhuma pergunta gerada`);
                }
            } catch (error) {
                console.error(`❌ Erro ao processar chunk ${i + 1}:`, error);
                // Continuar processando outros chunks mesmo se um falhar
            }
        }

        if (allQuestions.length === 0) {
            throw new Error('Nenhuma pergunta foi gerada dos chunks processados.');
        }

        console.debug(`✅ Total final: ${allQuestions.length} perguntas de ${chunksToProcess} chunks`);
        return allQuestions;
    };

    // Função auxiliar para construir o prompt
    const buildPrompt = (content: string, numQuestions: number): string => {
        return `Você é um especialista em educação criando provas.
Use SOMENTE o conteúdo fornecido para formular perguntas; não invente temas fora dele. Se não houver informação suficiente, retorne "[]".

CONTEÚDO DA AULA (HTML + PDFs + anexos):
"${content}"

Requisitos:
1. Gere ${numQuestions} perguntas elaboradas de múltipla escolha que exijam análise/aplicação (use situações, causa/efeito, exceções, comparações).
2. Cada pergunta deve citar explicitamente um conceito, artigo ou trecho presente no conteúdo.
3. Crie alternativas longas e plausíveis (10-25 palavras), com apenas 1 correta. Evite opções óbvias como "todas as anteriores".
4. Retorne APENAS um JSON válido (sem markdown, sem prefixos).
5. O formato deve ser exatamente:
[
  {
    "questionText": "Texto da pergunta?",
    "points": 1,
    "options": [
      { "optionText": "Opção correta", "isCorrect": true },
      { "optionText": "Opção errada 1", "isCorrect": false },
      { "optionText": "Opção errada 2", "isCorrect": false },
      { "optionText": "Opção errada 3", "isCorrect": false }
    ]
  }
]
6. Marque apenas uma opção como correta (isCorrect: true).`;
    };

    const handleGenerateAi = async () => {
        if (!apiKey) {
            alert('🔑 Chave de API Não Configurada\n\n' +
                'Configure sua chave Groq ou OpenAI nas configurações do sistema.');
            return;
        }

        // 🆕 FIX 4.1: Progresso: Construindo contexto
        setIsGenerating({ active: true, stage: 'extracting-pdfs', progress: 20 });
        const fullContext = await buildContext();
        const maxChars = getMaxContextChars(apiKey);

        console.debug('Quiz AI context:', {
            total: fullContext.length,
            max: maxChars,
            willTruncate: fullContext.length > maxChars
        });

        // 🆕 FIX 1.2: Warning quando conteúdo será truncado
        if (fullContext.length > maxChars) {
            const percentProcessed = Math.round((maxChars / fullContext.length) * 100);
            const shouldContinue = window.confirm(
                `⚠️ Atenção: Conteúdo Grande Detectado\n\n` +
                `• Total: ${fullContext.length.toLocaleString()} caracteres\n` +
                `• Será processado: ${maxChars.toLocaleString()} (${percentProcessed}%)\n` +
                `• Caracteres ignorados: ${(fullContext.length - maxChars).toLocaleString()}\n\n` +
                `As perguntas serão geradas apenas sobre o conteúdo processado.\n\n` +
                `Deseja continuar?`
            );

            if (!shouldContinue) {
                setIsGenerating({ active: false, stage: null, progress: 0 });
                return;
            }
        }

        // 🆕 FIX 1.1: Usar contexto dinâmico baseado na API (não mais fixo em 12k)
        const context = fullContext.substring(0, maxChars);
        console.debug(`✓ Quiz AI processará ${context.length} caracteres`);

        // 🆕 FIX 2.1: Calcular quantidade de perguntas dinamicamente
        const questionCount = calculateOptimalQuestions(context.length);
        console.debug(`📊 Gerando ${questionCount} perguntas para ${context.length} caracteres`);

        // 🆕 FIX 4.1: Progresso: Chamando IA
        setIsGenerating({ active: true, stage: 'calling-ai', progress: 50 });
        try {
            // 🆕 FIX 3.2: Usar chunking quando necessário
            let normalized = await generateQuestionsWithChunking(context, maxChars, questionCount);

            // Se veio vazio, tenta um retry mais direto
            if (normalized.length === 0) {
                const retryPrompt = `${buildPrompt(context, questionCount)}\n\nIMPORTANTE: Gere exatamente ${questionCount} perguntas com 4 opções cada e retorne APENAS o JSON do array. NÃO retorne array vazio.`;
                const retryResponse = await callAi(retryPrompt);
                console.debug('Quiz AI retry raw response (len):', retryResponse.length);
                normalized = extractQuestionsFromResponse(retryResponse);
            }

            if (normalized.length === 0) {
                throw new Error('A IA não retornou perguntas utilizáveis. Verifique se o conteúdo da aula está acessível ou reduza o tamanho.');
            }

            // 🆕 FIX 4.1: Progresso: Parsing completo
            setIsGenerating({ active: true, stage: 'parsing', progress: 90 });

            // 🆕 FIX 4.3: Mostrar preview ao invés de adicionar direto
            setPendingQuestions(normalized);

        } catch (error) {
            console.error('❌ Erro detalhado ao gerar quiz:', error);
            alert(getUserFriendlyError(error)); // 🆕 FIX 2.3: Mensagem amigável
        } finally {
            setIsGenerating({ active: false, stage: null, progress: 0 });
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            questionText: '',
            questionType: 'multiple_choice',
            points: 1,
            options: [
                { optionText: '', isCorrect: false },
                { optionText: '', isCorrect: false }
            ]
        }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const addOption = (questionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options.push({ optionText: '', isCorrect: false });
        setQuestions(updated);
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options = updated[questionIndex].options.filter((_: any, i: number) => i !== optionIndex);
        setQuestions(updated);
    };

    const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex] = {
            ...updated[questionIndex].options[optionIndex],
            [field]: value
        };
        setQuestions(updated);
    };

    const toggleCorrect = (questionIndex: number, optionIndex: number) => {
        const updated = [...questions];
        updated[questionIndex].options[optionIndex].isCorrect = !updated[questionIndex].options[optionIndex].isCorrect;
        setQuestions(updated);
    };

    const handleSave = async () => {
        // Validações
        if (!title.trim()) {
            alert('Título do quiz é obrigatório');
            return;
        }

        if (questions.length === 0) {
            alert('Adicione pelo menos uma pergunta');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText.trim()) {
                alert(`Pergunta ${i + 1} está vazia`);
                return;
            }
            if (q.options.length < 2) {
                alert(`Pergunta ${i + 1} precisa de pelo menos 2 opções`);
                return;
            }
            const hasCorrect = q.options.some((o: any) => o.isCorrect);
            if (!hasCorrect) {
                alert(`Pergunta ${i + 1} precisa ter pelo menos uma resposta correta`);
                return;
            }
        }

        setIsSaving(true);
        try {
            await onSave({
                title,
                description,
                passingScore,
                questionsCount,
                questions
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl my-8">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            <i className="fas fa-clipboard-list mr-3 text-indigo-600"></i>
                            {existingQuiz ? 'Editar' : 'Criar'} Questionário
                        </h2>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Quiz metadata */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Título do Quiz *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Nome do questionário"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Descrição
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Breve descrição"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Nota Mínima para Aprovação (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={passingScore}
                                onChange={(e) => setPassingScore(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Banco de Questões (Limite de Perguntas)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max={questions.length}
                                    value={questionsCount || ''}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? null : Number(e.target.value);
                                        setQuestionsCount(val);
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder={`Todas (${questions.length})`}
                                />
                                {existingQuiz && (
                                    <button
                                        onClick={loadReports}
                                        className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-200 transition-colors flex items-center gap-2"
                                        title="Ver reportes de erro"
                                        disabled={isLoadingReports}
                                    >
                                        <i className="fas fa-exclamation-triangle"></i>
                                        {isLoadingReports ? '...' : 'Reportes'}
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Se preenchido, o aluno verá apenas essa quantidade de perguntas sorteadas aleatoriamente a cada tentativa.
                                Deixe em branco para exibir todas as {questions.length} perguntas.
                            </p>
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                Perguntas ({questions.length})
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerateAi}
                                    disabled={isGenerating.active || !apiKey}
                                    className={`px-4 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${!apiKey ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                                        isGenerating.active
                                            ? 'bg-purple-100 text-purple-600 cursor-wait'
                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                                        }`}
                                    title={!apiKey ? "API Key não configurada" : "Gerar perguntas com IA"}
                                >
                                    {/* 🆕 FIX 4.1: Mostrar progresso detalhado */}
                                    {isGenerating.active ? (
                                        <>
                                            <i className="fas fa-magic animate-pulse"></i>
                                            <span>
                                                {isGenerating.stage === 'extracting-pdfs' && 'Extraindo PDFs...'}
                                                {isGenerating.stage === 'calling-ai' && 'Consultando IA...'}
                                                {isGenerating.stage === 'parsing' && 'Processando...'}
                                                <span className="text-xs ml-1">({isGenerating.progress}%)</span>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-magic"></i>
                                            <span>Gerar com IA</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={addQuestion}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors text-sm"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    Adicionar Pergunta
                                </button>
                            </div>
                        </div>

                        {questions.map((q, qIdx) => (
                            <div key={qIdx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Pergunta {qIdx + 1}</span>
                                    <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-600 text-sm">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={q.questionText}
                                    onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mb-3 text-sm"
                                    placeholder="Digite a pergunta..."
                                />

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Pontos</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={q.points}
                                            onChange={(e) => updateQuestion(qIdx, 'points', Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Opções de Resposta</label>
                                        <button
                                            onClick={() => addOption(qIdx)}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            + Adicionar Opção
                                        </button>
                                    </div>

                                    {q.options.map((opt: any, optIdx: number) => (
                                        <div key={optIdx} className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleCorrect(qIdx, optIdx)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${opt.isCorrect
                                                    ? 'bg-green-500 border-green-500'
                                                    : 'border-slate-300 dark:border-slate-600'
                                                    }`}
                                            >
                                                {opt.isCorrect && <i className="fas fa-check text-white text-xs"></i>}
                                            </button>
                                            <input
                                                type="text"
                                                value={opt.optionText}
                                                onChange={(e) => updateOption(qIdx, optIdx, 'optionText', e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                                placeholder={`Opção ${optIdx + 1}`}
                                            />
                                            {q.options.length > 2 && (
                                                <button
                                                    onClick={() => removeOption(qIdx, optIdx)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <i className="fas fa-times text-sm"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <i className="fas fa-clipboard-question text-4xl mb-3 opacity-50"></i>
                                <p className="text-sm">Nenhuma pergunta adicionada ainda</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-circle-notch animate-spin mr-2"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save mr-2"></i>
                                Salvar Quiz
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 🆕 FIX 4.3: Modal de Preview de Perguntas */}
            {pendingQuestions && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <h3 className="text-2xl font-black flex items-center gap-3">
                                <i className="fas fa-sparkles"></i>
                                Preview: {pendingQuestions.length} Perguntas Geradas
                            </h3>
                            <p className="text-indigo-100 text-sm mt-1">
                                Revise as perguntas antes de adicionar ao quiz
                            </p>
                        </div>

                        {/* Questions List - Scrollable */}
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-220px)] space-y-4">
                            {pendingQuestions.map((q, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white text-base leading-relaxed">
                                                {q.questionText}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {q.points} {q.points === 1 ? 'ponto' : 'pontos'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 ml-11">
                                        {q.options.map((opt: any, j: number) => (
                                            <div
                                                key={j}
                                                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${opt.isCorrect
                                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                                    : 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${opt.isCorrect
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                    {opt.isCorrect ? '✓' : String.fromCharCode(65 + j)}
                                                </div>
                                                <span className={opt.isCorrect ? 'text-green-700 dark:text-green-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                                    {opt.optionText}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => setPendingQuestions(null)}
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                <i className="fas fa-times mr-2"></i>
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setQuestions(prev => [...prev, ...pendingQuestions]);
                                    setPendingQuestions(null);
                                    alert(
                                        `✅ ${pendingQuestions.length} ${pendingQuestions.length === 1 ? 'pergunta adicionada' : 'perguntas adicionadas'} ao quiz!\n\n` +
                                        `Não esqueça de salvar o quiz quando terminar.`
                                    );
                                }}
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                <i className="fas fa-check mr-2"></i>
                                Adicionar {pendingQuestions.length} {pendingQuestions.length === 1 ? 'Pergunta' : 'Perguntas'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Modal */}
            {showReports && (
                <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-amber-900/10">
                            <h3 className="text-xl font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i>
                                Reportes de Erro ({reports.length})
                            </h3>
                            <button onClick={() => setShowReports(false)} className="text-slate-500 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {reports.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">Nenhum reporte encontrado para este quiz.</p>
                            ) : (
                                reports.map(report => {
                                    const relatedQuestion = questions.find((_, idx) => {
                                        // Como não temos IDs nas perguntas locais (são índices), é difícil mapear 100%
                                        // Mas se a pergunta existir no quiz original, podemos tentar achar
                                        // O ideal seria 'questions' ter IDs, mas neste editor elas podem ser novas.
                                        // Vamos apenas mostrar dados do reporte.
                                        return false;
                                    }) || existingQuiz?.questions.find(q => q.id === report.questionId);

                                    return (
                                        <div key={report.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {report.status}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {report.createdAt && new Date(report.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                                                Questão: {relatedQuestion ? relatedQuestion.questionText : 'ID: ' + report.questionId?.substring(0, 8)}
                                            </p>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mt-2 text-sm">
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">
                                                    Motivo: {report.issueType === 'no_correct' ? 'Sem resposta correta' :
                                                        report.issueType === 'multiple_correct' ? 'Múltiplas corretas' :
                                                            report.issueType === 'confusing' ? 'Confuso/Incorreto' : 'Outro'}
                                                </p>
                                                {report.comment && (
                                                    <p className="text-slate-600 dark:text-slate-400 mt-1 italic">"{report.comment}"</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizEditor;
