import React from 'react';
import { Course, Module, Lesson } from '../domain/entities';
import { AchievementsList } from './AchievementsList';

interface CourseOverviewProps {
    user: any;
    activeCourse: Course | null;
    onSelectLesson: (lesson: Lesson) => void;
    onSelectModule: (module: Module) => void;
}

const CourseOverview: React.FC<CourseOverviewProps> = ({ user, activeCourse, onSelectLesson }) => {
    if (!activeCourse) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 font-light tracking-wide animate-pulse">
                Selecione um curso para iniciar a jornada.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            <header className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 md:p-10 shadow-lg text-center md:text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                        {activeCourse.title}
                    </h2>
                    <div className="h-1.5 w-24 bg-indigo-500 rounded-full md:mx-0 mx-auto mt-4 opacity-90 shadow-sm shadow-indigo-500/20" />
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Modules (Takes 2/3 width) */}
                <div className="xl:col-span-2 space-y-8">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">
                        Módulos do Curso
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeCourse.modules?.map((module: Module, index: number) => {
                            const totalLessons = module.lessons.length;
                            const completedLessons = module.lessons.filter(l => l.isCompleted).length;
                            const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                            return (
                                <div
                                    key={module.id}
                                    className="group relative flex flex-col h-[500px] overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1 animate-in fade-in zoom-in-95 fill-mode-backwards"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Decorative Glow */}
                                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />

                                    {/* Module Header */}
                                    <div className="p-6 border-b border-slate-100/50 dark:border-white/5 relative z-10 flex-shrink-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 tracking-wide uppercase line-clamp-2">
                                                {module.title}
                                            </h3>
                                            <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                                                {completedLessons}/{totalLessons}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="mt-1.5 text-right text-[9px] font-bold text-indigo-500">
                                            {progressPercent}% CONCLUÍDO
                                        </div>
                                    </div>

                                    {/* Lessons List - Scrollable */}
                                    <div className="flex-1 p-5 space-y-2 relative z-10 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                                        {module.lessons?.map((lesson: Lesson) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => onSelectLesson(lesson)}
                                                className="w-full text-left group/lesson relative px-3 py-2.5 rounded-xl border border-transparent hover:border-indigo-500/30 bg-white/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 flex items-center gap-3 overflow-hidden flex-shrink-0"
                                            >
                                                {/* Hover Background Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/10 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300" />

                                                {/* Icon */}
                                                <div className="relative w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 group-hover/lesson:bg-indigo-500 group-hover/lesson:text-white transition-all duration-300 group-hover/lesson:scale-110">
                                                    {lesson.isCompleted ? (
                                                        <i className="fas fa-check text-[10px] ml-0.5 text-green-500 group-hover/lesson:text-white"></i>
                                                    ) : (
                                                        <i className="fas fa-play text-[10px] ml-0.5"></i>
                                                    )}
                                                </div>

                                                {/* Text */}
                                                <span className={`relative text-xs font-medium transition-colors duration-200 line-clamp-2 ${lesson.isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300 group-hover/lesson:text-slate-900 dark:group-hover/lesson:text-white'}`}>
                                                    {lesson.title}
                                                </span>

                                                {/* Arrow */}
                                                <div className="ml-auto opacity-0 -translate-x-2 group-hover/lesson:opacity-100 group-hover/lesson:translate-x-0 transition-all duration-300 text-indigo-500">
                                                    <i className="fas fa-chevron-right text-[10px]"></i>
                                                </div>
                                            </button>
                                        ))}

                                        {(!module.lessons || module.lessons.length === 0) && (
                                            <div className="text-center py-6 text-slate-400 text-xs italic">
                                                Nenhuma aula neste módulo
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Achievements (Takes 1/3 width) */}
                <div className="xl:col-span-1 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">
                        Conquistas
                    </h3>
                    <AchievementsList user={user} course={activeCourse} columns="1" />
                </div>
            </div>
        </div>
    );
};

export default CourseOverview;
