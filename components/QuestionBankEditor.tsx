import React, { useState, useRef, useEffect } from 'react';
import { QuizQuestion, QuizOption, QuestionDifficulty } from '../domain/quiz-entities';
import { AdminService } from '../services/AdminService';
import { CourseRecord, ModuleRecord, LessonRecord } from '../domain/admin';
import { toast } from 'sonner';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1] as any,
            staggerChildren: 0.08
        }
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } }
};

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
                        const question = item.question || item.questao || item.questionText || item.text || item.prompt;
                        let optionsRaw = item.options || item.opcoes || item.choices || [];
                        if (optionsRaw && !Array.isArray(optionsRaw) && typeof optionsRaw === 'object') {
                            optionsRaw = Object.entries(optionsRaw).map(([key, val]) => ({
                                optionText: String(val),
                                isCorrect: false,
                                key: key.toLowerCase()
                            }));
                        }

                        const correctAnswerIndex = item.correctAnswerIndex !== undefined ? item.correctAnswerIndex :
                            item.resposta !== undefined ? item.resposta : -1;

                        const normalizedOptions = Array.isArray(optionsRaw) ? optionsRaw.map((opt: any, idx: number) => {
                            const isString = typeof opt === 'string';
                            const text = isString ? opt : (opt.optionText || opt.texto || opt.text || '');
                            const isCorrect = isString
                                ? String(idx) === String(correctAnswerIndex)
                                : (!!opt.isCorrect || String(idx) === String(correctAnswerIndex) || (opt.key && String(opt.key) === String(correctAnswerIndex).toLowerCase()));

                            return { optionText: text, isCorrect };
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
                }

                const validQuestions = parsed.filter(q => q.questionText?.trim() && (q.options || []).length >= 2);
                if (validQuestions.length === 0) {
                    toast.error('Nenhuma questão válida encontrada.');
                    return;
                }

                setPendingQuestions(validQuestions.map(q => ({
                    questionText: q.questionText,
                    difficulty: q.difficulty as QuestionDifficulty,
                    points: q.points,
                    options: q.options
                })));
            } catch (error) {
                toast.error('Erro ao processar arquivo.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const parseMarkdown = (content: string): any[] => {
        const questions: any[] = [];
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
                    questionText = line;
                }
            }
            if (questionText) questions.push({ questionText, options, difficulty, points });
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
        setIsSaving(true);
        try {
            for (const qData of pendingQuestions) {
                const quizOptions = qData.options.map((o: any, idx: number) =>
                    new QuizOption('', '', o.optionText, o.isCorrect, idx)
                );
                const question = new QuizQuestion('', 'BANK', qData.questionText, 'multiple_choice', 0, qData.points, quizOptions, qData.difficulty, '');
                await onSave(question, {
                    courseId: selectedCourseId || undefined,
                    moduleId: selectedModuleId || undefined,
                    lessonId: selectedLessonId || undefined
                });
            }
            toast.success('Importação concluída!');
            setPendingQuestions(null);
            onClose();
        } catch (e) {
            toast.error('Erro na importação.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!questionText.trim() || options.length < 2 || !options.some(o => o.isCorrect)) {
            toast.warning('Verifique os campos obrigatórios.');
            return;
        }
        setIsSaving(true);
        try {
            const quizOptions = options.map((o, idx) =>
                new QuizOption(existingQuestion?.options[idx]?.id || '', existingQuestion?.id || '', o.optionText, o.isCorrect, idx)
            );
            const question = new QuizQuestion(existingQuestion?.id || '', 'BANK', questionText, 'multiple_choice', 0, points, quizOptions, difficulty, imageUrl);
            await onSave(question, {
                courseId: selectedCourseId || undefined,
                moduleId: selectedModuleId || undefined,
                lessonId: selectedLessonId || undefined
            });
            toast.success('Salvo!');
            onClose();
        } catch (e) {
            toast.error('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div 
                className="glass-panel relative rounded-[2.5rem] shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <div className="noise-overlay" />
                
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-indigo-600/90 via-cyan-600/90 to-emerald-600/90 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <i className="fas fa-brain"></i>
                                </div>
                                {existingQuestion ? 'Editar Questão' : 'Nova Questão'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.md" onChange={handleFileChange} />
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleImportClick} 
                                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10"
                            >
                                <i className="fas fa-file-import mr-2"></i> Importar
                            </motion.button>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8 relative z-10 scrollbar-thin flex-1">
                    {imageUrl && (
                        <motion.div 
                            variants={itemVariants}
                            className="relative rounded-3xl overflow-hidden aspect-video bg-slate-900/50 border border-white/10 group"
                        >
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                            <button onClick={() => setImageUrl('')} className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg">
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </motion.div>
                    )}

                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-500/5 dark:bg-slate-400/5 rounded-[2rem] border border-white/10">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Curso</label>
                            <select value={selectedCourseId} onChange={(e) => handleCourseChange(e.target.value)} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none">
                                <option value="">Global</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo</label>
                            <select value={selectedModuleId} onChange={(e) => handleModuleChange(e.target.value)} disabled={!selectedCourseId} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none disabled:opacity-30">
                                <option value="">Módulo</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aula</label>
                            <select value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} disabled={!selectedModuleId} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none disabled:opacity-30">
                                <option value="">Aula</option>
                                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dificuldade</label>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-white/5">
                                {(['easy', 'medium', 'hard'] as const).map(d => (
                                    <motion.button 
                                        key={d} 
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setDifficulty(d)} 
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${difficulty === d ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pontos</label>
                            <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem</label>
                        <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enunciado</label>
                        <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Texto da questão..." className="w-full px-5 py-4 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 text-base font-bold dark:text-white min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500" />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternativas</label>
                            <button onClick={addOption} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 transition-colors">
                                + Adicionar Opção
                            </button>
                        </div>
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {options.map((opt, idx) => (
                                    <motion.div 
                                        key={idx} 
                                        layout="position" // Changed layout to layout="position"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center gap-3"
                                    >
                                        <motion.button 
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => toggleCorrect(idx)} 
                                            className={`w-12 h-12 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-300'}`}
                                        >
                                            <i className={`fas ${opt.isCorrect ? 'fa-check' : 'fa-circle text-[6px]'}`}></i>
                                        </motion.button>
                                        <input type="text" value={opt.optionText} onChange={(e) => updateOption(idx, 'optionText', e.target.value)} placeholder={`Opção ${String.fromCharCode(65 + idx)}...`} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/50 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                        {options.length > 2 && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1, color: '#f43f5e' }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => removeOption(idx)} 
                                                className="w-10 h-10 text-slate-300 transition-colors"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </motion.button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-white/50 dark:bg-slate-900/50 relative z-10 shrink-0">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-700">
                        Descartar
                    </button>
                    <motion.button 
                        whileHover={{ scale: 1.02, backgroundColor: '#4f46e5' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-indigo-600 text-white shadow-xl transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Finalizar Questão'}
                    </motion.button>
                </div>
            </motion.div>

            {/* Import Preview Modal */}
            <AnimatePresence>
                {pendingQuestions && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-panel relative w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-cyan-600/90 to-indigo-600/90 relative z-10">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <i className="fas fa-eye"></i> Revisão de Importação ({pendingQuestions.length})
                                </h3>
                            </div>
                            <div className="p-8 overflow-y-auto flex-1 space-y-4 relative z-10 scrollbar-thin">
                                <AnimatePresence mode="popLayout"> {/* Added AnimatePresence here */}
                                    {pendingQuestions.map((q, i) => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={i} 
                                            layout="position" // Changed layout to layout="position"
                                            className="glass-card p-6 rounded-[2rem] space-y-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Questão {i + 1}</span>
                                                <button onClick={() => setPendingQuestions(pendingQuestions.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500">
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-white">{q.questionText}</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {q.options.map((o: any, j: number) => (
                                                    <button key={j} onClick={() => togglePendingCorrect(i, j)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border flex items-center gap-3 transition-all ${o.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-slate-500/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>
                                                        <i className={`fas ${o.isCorrect ? 'fa-check-circle' : 'fa-circle-notch'} text-[10px]'}`}></i>
                                                        <span>{o.optionText}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence> {/* Closing AnimatePresence */}
                            </div>
                            <div className="p-8 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-white/50 dark:bg-slate-900/50 relative z-10">
                                <button onClick={() => setPendingQuestions(null)} className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                                    Cancelar
                                </button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleImportAll} 
                                    disabled={isSaving} 
                                    className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-indigo-600 text-white shadow-xl"
                                >
                                    Importar Tudo
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestionBankEditor;
