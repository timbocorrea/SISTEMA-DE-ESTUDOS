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

    if (!isOpen) return null;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questionCount) * 100;
    const isLastQuestion = currentQuestionIndex === quiz.questionCount - 1;
    const hasAnsweredCurrent = !!answers[currentQuestion.id];

    const handleSelectOption = (questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questionCount - 1) {
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
        const allAnswered = quiz.questions.every(q => answers[q.id]);

        if (!allAnswered) {
            alert('Por favor, responda todas as perguntas antes de enviar.');
            return;
        }

        onSubmit(answers);
    };

    const answeredCount = Object.keys(answers).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
                                Pergunta {currentQuestionIndex + 1} de {quiz.questionCount}
                            </span>
                            <span className="text-xs text-slate-500">
                                {answeredCount}/{quiz.questionCount} respondidas
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
                        <div className="mb-6">
                            <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full mb-4">
                                {currentQuestion.points} {currentQuestion.points === 1 ? 'ponto' : 'pontos'}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                                {currentQuestion.questionText}
                            </h3>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options
                                .sort((a, b) => a.position - b.position)
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

                        <div className="flex gap-1">
                            {quiz.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentQuestionIndex
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
                                disabled={isSubmitting || answeredCount < quiz.questionCount}
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
                                        Enviar Respostas
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
