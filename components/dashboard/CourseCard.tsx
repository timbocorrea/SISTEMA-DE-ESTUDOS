import React from 'react';
import { Course } from '../../domain/entities';
import { motion } from 'framer-motion';

interface CourseCardProps {
    course: Course;
    isEnrolled: boolean;
    progress?: number;
    onClick: () => void;
    onManage?: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
    course,
    isEnrolled,
    progress = 0,
    onClick,
    onManage
}) => {
    const totalModules = course.modules?.length || 0;
    const totalLessons = course.modules?.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0) || 0;

    return (
        <motion.div
            layoutId={`course-card-${course.id}`}
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer flex flex-col h-full"
            onClick={onClick}
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Course Image */}
            <motion.div
                layoutId={`course-cover-${course.id}`}
                className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden flex-shrink-0"
            >
                {course.imageUrl ? (
                    <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-graduation-cap text-white text-6xl opacity-50"></i>
                    </div>
                )}

                {/* Enrolled Badge */}
                {isEnrolled && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-1">
                        <i className="fas fa-check-circle"></i>
                        <span>Inscrito</span>
                    </div>
                )}

                {/* Progress Overlay */}
                {isEnrolled && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm">
                        <div className="px-4 py-2">
                            <div className="flex items-center justify-between text-xs text-white mb-1">
                                <span className="font-bold">Progresso</span>
                                <span className="font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Course Content */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-10 flex-shrink-0">
                    {course.description || 'Sem descrição disponível.'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 dark:text-slate-400 mt-auto">
                    <div className="flex items-center gap-1">
                        <i className="fas fa-layer-group"></i>
                        <span>{totalModules} {totalModules === 1 ? 'Módulo' : 'Módulos'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <i className="fas fa-book-open"></i>
                        <span>{totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 mt-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${isEnrolled
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
                            }`}
                    >
                        {isEnrolled ? (
                            <>
                                <i className="fas fa-play mr-2"></i>
                                Continuar
                            </>
                        ) : (
                            <>
                                <i className="fas fa-user-plus mr-2"></i>
                                Inscrever-se
                            </>
                        )}
                    </button>

                    {onManage && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onManage();
                            }}
                            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Gerenciar curso"
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default CourseCard;
