import React, { useState } from 'react';
import { Quiz, QuizQuestion, QuizOption } from '../domain/quiz-entities';
import { LessonResource } from '../domain/entities';
import { toast } from 'sonner';
import { normalizeQuestions } from '../utils/quizUtils';

interface QuizEditorProps {
    lessonId: string;
    existingQuiz?: Quiz | null;
    onSave: (quizData: {
        title: string;
        description: string;
        passingScore: number;
        questionsCount: number | null;
        poolDifficulty: 'easy' | 'medium' | 'hard' | null;
        questions: Array<{
            id?: string;
            questionText: string;
            questionType: 'multiple_choice' | 'true_false';
            points: number;
            options: Array<{
                id?: string;
                optionText: string;
                isCorrect: boolean;
            }>;
        }>;
    }) => Promise<void>;
    onClose: () => void;
    apiKey?: string;
    lessonContent?: string | Promise<string>;
    lessonResources?: LessonResource[];
    courseId?: string;
    moduleId?: string;
}

const QuizEditor: React.FC<QuizEditorProps> = ({ lessonId, existingQuiz, onSave, onClose, apiKey, lessonContent, lessonResources, courseId, moduleId }) => {
    const [title, setTitle] = useState(existingQuiz?.title || 'Questionário da Aula');
    const [description, setDescription] = useState(existingQuiz?.description || 'Teste seus conhecimentos');
    const [passingScore, setPassingScore] = useState(existingQuiz?.passingScore || 80);
    const [questionsCount, setQuestionsCount] = useState<number | null>(existingQuiz?.questionsCount || null);
    const [poolDifficulty, setPoolDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(existingQuiz?.poolDifficulty || null);
    const [usePool, setUsePool] = useState(!!existingQuiz?.questionsCount && existingQuiz.questions.length === 0);

    // Reports State
    const [showReports, setShowReports] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    // Deletion State
    const [questionToDeleteIndex, setQuestionToDeleteIndex] = useState<number | null>(null);

    // Bank Preview State
    const [bankPreview, setBankPreview] = useState<QuizQuestion[]>([]);
    const [isLoadingBank, setIsLoadingBank] = useState(false);

    // JSON Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRawJson, setImportRawJson] = useState('');

    const loadBankPreview = async () => {
        if (!usePool) return;
        setIsLoadingBank(true);
        try {
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseQuestionBankRepository } = await import('../repositories/SupabaseQuestionBankRepository');
            const repo = new SupabaseQuestionBankRepository(createSupabaseClient());
            // Filter by lesson, module or course depending on what's available
            const results = await repo.getQuestions({
                lessonId: lessonId || undefined,
                moduleId: moduleId || undefined,
                courseId: courseId || undefined,
                difficulty: poolDifficulty || undefined
            });
            setBankPreview(results);
        } catch (error) {
            console.error('Error loading bank preview:', error);
            toast.error('Erro ao carrerar preview do banco');
        } finally {
            setIsLoadingBank(false);
        }
    };

    React.useEffect(() => {
        if (usePool) {
            loadBankPreview();
        }
    }, [usePool, poolDifficulty]);

    const loadReports = async () => {
        if (!existingQuiz?.id) return;

        setIsLoadingReports(true);
        try {
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseCourseRepository } = await import('../repositories/SupabaseCourseRepository');

            const supabase = createSupabaseClient();
            const repo = new SupabaseCourseRepository(supabase);

            const fetchedReports = await repo.getQuizReports(existingQuiz.id);
            setReports(fetchedReports);
            setShowReports(true);
        } catch (error) {
            console.error('Erro ao carregar reports:', error);
            toast.error('Erro ao carregar relatórios de erro.');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const [questions, setQuestions] = useState<any[]>(
        existingQuiz?.questions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            options: q.options.map(o => ({
                id: o.id,
                optionText: o.optionText,
                isCorrect: o.isCorrect
            }))
        })) || []
    );
    const [isSaving, setIsSaving] = useState(false);

    const [isGenerating, setIsGenerating] = useState<{
        active: boolean;
        stage: 'extracting-pdfs' | 'calling-ai' | 'parsing' | null;
        progress: number;
    }>({
        active: false,
        stage: null,
        progress: 0
    });

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


    const extractQuestionsFromResponse = (responseText: string) => {
        try {
            const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
            const target = arrayMatch ? arrayMatch[0] : cleaned;
            const parsed = JSON.parse(target);
            return normalizeQuestions(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (error) {
            console.error('❌ Falha no parsing:', error);
            return [];
        }
    };

    const callAi = async (prompt: string): Promise<string> => {
        if (!apiKey) throw new Error('Chave de API ausente');
        const isGroq = apiKey.startsWith('gsk_');
        const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
        const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-3.5-turbo';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.7,
                messages: [
                    { role: "system", content: "Você é um assistente útil que responde APENAS com JSON válido." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro API');
        return data.choices[0]?.message?.content || "";
    };

    const buildPrompt = (content: string, numQuestions: number): string => {
        return `Gere ${numQuestions} perguntas de múltipla escolha baseadas no seguinte conteúdo:\n\n${content}\n\nRetorne JSON no formato: [{"questionText": "...", "points": 1, "options": [{"optionText": "...", "isCorrect": true}, ...]}]`;
    };

    const handleGenerateAi = async () => {
        if (!apiKey) {
            toast.error('🔑 Chave de API Não Configurada');
            return;
        }

        setIsGenerating({ active: true, stage: 'extracting-pdfs', progress: 20 });
        try {
            const fullContext = await buildContext();
            const context = fullContext.substring(0, 50000);
            const questionCount = 5;

            setIsGenerating({ active: true, stage: 'calling-ai', progress: 50 });
            const response = await callAi(buildPrompt(context, questionCount));
            const normalized = extractQuestionsFromResponse(response);

            if (normalized.length === 0) throw new Error('A IA não retornou perguntas utilizáveis.');

            setIsGenerating({ active: true, stage: 'parsing', progress: 90 });
            setPendingQuestions(normalized);
        } catch (error: any) {
            toast.error('Erro ao gerar perguntas: ' + error.message);
        } finally {
            setIsGenerating({ active: false, stage: null, progress: 0 });
        }
    };

    const handleImportJson = async () => {
        try {
            const raw = importRawJson.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(raw);
            const normalized = normalizeQuestions(Array.isArray(parsed) ? parsed : [parsed]);

            if (normalized.length === 0) {
                toast.error('Nenhuma questão válida encontrada no JSON.');
                return;
            }

            const syncAndAdd = (async () => {
                const { createSupabaseClient } = await import('../services/supabaseClient');
                const { SupabaseQuestionBankRepository } = await import('../repositories/SupabaseQuestionBankRepository');
                const repo = new SupabaseQuestionBankRepository(createSupabaseClient());

                await repo.createQuestions(normalized, {
                    courseId,
                    moduleId,
                    lessonId
                });
                setQuestions(prev => [...prev, ...normalized]);
                setImportRawJson('');
                setIsImportModalOpen(false);
            })();

            toast.promise(syncAndAdd, {
                loading: 'Processando e sincronizando questões com o banco...',
                success: `✅ ${normalized.length} questões importadas e salvas no banco com sucesso!`,
                error: (err) => `❌ Erro na sincronização: ${err.message || 'Erro desconhecido'}`
            });
        } catch (error) {
            console.error('Erro ao processar JSON:', error);
            toast.error('JSON inválido. Verifique a formatação.');
        }
    };

    const handleSyncManualQuestions = async () => {
        if (questions.length === 0) {
            toast.error('Não há questões manuais para sincronizar.');
            return;
        }

        const syncPromise = (async () => {
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseQuestionBankRepository } = await import('../repositories/SupabaseQuestionBankRepository');
            const repo = new SupabaseQuestionBankRepository(createSupabaseClient());

            await repo.createQuestions(questions as QuizQuestion[], {
                courseId,
                moduleId,
                lessonId
            });
        })();

        toast.promise(syncPromise, {
            loading: 'Sincronizando todas as questões manuais com o banco global...',
            success: '✅ Sincronização concluída! As questões agora estão no banco global.',
            error: (err) => `❌ Erro na sincronização: ${err.message || 'Erro desconhecido'}`
        });
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
        setQuestionToDeleteIndex(index);
    };

    const confirmRemoveQuestion = () => {
        if (questionToDeleteIndex !== null) {
            setQuestions(questions.filter((_, i) => i !== questionToDeleteIndex));
            setQuestionToDeleteIndex(null);
            toast.success('Pergunta removida localmente. Clique em Salvar para persistir a exclusão.');
        }
    };

    const handleAcceptAiQuestions = async () => {
        if (!pendingQuestions || pendingQuestions.length === 0) return;

        const toAdd = [...pendingQuestions];
        const syncPromise = (async () => {
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseQuestionBankRepository } = await import('../repositories/SupabaseQuestionBankRepository');
            const repo = new SupabaseQuestionBankRepository(createSupabaseClient());

            await repo.createQuestions(toAdd as QuizQuestion[], {
                courseId,
                moduleId,
                lessonId
            });

            setQuestions(prev => [...prev, ...toAdd]);
            setPendingQuestions(null);
        })();

        toast.promise(syncPromise, {
            loading: 'Adicionando e sincronizando questões com o banco...',
            success: `✅ ${toAdd.length} questões adicionadas e salvas no banco!`,
            error: (err) => `❌ Erro ao adicionar/sincronizar: ${err.message || 'Erro desconhecido'}`
        });
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
        if (!title.trim()) {
            toast.warning('Título do quiz é obrigatório');
            return;
        }

        if (usePool) {
            if (!questionsCount || questionsCount <= 0) {
                toast.warning('Defina a quantidade de questões do banco');
                return;
            }
        } else {
            // Permitir 0 questões se for para limpar o quiz, mas avisar
            if (questions.length === 0) {
                const proceed = window.confirm('Você está prestes a salvar um quiz sem perguntas manuais. Isso removerá todas as perguntas existentes no banco. Deseja continuar?');
                if (!proceed) return;
            }
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.questionText.trim()) {
                    toast.warning(`Pergunta ${i + 1} está vazia`);
                    return;
                }
                if (!q.options.some((o: any) => o.isCorrect)) {
                    toast.warning(`Pergunta ${i + 1} precisa de uma resposta correta`);
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            await onSave({
                title,
                description,
                passingScore,
                questionsCount: usePool ? questionsCount : (questionsCount || null),
                poolDifficulty: usePool ? poolDifficulty : null,
                questions: usePool ? [] : questions
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            <i className="fas fa-clipboard-list mr-3 text-indigo-600"></i>
                            {existingQuiz ? 'Editar' : 'Criar'} Quiz
                        </h2>
                        {existingQuiz?.id && (
                            <button
                                onClick={loadReports}
                                disabled={isLoadingReports}
                                className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-amber-100 transition-all"
                            >
                                <i className={`fas ${isLoadingReports ? 'fa-spinner fa-spin' : 'fa-bug'}`}></i>
                                Erros
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Título do Quiz</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Ex: Avaliação de Introdução"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nota de Aprovação (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={passingScore}
                                        onChange={e => setPassingScore(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MÉTODO DE SELEÇÃO</div>
                                    <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                        {usePool ? 'Banco de Questões' : 'Seleção Manual'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setUsePool(!usePool)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${usePool ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600'}`}
                                >
                                    Alternar
                                </button>
                            </div>

                            {usePool && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Qtde Questões</label>
                                            <input
                                                type="number"
                                                value={questionsCount || ''}
                                                onChange={e => setQuestionsCount(Number(e.target.value))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Ex: 5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dificuldade</label>
                                            <select
                                                value={poolDifficulty || ''}
                                                onChange={e => setPoolDifficulty((e.target.value || null) as any)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">Todas</option>
                                                <option value="easy">Fácil</option>
                                                <option value="medium">Média</option>
                                                <option value="hard">Difícil</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    {usePool ? (
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Preview do Banco</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Questões que combinam com os filtros ({bankPreview.length})</p>
                                </div>
                                <button
                                    onClick={loadBankPreview}
                                    disabled={isLoadingBank}
                                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                                >
                                    <i className={`fas fa-sync-alt ${isLoadingBank ? 'animate-spin' : ''}`}></i>
                                    Atualizar Preview
                                </button>
                            </div>

                            {isLoadingBank ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando com o Banco...</span>
                                </div>
                            ) : bankPreview.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bankPreview.slice(0, 6).map((q, idx) => (
                                        <div key={idx} className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all group">
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{q.questionText}</p>
                                                    <div className="flex gap-2">
                                                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600' : q.difficulty === 'hard' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {q.difficulty || 'Média'}
                                                        </span>
                                                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-tighter">
                                                            {q.options.length} Alternativas
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {bankPreview.length > 6 && (
                                        <div className="md:col-span-2 p-4 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">... e mais {bankPreview.length - 6} questões similares disponíveis</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <i className="fas fa-database text-2xl"></i>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nenhuma questão encontrada</h4>
                                    <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto font-medium">Não encontramos questões que correspondam aos filtros nesta aula ou nos contextos superiores.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Questões Manuais</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Total de {questions.length} questões definidas</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleGenerateAi}
                                        disabled={isGenerating.active}
                                        className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2 group border border-purple-100 dark:border-purple-800/30"
                                    >
                                        <i className={`fas ${isGenerating.active ? 'fa-spinner fa-spin' : 'fa-magic'} group-hover:rotate-12 transition-transform`}></i>
                                        {isGenerating.active ? 'Processando IA...' : 'Gerar com IA'}
                                    </button>
                                    <button
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                                    >
                                        <i className="fas fa-code"></i>
                                        Importar JSON
                                    </button>
                                    <button
                                        onClick={handleSyncManualQuestions}
                                        className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 border border-amber-100 dark:border-amber-800/30"
                                        title="Sincronizar todas as questões manuais desta aula com o banco global"
                                    >
                                        <i className="fas fa-sync-alt"></i>
                                        Sincronizar com Banco
                                    </button>
                                    <button
                                        onClick={addQuestion}
                                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        <i className="fas fa-plus mr-2"></i>
                                        Nova Questão
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {questions.map((q, qIdx) => (
                                    <div key={qIdx} className="group relative p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500/40 transition-all">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-500/20">
                                                    {qIdx + 1}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuração da Pergunta</span>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(qIdx)}
                                                className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ENUNCIADO DA QUESTÃO</label>
                                                <textarea
                                                    value={q.questionText}
                                                    onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                                                    placeholder="Digite o enunciado da questão..."
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">ALTERNATIVAS</label>
                                                    <button
                                                        onClick={() => addOption(qIdx)}
                                                        className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                                                    >
                                                        <i className="fas fa-plus mr-1"></i> Adicionar Opção
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt: any, optIdx: number) => (
                                                        <div key={optIdx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <button
                                                                onClick={() => {
                                                                    // Reset all and toggle this one
                                                                    const updatedQ = { ...questions[qIdx] };
                                                                    updatedQ.options = updatedQ.options.map((o: any, i: number) => ({
                                                                        ...o,
                                                                        isCorrect: i === optIdx
                                                                    }));
                                                                    updateQuestion(qIdx, 'options', updatedQ.options);
                                                                }}
                                                                className={`w-10 h-10 rounded-xl border-2 flex-shrink-0 flex items-center justify-center transition-all ${opt.isCorrect
                                                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300'
                                                                    }`}
                                                            >
                                                                {opt.isCorrect ? <i className="fas fa-check text-xs"></i> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt.optionText}
                                                                onChange={e => updateOption(qIdx, optIdx, 'optionText', e.target.value)}
                                                                className={`flex-1 px-5 py-3 rounded-xl border transition-all text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${opt.isCorrect
                                                                    ? 'bg-emerald-50/30 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                                    }`}
                                                                placeholder={`Opção ${optIdx + 1}`}
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button
                                                                    onClick={() => removeOption(qIdx, optIdx)}
                                                                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <i className="fas fa-times-circle"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {questions.length === 0 && (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <i className="fas fa-pencil-alt text-2xl"></i>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nenhuma questão manual</h4>
                                        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto font-medium">Clique em "Nova Questão" para adicionar conteúdo ou use o Gerador de IA.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl flex items-center justify-end gap-4 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 py-3.5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-circle-notch animate-spin"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save text-xs"></i>
                                Salvar Quiz
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* AI Generator Overlay */}
            {isGenerating.active && (
                <div className="fixed inset-0 z-[400] bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-sm text-white text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center mx-auto">
                                <i className="fas fa-magic text-4xl animate-pulse"></i>
                            </div>
                            <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Magia em Execução</h3>
                            <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest">
                                {isGenerating.stage === 'extracting-pdfs' ? 'Extraindo conteúdo dos PDFs...' :
                                    isGenerating.stage === 'calling-ai' ? 'Consultando Professor AI...' :
                                        'Formatando questões...'}
                            </p>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-400 transition-all duration-1000 ease-out"
                                style={{ width: `${isGenerating.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* AI Preview Modal */}
            {pendingQuestions && (
                <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-purple-200 dark:border-purple-900/30">
                        <div className="p-8 bg-purple-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Descoberta IA</h3>
                                <p className="text-xs font-bold text-purple-100 uppercase tracking-widest mt-1">Revisão Sugerida ({pendingQuestions.length} Questões)</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <i className="fas fa-check-double"></i>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-6">
                            {(pendingQuestions || []).map((q, i) => (
                                <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-[10px]">{i + 1}</div>
                                        <p className="font-bold text-sm leading-relaxed text-slate-800 dark:text-slate-100">{q.questionText}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 pl-9">
                                        {q.options.map((o: any, j: number) => (
                                            <div key={j} className={`text-xs p-3 rounded-xl border ${o.isCorrect
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                                                }`}>
                                                <div className="flex items-center gap-2">
                                                    <i className={`fas ${o.isCorrect ? 'fa-check-circle' : 'fa-circle text-[6px] opacity-30'}`}></i>
                                                    {o.optionText}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex gap-4">
                            <button
                                onClick={() => setPendingQuestions(null)}
                                className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                            >
                                Rejeitar Tudo
                            </button>
                            <button
                                onClick={handleAcceptAiQuestions}
                                className="flex-2 px-10 py-4 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-600/20 transition-all active:scale-95"
                            >
                                Importar {pendingQuestions?.length || 0} Questões
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Modal */}
            {showReports && (
                <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-amber-200 dark:border-amber-900/30">
                        <div className="p-8 bg-amber-500 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Feedback dos Alunos</h3>
                                <p className="text-xs font-bold text-amber-100 uppercase tracking-widest mt-1">{reports.length} Incidentes Reportados</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <i className="fas fa-bug text-xl"></i>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 space-y-4">
                            {reports.length === 0 ? (
                                <div className="text-center py-10 opacity-40">
                                    <i className="fas fa-check-circle text-4xl mb-4"></i>
                                    <p className="font-black uppercase tracking-widest text-[10px]">Nenhum problema reportado</p>
                                </div>
                            ) : (
                                reports.map((r, i) => (
                                    <div key={i} className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-1 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest">
                                                {r.issueType}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400">
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">"{r.comment}"</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowReports(false)}
                                className="px-8 py-3 rounded-xl bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation */}
            {questionToDeleteIndex !== null && (
                <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="p-10 text-center space-y-8">
                            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <i className="fas fa-trash-alt text-4xl text-red-500"></i>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Remover?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    Esta pergunta será removida localmente. Para efetivar no banco, <b>salve o quiz</b> após confirmar.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setQuestionToDeleteIndex(null)}
                                    className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmRemoveQuestion}
                                    className="px-6 py-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* JSON Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Importar Questões via JSON</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cole o código formatado abaixo</p>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <i className="fas fa-info-circle"></i>
                                    Formato Esperado
                                </div>
                                <code className="text-[11px] block whitespace-pre bg-white/50 dark:bg-black/20 p-3 rounded-lg overflow-x-auto text-slate-600 dark:text-indigo-300">
                                    {`[
  {
    "questionText": "Qual a capital da França?",
    "points": 1,
    "options": [
      { "optionText": "Paris", "isCorrect": true },
      { "optionText": "Londres", "isCorrect": false }
    ]
  }
]`}
                                </code>
                            </div>

                            <textarea
                                value={importRawJson}
                                onChange={(e) => setImportRawJson(e.target.value)}
                                placeholder="Cole seu JSON aqui..."
                                className="w-full h-64 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImportJson}
                                disabled={!importRawJson.trim()}
                                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Processar e Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizEditor;
