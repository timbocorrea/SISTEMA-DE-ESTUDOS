import React, { useState } from 'react';
import { Quiz, QuizQuestion } from '../domain/quiz-entities';

interface QuizModalProps {
    quiz: Quiz;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (answers: Record<string, string>) => void;
    isSubmitting?: boolean;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, isOpen, onClose, onSubmit, isSubmitting = false }) => {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);

    // Função de embaralhamento (Fisher-Yates)
    const shuffleArray = <T,>(array: T[]): T[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportIssueType, setReportIssueType] = useState<string>('no_correct');
    const [reportComment, setReportComment] = useState('');
    const [isReporting, setIsReporting] = useState(false);

    // Inicializar e embaralhar quando o modal abrir ou o quiz mudar
    React.useEffect(() => {
        if (isOpen && quiz) {
            // Embaralhar as opções de cada pergunta
            let questionsWithShuffledOptions = quiz.questions.map(q => {
                // Ensure we are creating a valid instance to keep prototype methods
                return new QuizQuestion(
                    q.id,
                    q.quizId,
                    q.questionText,
                    q.questionType,
                    q.position,
                    q.points,
                    shuffleArray(q.options)
                );
            });

            // Embaralhar as perguntas para garantir variedade se vamos pegar um subconjunto
            questionsWithShuffledOptions = shuffleArray(questionsWithShuffledOptions);

            // Se houver limite de perguntas (Banco de Questões), pegar apenas o subconjunto
            if (quiz.questionsCount && quiz.questionsCount > 0 && quiz.questionsCount < questionsWithShuffledOptions.length) {
                questionsWithShuffledOptions = questionsWithShuffledOptions.slice(0, quiz.questionsCount);
            }

            // Reordenar por posição original? Não, pois queremos ordem aleatória em cada tentativa
            // Se quisesse ordem fixa, teríamos que ordenar aqui.

            setShuffledQuestions(questionsWithShuffledOptions);
            setAnswers({}); // Resetar respostas ao reabrir
            setCurrentQuestionIndex(0); // Voltar para primeira
        }
    }, [quiz, isOpen]);

    const handleReportIssue = async () => {
        if (!currentQuestion) return;

        setIsReporting(true);
        try {
            // Importar repository dinamicamente para evitar ciclo ou usar props
            const { createSupabaseClient } = await import('../services/supabaseClient');
            const { SupabaseCourseRepository } = await import('../repositories/SupabaseCourseRepository');

            const supabase = createSupabaseClient();
            const repo = new SupabaseCourseRepository(supabase);

            // Buscar usuário não temos aqui direto nos props, ideal seria passar user
            // Mas podemos tentar pegar da sessão se necessário, ou assumir que o parent enviará
            // POR AGORA: Vamos usar o ID do usuário logado via Supabase Auth direto
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('Usuário não autenticado');

            await repo.createQuizReport({
                quizId: quiz.id,
                questionId: currentQuestion.id,
                userId: user.id,
                issueType: reportIssueType as any,
                comment: reportComment,
                status: 'pending'
            });

            alert('Obrigado! Seu reporte foi enviado para análise.');
            setShowReportModal(false);
            setReportComment('');
            setReportIssueType('no_correct');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar reporte. Tente novamente.');
        } finally {
            setIsReporting(false);
        }
    };

    if (!isOpen) return null;

    // Se ainda não deu tempo de embaralhar (primeiro render), usar o original ou null
    const questionsToUse = shuffledQuestions.length > 0 ? shuffledQuestions : (quiz.questionsCount ? quiz.questions.slice(0, quiz.questionsCount) : quiz.questions);
    const currentQuestion = questionsToUse[currentQuestionIndex];

    if (!currentQuestion) return null; // Prevenção de erro

    const progress = ((currentQuestionIndex + 1) / questionsToUse.length) * 100;
    const isLastQuestion = currentQuestionIndex === questionsToUse.length - 1;
    const hasAnsweredCurrent = !!answers[currentQuestion.id];

    const handleSelectOption = (questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questionsToUse.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        // Verificar se todas as perguntas foram respondidas
        const allAnswered = questionsToUse.every(q => answers[q.id]);

        if (!allAnswered) {
            alert('Por favor, responda todas as perguntas antes de enviar.');
            return;
        }

        onSubmit(answers);
    };

    const answeredCount = Object.keys(answers).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative">

                {/* Report Modal Overlay */}
                {showReportModal && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-exclamation-triangle text-amber-500"></i>
                                Reportar Erro na Questão
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Qual é o problema?
                                    </label>
                                    <select
                                        value={reportIssueType}
                                        onChange={e => setReportIssueType(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                                    >
                                        <option value="no_correct">Nenhuma resposta correta</option>
                                        <option value="multiple_correct">Mais de uma resposta correta</option>
                                        <option value="confusing">Enunciado confuso/incorreto</option>
                                        <option value="other">Outro erro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Comentário (Opcional)
                                    </label>
                                    <textarea
                                        value={reportComment}
                                        onChange={e => setReportComment(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[80px]"
                                        placeholder="Descreva o erro encontrado..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReportIssue}
                                    disabled={isReporting}
                                    className="flex-1 px-4 py-2 rounded-lg font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                                >
                                    {isReporting ? 'Enviando...' : 'Enviar Reporte'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{quiz.title}</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{quiz.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                            disabled={isSubmitting}
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                Pergunta {currentQuestionIndex + 1} de {questionsToUse.length}
                            </span>
                            <span className="text-xs text-slate-500">
                                {answeredCount}/{questionsToUse.length} respondidas
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto">
                        <div className="mb-6 relative group">
                            <div className="flex justify-between items-start">
                                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full mb-4">
                                    {currentQuestion.points} {currentQuestion.points === 1 ? 'ponto' : 'pontos'}
                                </span>

                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="text-slate-400 hover:text-amber-500 transition-colors p-2"
                                    title="Reportar erro nesta questão"
                                >
                                    <i className="fas fa-flag text-xs"></i>
                                    <span className="text-xs ml-1 font-bold">Reportar Erro</span>
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                                {currentQuestion.questionText}
                            </h3>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options
                                .map(option => {
                                    const isSelected = answers[currentQuestion.id] === option.id;

                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                }`}
                                            disabled={isSubmitting}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                                    ? 'border-indigo-600 bg-indigo-600'
                                                    : 'border-slate-300 dark:border-slate-600'
                                                    }`}>
                                                    {isSelected && (
                                                        <i className="fas fa-check text-white text-xs"></i>
                                                    )}
                                                </div>
                                                <span className={`flex-1 font-medium ${isSelected
                                                    ? 'text-indigo-900 dark:text-indigo-100'
                                                    : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {option.optionText}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0 || isSubmitting}
                            className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-chevron-left mr-2"></i>
                            Anterior
                        </button>

                        <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
                            {questionsToUse.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${idx === currentQuestionIndex
                                        ? 'bg-indigo-600 w-6'
                                        : answers[q.id]
                                            ? 'bg-green-500'
                                            : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    disabled={isSubmitting}
                                    title={`Pergunta ${idx + 1}${answers[q.id] ? ' (respondida)' : ''}`}
                                />
                            ))}
                        </div>

                        {isLastQuestion ? (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || answeredCount < questionsToUse.length}
                                className="px-8 py-3 rounded-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-circle-notch animate-spin mr-2"></i>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-check-circle mr-2"></i>
                                        Enviar
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!hasAnsweredCurrent || isSubmitting}
                                className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Próxima
                                <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
