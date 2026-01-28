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
            className="group bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer flex flex-col h-full relative ring-1 ring-white/5"
            onClick={onClick}
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Course Image */}
            <motion.div
                layoutId={`course-cover-${course.id}`}
                className="relative h-48 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden flex-shrink-0"
            >
                {course.imageUrl ? (
                    <>
                        <img
                            src={course.imageUrl}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <i className="fas fa-graduation-cap text-white/20 text-6xl"></i>
                    </div>
                )}

                {/* Enrolled Badge */}
                {isEnrolled && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md text-xs font-bold shadow-lg flex items-center gap-1.5">
                        <i className="fas fa-check-circle text-emerald-400"></i>
                        <span>Inscrito</span>
                    </div>
                )}

                {/* Progress Overlay */}
                {isEnrolled && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md border-t border-white/5">
                        <div className="px-4 py-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1 font-medium uppercase tracking-wider">
                                <span>Progresso</span>
                                <span className="text-white">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Course Content */}
            <div className="p-5 flex flex-col flex-1 relative">
                <h3 className="text-lg font-black text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors drop-shadow-sm">
                    {course.title}
                </h3>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2 h-8 flex-shrink-0 leading-relaxed font-medium">
                    {course.description || 'Sem descrição disponível.'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-auto">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                        <i className="fas fa-layer-group text-slate-400"></i>
                        <span>{totalModules} {totalModules === 1 ? 'Módulo' : 'Módulos'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                        <i className="fas fa-play-circle text-slate-400"></i>
                        <span>{totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 group/btn relative overflow-hidden ${isEnrolled
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                            }`}
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isEnrolled ? (
                                <>
                                    <i className="fas fa-play"></i>
                                    Continuar
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-plus"></i>
                                    Inscrever-se
                                </>
                            )}
                        </span>
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                    </button>

                    {onManage && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onManage();
                            }}
                            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
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
