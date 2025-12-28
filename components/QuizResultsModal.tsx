import React from 'react';
import { QuizAttemptResult } from '../domain/quiz-entities';

interface QuizResultsModalProps {
    result: QuizAttemptResult;
    passingScore: number;
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
}

const QuizResultsModal: React.FC<QuizResultsModalProps> = ({
    result,
    passingScore,
    isOpen,
    onClose,
    onRetry
}) => {
    if (!isOpen) return null;

    const scorePercent = Math.round(result.score);
    const isPassing = result.passed;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header com resultado */}
                <div className={`p-8 text-center ${isPassing
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600'
                    }`}>
                    <div className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <i className={`fas text-4xl text-white ${isPassing ? 'fa-trophy' : 'fa-book-open'
                            }`}></i>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2">
                        {isPassing ? 'Parabéns!' : 'Quase lá!'}
                    </h2>

                    <p className="text-white/90 text-sm font-medium">
                        {isPassing
                            ? 'Você passou no questionário!'
                            : 'Continue estudando e tente novamente'}
                    </p>
                </div>

                {/* Score Display */}
                <div className="p-8">
                    <div className="text-center mb-6">
                        <div className="relative inline-block">
                            {/* Circle Progress */}
                            <svg className="w-40 h-40 transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-slate-200 dark:text-slate-800"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - result.score / 100)}`}
                                    className={`transition-all duration-1000 ${isPassing ? 'text-green-500' : 'text-orange-500'
                                        }`}
                                    strokeLinecap="round"
                                />
                            </svg>

                            {/* Score Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-black ${isPassing ? 'text-green-600 dark:text-green-500' : 'text-orange-600 dark:text-orange-500'
                                    }`}>
                                    {scorePercent}%
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                                    Aproveitamento
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                {result.earnedPoints}/{result.totalPoints}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Pontos
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-black text-slate-900 dark:text-white">
                                {passingScore}%
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Mínimo
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <div className={`p-4 rounded-xl mb-6 ${isPassing
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                        }`}>
                        <p className={`text-sm font-medium text-center ${isPassing
                                ? 'text-green-800 dark:text-green-300'
                                : 'text-orange-800 dark:text-orange-300'
                            }`}>
                            {isPassing ? (
                                <>
                                    <i className="fas fa-check-circle mr-2"></i>
                                    Você atingiu a pontuação mínima e completou a aula com sucesso!
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Você precisa de pelo menos {passingScore}% para passar. Revise o conteúdo e tente novamente!
                                </>
                            )}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {!isPassing && onRetry && (
                            <button
                                onClick={onRetry}
                                className="flex-1 px-6 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/30"
                            >
                                <i className="fas fa-redo mr-2"></i>
                                Tentar Novamente
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className={`px-6 py-3 rounded-xl font-bold transition-colors ${isPassing
                                    ? 'flex-1 bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                        >
                            {isPassing ? (
                                <>
                                    <i className="fas fa-arrow-right mr-2"></i>
                                    Continuar
                                </>
                            ) : (
                                'Fechar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResultsModal;
