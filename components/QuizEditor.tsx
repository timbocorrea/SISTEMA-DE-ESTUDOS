import React, { useState } from 'react';
import { Quiz, QuizQuestion, QuizOption } from '../domain/quiz-entities';
import { LessonResource } from '../domain/entities';
import { toast } from 'sonner';

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
    const [poolDifficulty, setPoolDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(existingQuiz?.poolDifficulty || null);
    const [usePool, setUsePool] = useState(!!existingQuiz?.questionsCount && existingQuiz.questions.length === 0);

    // Reports State
    const [showReports, setShowReports] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

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
            if (questions.length === 0) {
                toast.warning('Adicione pelo menos uma pergunta');
                return;
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
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        <i className="fas fa-clipboard-list mr-3 text-indigo-600"></i>
                        {existingQuiz ? 'Editar' : 'Criar'} Quiz
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Título</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nota Mínima (%)</label>
                                <input type="number" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo</div>
                                    <div className="text-sm font-bold">{usePool ? 'Banco de Questões' : 'Manual'}</div>
                                </div>
                                <button onClick={() => setUsePool(!usePool)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${usePool ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    Alternar
                                </button>
                            </div>

                            {usePool && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Qtde Questões</label>
                                        <input type="number" value={questionsCount || ''} onChange={e => setQuestionsCount(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dificuldade</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[null, 'easy', 'medium', 'hard'].map((d: any) => (
                                                <button key={String(d)} onClick={() => setPoolDifficulty(d)} className={`py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${poolDifficulty === d ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                                    {d === null ? 'All' : d === 'easy' ? 'Fácil' : d === 'medium' ? 'Méd' : 'Dif'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!usePool && (
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Questões Manuais ({questions.length})</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleGenerateAi} disabled={isGenerating.active} className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-[10px] font-black uppercase hover:bg-purple-100 transition-all">
                                        <i className="fas fa-magic mr-1"></i> {isGenerating.active ? 'Gerando...' : 'IA'}
                                    </button>
                                    <button onClick={addQuestion} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-500 transition-all">
                                        <i className="fas fa-plus mr-1"></i> Novo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {questions.map((q, qIdx) => (
                                    <div key={qIdx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Pergunta {qIdx + 1}</span>
                                            <button onClick={() => removeQuestion(qIdx)} className="text-red-500 hover:text-red-600"><i className="fas fa-trash-alt text-xs"></i></button>
                                        </div>
                                        <input type="text" value={q.questionText} onChange={e => updateQuestion(qIdx, 'questionText', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Enunciado..." />

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alternativas</span>
                                                <button onClick={() => addOption(qIdx)} className="text-[10px] text-indigo-500 font-black uppercase">+ Add</button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {q.options.map((opt: any, optIdx: number) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <button onClick={() => toggleCorrect(qIdx, optIdx)} className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${opt.isCorrect ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                                                            {opt.isCorrect && <i className="fas fa-check text-[10px]"></i>}
                                                        </button>
                                                        <input type="text" value={opt.optionText} onChange={e => updateOption(qIdx, optIdx, 'optionText', e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder={`Opção ${optIdx + 1}`} />
                                                        {q.options.length > 2 && (
                                                            <button onClick={() => removeOption(qIdx, optIdx)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 hover:bg-indigo-500">
                        {isSaving ? 'Salvando...' : 'Salvar Quiz'}
                    </button>
                </div>
            </div>

            {pendingQuestions && (
                <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-purple-600 text-white rounded-t-2xl">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Preview IA: {pendingQuestions.length} Perguntas</h3>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {pendingQuestions.map((q, i) => (
                                <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <p className="font-bold text-sm">{i + 1}. {q.questionText}</p>
                                    <div className="space-y-1">
                                        {q.options.map((o: any, j: number) => (
                                            <div key={j} className={`text-xs p-2 rounded-lg ${o.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold' : 'text-slate-500'}`}>
                                                {o.isCorrect ? '✓' : '•'} {o.optionText}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                            <button onClick={() => setPendingQuestions(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-black uppercase text-[10px]">Descartar</button>
                            <button onClick={() => { setQuestions([...questions, ...pendingQuestions]); setPendingQuestions(null); }} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-black uppercase text-[10px]">Adicionar Tudo</button>
                        </div>
                    </div>
                </div>
            )}

            {showReports && (
                <div className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-amber-600">Reportes de Erro ({reports.length})</h3>
                            <button onClick={() => setShowReports(false)} className="text-slate-400"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {reports.map((r, i) => (
                                <div key={i} className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase">
                                        <span className="text-amber-600">{r.issueType}</span>
                                        <span className="text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm italic">"{r.comment}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizEditor;
