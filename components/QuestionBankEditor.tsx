import React, { useState, useRef, useEffect } from 'react';
import { QuizQuestion, QuizOption, QuestionDifficulty } from '../domain/quiz-entities';
import { AdminService } from '../services/AdminService';
import { CourseRecord, ModuleRecord, LessonRecord } from '../domain/admin';
import { toast } from 'sonner';

interface QuestionBankEditorProps {
    existingQuestion?: QuizQuestion | null;
    hierarchy: {
        courseId?: string;
        moduleId?: string;
        lessonId?: string;
    };
    adminService: AdminService;
    onSave: (question: QuizQuestion, h: { courseId?: string; moduleId?: string; lessonId?: string }) => Promise<void>;
    onClose: () => void;
}

const QuestionBankEditor: React.FC<QuestionBankEditorProps> = ({ existingQuestion, hierarchy, adminService, onSave, onClose }) => {
    // Current Hierarchy State - Prioritize existing question data over current filter
    const [selectedCourseId, setSelectedCourseId] = useState(existingQuestion?.courseId || hierarchy.courseId || '');
    const [selectedModuleId, setSelectedModuleId] = useState(existingQuestion?.moduleId || hierarchy.moduleId || '');
    const [selectedLessonId, setSelectedLessonId] = useState(existingQuestion?.lessonId || hierarchy.lessonId || '');

    // Lists for selectors
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [modules, setModules] = useState<ModuleRecord[]>([]);
    const [lessons, setLessons] = useState<LessonRecord[]>([]);

    const [questionText, setQuestionText] = useState(existingQuestion?.questionText || '');
    const [difficulty, setDifficulty] = useState<QuestionDifficulty>(existingQuestion?.difficulty || 'medium');
    const [imageUrl, setImageUrl] = useState(existingQuestion?.imageUrl || '');
    const [points, setPoints] = useState(existingQuestion?.points || 1);
    const [options, setOptions] = useState<any[]>(
        existingQuestion?.options.map(o => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect
        })) || [
            { optionText: '', isCorrect: true },
            { optionText: '', isCorrect: false }
        ]
    );
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingQuestions, setPendingQuestions] = useState<any[] | null>(null);

    // Load available data
    useEffect(() => {
        loadCourses();
        if (selectedCourseId) loadModules(selectedCourseId);
        if (selectedModuleId) loadLessons(selectedModuleId);
    }, []);

    const loadCourses = async () => {
        try {
            const list = await adminService.listCourses();
            setCourses(list);
        } catch (e) { console.error(e); }
    };

    const loadModules = async (cid: string) => {
        try {
            const list = await adminService.listModules(cid);
            setModules(list);
        } catch (e) { console.error(e); }
    };

    const loadLessons = async (mid: string) => {
        try {
            const list = await adminService.listLessons(mid, { summary: true });
            setLessons(list);
        } catch (e) { console.error(e); }
    };

    const handleCourseChange = (id: string) => {
        setSelectedCourseId(id);
        setSelectedModuleId('');
        setSelectedLessonId('');
        if (id) loadModules(id);
    };

    const handleModuleChange = (id: string) => {
        setSelectedModuleId(id);
        setSelectedLessonId('');
        if (id) loadLessons(id);
    };

    const addOption = () => {
        setOptions([...options, { optionText: '', isCorrect: false }]);
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, field: string, value: any) => {
        const updated = [...options];
        updated[index] = { ...updated[index], [field]: value };
        setOptions(updated);
    };

    const toggleCorrect = (index: number) => {
        const updated = options.map((opt, i) => ({
            ...opt,
            isCorrect: i === index
        }));
        setOptions(updated);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            try {
                let parsed: any[] = [];
                if (file.name.endsWith('.json')) {
                    const raw = JSON.parse(content);

                    // Handle specific structure where questions are inside a "questions" key
                    let data: any[] = [];
                    if (raw.questions && Array.isArray(raw.questions)) {
                        data = raw.questions;
                    } else {
                        data = Array.isArray(raw) ? raw : [raw];
                    }

                    // Normalize JSON formats
                    parsed = data.map((item) => {
                        // Support for multiple key variations including "prompt" (PDF extraction)
                        const question = item.question || item.questao || item.questionText || item.text || item.prompt;

                        // Detect and convert choices object { a: "...", b: "..." } to options array
                        let optionsRaw = item.options || item.opcoes || item.choices || [];
                        if (optionsRaw && !Array.isArray(optionsRaw) && typeof optionsRaw === 'object') {
                            optionsRaw = Object.entries(optionsRaw).map(([key, val]) => ({
                                optionText: String(val),
                                isCorrect: false, // Will be set by index match below
                                key: key.toLowerCase() // 'a', 'b', 'c', etc.
                            }));
                        }

                        const correctAnswerIndex = item.correctAnswerIndex !== undefined ? item.correctAnswerIndex :
                            item.resposta !== undefined ? item.resposta : -1;

                        const normalizedOptions = Array.isArray(optionsRaw) ? optionsRaw.map((opt: any, idx: number) => {
                            const isString = typeof opt === 'string';
                            const text = isString ? opt : (opt.optionText || opt.texto || opt.text || '');

                            // Check for correct answer by numeric index or letter key
                            const isCorrect = isString
                                ? String(idx) === String(correctAnswerIndex)
                                : (!!opt.isCorrect || String(idx) === String(correctAnswerIndex) || (opt.key && String(opt.key) === String(correctAnswerIndex).toLowerCase()));

                            return {
                                optionText: text,
                                isCorrect
                            };
                        }) : [];

                        return {
                            questionText: String(question || ''),
                            difficulty: (item.difficulty || item.dificuldade || 'medium').toLowerCase(),
                            points: item.points || item.pontos || 1,
                            options: normalizedOptions
                        };
                    });
                } else if (file.name.endsWith('.md')) {
                    parsed = parseMarkdown(content);
                } else {
                    toast.error('Formato de arquivo não suportado. Use .json ou .md');
                    return;
                }

                // Filter valid questions: Must have text and at least 2 options.
                const validQuestions = parsed.filter(q =>
                    q.questionText?.trim() &&
                    (q.options || []).length >= 2
                );

                if (validQuestions.length === 0) {
                    toast.error('Nenhuma questão válida encontrada. Verifique o formato do arquivo.');
                    return;
                }

                if (validQuestions.length < parsed.length) {
                    toast.warning(`${parsed.length - validQuestions.length} questões inválidas foram ignoradas.`);
                }

                setPendingQuestions(validQuestions.map(q => ({
                    questionText: q.questionText,
                    difficulty: q.difficulty as QuestionDifficulty,
                    points: q.points,
                    options: q.options
                })));
            } catch (error) {
                console.error("Erro no processamento do JSON:", error);
                toast.error('Erro ao processar arquivo JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset for next selection
    };

    const parseMarkdown = (content: string): any[] => {
        const questions: any[] = [];
        // Split by --- or by a header preceded by a newline (handles \n and \r\n) or start of string
        const sections = content.split(/---|\r?\n(?=#\s)|^(?=#\s)/).filter(Boolean);

        for (const section of sections) {
            const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) continue;

            let questionText = '';
            const options: any[] = [];
            let difficulty: QuestionDifficulty = 'medium';
            let points = 1;

            for (const line of lines) {
                if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
                    options.push({
                        optionText: line.replace(/- \[[x ]\]\s*/i, '').trim(),
                        isCorrect: line.toLowerCase().includes('[x]')
                    });
                } else if (line.match(/\[difficulty:/i)) {
                    const diffMatch = line.match(/difficulty:\s*(easy|medium|hard)/i);
                    const pointsMatch = line.match(/points:\s*(\d+)/i);
                    if (diffMatch) difficulty = diffMatch[1].toLowerCase() as any;
                    if (pointsMatch) points = parseInt(pointsMatch[1]);
                } else if (line.startsWith('#')) {
                    questionText = line.replace(/^#+\s*/, '').trim();
                } else if (!questionText && !line.startsWith('-')) {
                    // If no question text yet and not an option, assume it's the question text
                    questionText = line;
                }
            }

            if (questionText) {
                questions.push({ questionText, options, difficulty, points });
            }
        }
        return questions;
    };

    const togglePendingCorrect = (qIdx: number, oIdx: number) => {
        if (!pendingQuestions) return;
        const updated = [...pendingQuestions];
        updated[qIdx] = {
            ...updated[qIdx],
            options: updated[qIdx].options.map((opt: any, i: number) => ({
                ...opt,
                isCorrect: i === oIdx
            }))
        };
        setPendingQuestions(updated);
    };

    const handleImportAll = async () => {
        if (!pendingQuestions) return;

        // Final validation: all questions must have a correct answer
        const invalidQuestionIdx = pendingQuestions.findIndex(q => !q.options.some((o: any) => o.isCorrect));
        if (invalidQuestionIdx !== -1) {
            toast.error(`A questão ${invalidQuestionIdx + 1} não tem uma resposta correta selecionada.`);
            return;
        }

        setIsSaving(true);
        try {
            for (const qData of pendingQuestions) {
                const quizOptions = qData.options.map((o: any, idx: number) =>
                    new QuizOption('', '', o.optionText, o.isCorrect, idx)
                );

                const question = new QuizQuestion(
                    '',
                    'BANK',
                    qData.questionText,
                    'multiple_choice',
                    0,
                    qData.points,
                    quizOptions,
                    qData.difficulty,
                    ''
                );

                await onSave(question, {
                    courseId: selectedCourseId || undefined,
                    moduleId: selectedModuleId || undefined,
                    lessonId: selectedLessonId || undefined
                });
            }
            toast.success(`${pendingQuestions.length} questões importadas!`);
            setPendingQuestions(null);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao importar algumas questões.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!questionText.trim()) {
            toast.warning('O texto da questão é obrigatório');
            return;
        }

        if (options.length < 2) {
            toast.warning('Adicione pelo menos 2 opções');
            return;
        }

        if (!options.some(o => o.isCorrect)) {
            toast.warning('Selecione uma opção correta');
            return;
        }

        if (options.some(o => !o.optionText.trim())) {
            toast.warning('Todas as opções devem ter texto');
            return;
        }

        setIsSaving(true);
        try {
            const quizOptions = options.map((o, idx) =>
                new QuizOption(
                    existingQuestion?.options[idx]?.id || '', // Temporary ID if new
                    existingQuestion?.id || '',
                    o.optionText,
                    o.isCorrect,
                    idx
                )
            );

            const question = new QuizQuestion(
                existingQuestion?.id || '',
                'BANK',
                questionText,
                'multiple_choice',
                0,
                points,
                quizOptions,
                difficulty,
                imageUrl
            );

            await onSave(question, {
                courseId: selectedCourseId || undefined,
                moduleId: selectedModuleId || undefined,
                lessonId: selectedLessonId || undefined
            });
            toast.success('Questão salva com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar questão');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-cyan-600">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <i className="fas fa-edit"></i>
                            {existingQuestion ? 'Editar Questão' : 'Nova Questão'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".json,.md"
                                onChange={handleFileChange}
                            />
                            <button
                                onClick={handleImportClick}
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase transition-all flex items-center gap-2"
                                title="Importar de .json ou .md"
                            >
                                <i className="fas fa-file-import"></i>
                                Importar
                            </button>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {/* Image Preview (if URL exists) */}
                    {imageUrl && (
                        <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                            <button
                                onClick={() => setImageUrl('')}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                                <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    )}

                    {/* Hierarchy Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Curso Alvo</label>
                            <select
                                value={selectedCourseId}
                                onChange={(e) => handleCourseChange(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Nenhum Curso</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Módulo Alvo</label>
                            <select
                                value={selectedModuleId}
                                onChange={(e) => handleModuleChange(e.target.value)}
                                disabled={!selectedCourseId}
                                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Nenhum Módulo</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Aula Alvo</label>
                            <select
                                value={selectedLessonId}
                                onChange={(e) => setSelectedLessonId(e.target.value)}
                                disabled={!selectedModuleId}
                                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Nenhuma Aula</option>
                                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dificuldade</label>
                            <div className="flex gap-2">
                                {(['easy', 'medium', 'hard'] as const).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${difficulty === d
                                            ? (d === 'easy' ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' :
                                                d === 'medium' ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20' :
                                                    'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20')
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                    >
                                        {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pontos</label>
                            <input
                                type="number"
                                min="1"
                                value={points}
                                onChange={(e) => setPoints(Number(e.target.value))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="https://exemplo.com/imagem.png"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <button
                                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Fazer upload (Em breve)"
                                disabled
                            >
                                <i className="fas fa-upload"></i>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Texto da Pergunta</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Escreva sua pergunta aqui..."
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opções de Resposta</label>
                            <button
                                onClick={addOption}
                                className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                            >
                                + Adicionar Opção
                            </button>
                        </div>

                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                                    <button
                                        onClick={() => toggleCorrect(idx)}
                                        className={`w-10 h-10 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${opt.isCorrect
                                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-emerald-300 hover:text-emerald-300'
                                            }`}
                                        title={opt.isCorrect ? 'Resposta Correta' : 'Marcar como Correta'}
                                    >
                                        <i className={`fas ${opt.isCorrect ? 'fa-check' : 'fa-circle'} text-xs`}></i>
                                    </button>

                                    <input
                                        type="text"
                                        value={opt.optionText}
                                        onChange={(e) => updateOption(idx, 'optionText', e.target.value)}
                                        placeholder={`Opção ${idx + 1}`}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />

                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(idx)}
                                            className="w-10 h-10 flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <i className="fas fa-trash-alt text-sm"></i>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <i className="fas fa-circle-notch animate-spin"></i>
                        ) : (
                            'Salvar Questão'
                        )}
                    </button>
                </div>
            </div>

            {pendingQuestions && (
                <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-300">
                        {/* Preview Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-cyan-600 to-indigo-600">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <i className="fas fa-eye text-lg"></i>
                                Revisão de Importação: {pendingQuestions.length} questões
                            </h3>
                        </div>

                        {/* Preview List */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                            {pendingQuestions.map((q, i) => (
                                <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600' :
                                                q.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-rose-100 text-rose-600'
                                                }`}>
                                                {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {q.points} Pontos
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setPendingQuestions(pendingQuestions.filter((_, idx) => idx !== i))}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>

                                    <p className="font-black text-slate-800 dark:text-white leading-tight whitespace-pre-wrap">{i + 1}. {q.questionText}</p>

                                    <div className="grid grid-cols-1 gap-2">
                                        {q.options.map((o: any, j: number) => (
                                            <button
                                                key={j}
                                                onClick={() => togglePendingCorrect(i, j)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${o.isCorrect
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm'
                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <i className={`fas ${o.isCorrect ? 'fa-check-circle' : 'fa-circle'} text-[10px]`}></i>
                                                <span className="whitespace-pre-wrap">{o.optionText}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Preview Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900">
                            <button
                                onClick={() => setPendingQuestions(null)}
                                className="flex-1 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleImportAll}
                                disabled={isSaving || pendingQuestions.length === 0}
                                className="flex-1 py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <i className="fas fa-circle-notch animate-spin"></i>
                                ) : (
                                    'Importar Tudo'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBankEditor;
