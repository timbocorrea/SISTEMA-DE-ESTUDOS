import React, { useEffect, useState, useMemo } from 'react';
import { AdminService } from '../services/AdminService';
import { createSupabaseClient } from '../services/supabaseClient';
import { SupabaseQuestionBankRepository } from '../repositories/SupabaseQuestionBankRepository';
import { QuizQuestion, QuestionDifficulty } from '../domain/quiz-entities';
import QuestionBankEditor from './QuestionBankEditor';
import { toast } from 'sonner';

interface Props {
    adminService: AdminService;
}

const QuestionnaireManagementPage: React.FC<Props> = ({ adminService }) => {
    const [courses, setCourses] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [selectedLessonId, setSelectedLessonId] = useState<string>('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | ''>('');

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBusy, setIsBusy] = useState(false);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

    const repository = useMemo(() => new SupabaseQuestionBankRepository(createSupabaseClient()), []);

    useEffect(() => {
        loadCourses();
        loadQuestions();
    }, []);

    const loadCourses = async () => {
        try {
            const list = await adminService.listCourses();
            setCourses(list);
        } catch (error) {
            console.error(error);
        }
    };

    const loadModules = async (courseId: string) => {
        if (!courseId) {
            setModules([]);
            return;
        }
        try {
            const list = await adminService.listModules(courseId);
            setModules(list);
        } catch (error) {
            console.error(error);
        }
    };

    const loadLessons = async (moduleId: string) => {
        if (!moduleId) {
            setLessons([]);
            return;
        }
        try {
            const list = await adminService.listLessons(moduleId);
            setLessons(list);
        } catch (error) {
            console.error(error);
        }
    };

    const loadQuestions = async () => {
        setIsLoading(true);
        try {
            const list = await repository.getQuestions({
                courseId: selectedCourseId || undefined,
                moduleId: selectedModuleId || undefined,
                lessonId: selectedLessonId || undefined,
                difficulty: selectedDifficulty || undefined
            });
            setQuestions(list);
        } catch (error) {
            toast.error('Erro ao carregar questões');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, [selectedCourseId, selectedModuleId, selectedLessonId, selectedDifficulty]);

    const handleCourseChange = (id: string) => {
        setSelectedCourseId(id);
        setSelectedModuleId('');
        setSelectedLessonId('');
        loadModules(id);
    };

    const handleModuleChange = (id: string) => {
        setSelectedModuleId(id);
        setSelectedLessonId('');
        loadLessons(id);
    };

    const handleSaveQuestion = async (question: QuizQuestion) => {
        setIsBusy(true);
        try {
            if (question.id) {
                await repository.updateQuestion(question, {
                    courseId: selectedCourseId || undefined,
                    moduleId: selectedModuleId || undefined,
                    lessonId: selectedLessonId || undefined
                });
            } else {
                await repository.createQuestion(question, {
                    courseId: selectedCourseId || undefined,
                    moduleId: selectedModuleId || undefined,
                    lessonId: selectedLessonId || undefined
                });
            }
            loadQuestions();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setIsBusy(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta questão?')) return;
        try {
            await repository.deleteQuestion(id);
            toast.success('Questão excluída');
            loadQuestions();
        } catch (error) {
            toast.error('Erro ao excluir questão');
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                        Admin / <span className="text-slate-400">Banco de Dados</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Questionário Centralizado</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie questões globais organizadas por curso, módulo e aula.</p>
                </div>

                <button
                    onClick={() => { setEditingQuestion(null); setIsEditorOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                    <i className="fas fa-plus"></i>
                    Nova Questão
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Curso</label>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Todos os Cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Módulo</label>
                    <select
                        value={selectedModuleId}
                        onChange={(e) => handleModuleChange(e.target.value)}
                        disabled={!selectedCourseId}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                    >
                        <option value="">Todos os Módulos</option>
                        {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Aula</label>
                    <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        disabled={!selectedModuleId}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                    >
                        <option value="">Todas as Aulas</option>
                        {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dificuldade</label>
                    <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Todas as Dificuldades</option>
                        <option value="easy">Fácil</option>
                        <option value="medium">Médio</option>
                        <option value="hard">Difícil</option>
                    </select>
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Carregando Questões...</p>
                    </div>
                ) : questions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {questions.map(q => (
                            <div key={q.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-6 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-start gap-6 min-w-0">
                                    {q.imageUrl && (
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                            <img src={q.imageUrl} alt="Questão" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                    q.difficulty === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                                        'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                                }`}>
                                                {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {q.points} Pontos
                                            </span>
                                        </div>
                                        <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{q.questionText}</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {q.options.map((opt, idx) => (
                                                <div key={idx} className={`px-3 py-1 rounded-full text-[10px] font-bold border ${opt.isCorrect
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400'
                                                        : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-500'
                                                    }`}>
                                                    {opt.isCorrect && <i className="fas fa-check-circle mr-1.5"></i>}
                                                    {opt.optionText}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-shrink-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => { setEditingQuestion(q); setIsEditorOpen(true); }}
                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <i className="fas fa-pen"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl text-slate-300 dark:text-slate-600">
                            <i className="fas fa-clipboard-question"></i>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Nenhuma questão encontrada</h3>
                            <p className="text-slate-500 text-sm">Refine seus filtros ou adicione uma nova questão ao banco.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {isEditorOpen && (
                <QuestionBankEditor
                    existingQuestion={editingQuestion}
                    hierarchy={{
                        courseId: selectedCourseId || undefined,
                        moduleId: selectedModuleId || undefined,
                        lessonId: selectedLessonId || undefined
                    }}
                    onSave={handleSaveQuestion}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    );
};

export default QuestionnaireManagementPage;
