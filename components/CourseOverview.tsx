import React from 'react';

interface Lesson {
    id: string;
    title: string;
}

interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
}

interface Course {
    id: string;
    title: string;
    modules: Module[];
}

interface CourseOverviewProps {
    user: any;
    activeCourse: Course | any;
    onSelectLesson: (lesson: Lesson) => void;
    onSelectModule: (module: Module) => void;
}

const CourseOverview: React.FC<CourseOverviewProps> = ({ activeCourse, onSelectLesson }) => {
    if (!activeCourse) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 font-light tracking-wide animate-pulse">
                Selecione um curso para iniciar a jornada.
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <header className="space-y-4 text-center md:text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">
                    {activeCourse.title}
                </h2>
                <div className="h-1 w-24 bg-indigo-500 rounded-full md:mx-0 mx-auto opacity-80" />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {activeCourse.modules?.map((module: Module, index: number) => (
                    <div
                        key={module.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1 animate-in fade-in zoom-in-95 fill-mode-backwards"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Decorative Glow */}
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />

                        {/* Module Header */}
                        <div className="p-8 border-b border-slate-100/50 dark:border-white/5 relative z-10">
                            <h3 className="font-bold text-lg md:text-xl text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                                {module.title}
                            </h3>
                        </div>

                        {/* Lessons List */}
                        <div className="flex-1 p-6 space-y-3 relative z-10">
                            {module.lessons?.map((lesson: Lesson) => (
                                <button
                                    key={lesson.id}
                                    onClick={() => onSelectLesson(lesson)}
                                    className="w-full text-left group/lesson relative px-4 py-3 rounded-xl border border-transparent hover:border-indigo-500/30 bg-white/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 flex items-center gap-4 overflow-hidden"
                                >
                                    {/* Hover Background Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/10 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300" />

                                    {/* Icon */}
                                    <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 group-hover/lesson:bg-indigo-500 group-hover/lesson:text-white transition-all duration-300 group-hover/lesson:scale-110">
                                        <i className="fas fa-play text-xs ml-0.5"></i>
                                    </div>

                                    {/* Text */}
                                    <span className="relative text-sm font-medium text-slate-600 dark:text-slate-300 group-hover/lesson:text-slate-900 dark:group-hover/lesson:text-white transition-colors duration-200 line-clamp-1">
                                        {lesson.title}
                                    </span>

                                    {/* Arrow */}
                                    <div className="ml-auto opacity-0 -translate-x-2 group-hover/lesson:opacity-100 group-hover/lesson:translate-x-0 transition-all duration-300 text-indigo-500">
                                        <i className="fas fa-chevron-right text-xs"></i>
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
                ))}
            </div>
        </div>
    );
};

export default CourseOverview;
