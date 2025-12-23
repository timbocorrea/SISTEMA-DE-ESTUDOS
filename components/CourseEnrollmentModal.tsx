import React from 'react';
import { Course } from '../domain/entities';

interface CourseEnrollmentModalProps {
    course: Course;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const CourseEnrollmentModal: React.FC<CourseEnrollmentModalProps> = ({
    course,
    isOpen,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const totalDuration = course.modules.reduce((sum, module) =>
        sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.durationSeconds, 0), 0
    );

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}min`;
        return `${minutes}min`;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-graduation-cap text-3xl"></i>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-3xl font-black mb-2">{course.title}</h2>
                                <p className="text-indigo-100 text-sm">
                                    {course.description || 'Expanda seus conhecimentos com este curso completo!'}
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                <div className="text-2xl font-black">{course.modules.length}</div>
                                <div className="text-xs text-indigo-100 uppercase tracking-wider">Módulos</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                <div className="text-2xl font-black">{totalLessons}</div>
                                <div className="text-xs text-indigo-100 uppercase tracking-wider">Aulas</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                                <div className="text-2xl font-black">{formatDuration(totalDuration)}</div>
                                <div className="text-xs text-indigo-100 uppercase tracking-wider">Duração</div>
                            </div>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="overflow-y-auto max-h-[50vh] p-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <i className="fas fa-list-ul text-indigo-600"></i>
                            Conteúdo Programático
                        </h3>

                        <div className="space-y-4">
                            {course.modules.map((module, moduleIndex) => (
                                <div
                                    key={module.id}
                                    className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden"
                                >
                                    {/* Module Header */}
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-black">
                                            {moduleIndex + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white">{module.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'}
                                            </p>
                                        </div>
                                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {formatDuration(module.lessons.reduce((sum, l) => sum + l.durationSeconds, 0))}
                                        </div>
                                    </div>

                                    {/* Lessons */}
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div
                                                key={lesson.id}
                                                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300">
                                                    {lessonIndex + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {lesson.title}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    {lesson.videoUrl && <i className="fas fa-video"></i>}
                                                    {lesson.audioUrl && <i className="fas fa-headphones"></i>}
                                                    <span>{formatDuration(lesson.durationSeconds)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {course.modules.length === 0 && (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <i className="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                                <p>Conteúdo em desenvolvimento</p>
                            </div>
                        )}
                    </div>

                    {/* Footer - Actions */}
                    <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black uppercase tracking-wider shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <i className="fas fa-circle-notch animate-spin"></i>
                                        Inscrevendo...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-user-plus"></i>
                                        Confirmar Inscrição
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                            <i className="fas fa-info-circle mr-1"></i>
                            Acesso vitalício após a inscrição
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEnrollmentModal;
