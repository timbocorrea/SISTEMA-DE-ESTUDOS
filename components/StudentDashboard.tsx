import React, { useEffect, useState } from 'react';
import { Course, User } from '../domain/entities';
import WeeklySummary from './dashboard/WeeklySummary';
import DashboardHeader from './dashboard/DashboardHeader';
import CourseCard from './dashboard/CourseCard';
import DashboardSkeleton from './skeletons/DashboardSkeleton';
import { motion } from 'framer-motion';
import { useCourse } from '../contexts/CourseContext';

interface StudentDashboardProps {
  user: User;
  courses: Course[];
  isLoading?: boolean;
  onCourseClick: (id: string) => void;
  onManageCourse?: (id: string) => void;
  onManageContent?: () => void;
  showEnrollButton?: boolean;
  enrolledCourseIds?: string[];
  sectionTitle?: string;
}

const computeCourseProgress = (course: any) => {
  const modules = course.modules || [];
  const lessons = modules.flatMap((m: any) => m.lessons);
  const total = lessons.length;
  const completed = lessons.filter((l: any) => l.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  courses,
  isLoading = false,
  onCourseClick,
  onManageCourse,
  onManageContent,
  showEnrollButton = false,
  enrolledCourseIds = [],
  sectionTitle = "Cursos da Plataforma"
}) => {
  const [viewMode, setViewMode] = React.useState<'cards' | 'minimal' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'minimal';
    }
    return 'cards';
  });

  // Real XP History Data (Last 7 days)
  const { courseService } = useCourse();
  const [xpHistory, setXpHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    courseService.getWeeklyXpHistory(user.id)
      .then((data) => {
        // data is { date: 'DD/MM', xp: number }[] for last 7 days
        const formatted = data.map((entry) => {
          const [dd, mm] = entry.date.split('/');
          // Find day of week from dd/mm
          const year = new Date().getFullYear();
          const dateObj = new Date(year, parseInt(mm) - 1, parseInt(dd));
          const dayName = days[dateObj.getDay()] || '';
          const minutes = Math.round(entry.xp / 10 * 1.2);
          return {
            date: dayName,
            fullDate: `${dayName} ${dd}/${mm}`,
            day: dd,
            month: mm,
            xp: entry.xp,
            minutes: minutes
          };
        });
        setXpHistory(formatted);
      })
      .catch((err) => {
        console.error('Failed to load XP history:', err);
        setXpHistory([]);
      });
  }, [user?.id, courseService]);

  // Calculate Course Progress for Charts
  const courseProgressData = React.useMemo(() => {
    return courses
      .filter(c => enrolledCourseIds.includes(c.id))
      .map(c => {
        const stats = computeCourseProgress(c);
        return {
          courseId: c.id,
          title: c.title,
          progress: stats.percent
        };
      });
  }, [courses, enrolledCourseIds]);

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      {/* Header - Welcome Section */}
      <DashboardHeader user={user} />

      {/* Main Content Grid (2 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">

        {/* LEFT COLUMN: Graphical Data (1/3 width) - Reordered as requested */}
        <div className="xl:col-span-1">
          <div className="sticky top-8">
            <WeeklySummary
              xpHistory={xpHistory}
              courseProgress={courseProgressData}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Courses (2/3 width) - Reordered as requested */}
        <div className="xl:col-span-2 space-y-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <i className="fas fa-graduation-cap text-indigo-500"></i>
              {sectionTitle}
            </h3>

            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="flex bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 p-1 rounded-xl backdrop-blur-sm gap-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'cards' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                  title="Visualização em Cards"
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  onClick={() => setViewMode('minimal')}
                  className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'minimal' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                  title="Visualização Minimalista"
                >
                  <i className="fas fa-th"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`min-w-[44px] min-h-[44px] p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5'}`}
                  title="Visualização em Lista"
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <DashboardSkeleton count={6} />
          ) : courses.length === 0 ? (
            <div className="bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/5 p-10 text-center">
              <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhum curso disponível ainda.</p>
              {user.role === 'INSTRUCTOR' && (
                <p className="text-sm text-slate-500 mt-2">
                  Crie um curso em <span className="font-black text-indigo-400">Gestão de Conteúdo</span>.
                </p>
              )}
            </div>
          ) : (
            <motion.div
              className={`gap-6 p-1 overflow-y-auto max-h-[700px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent pr-2 ${viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'}`} // Modified for scrollable 2-row view
              variants={containerVars}
              initial="hidden"
              animate="show"
            >
              {courses.map(course => {
                const progress = computeCourseProgress(course);
                const isEnrolled = enrolledCourseIds.includes(course.id);

                // RENDERIZAÇÃO: MODO LISTA
                if (viewMode === 'list') {
                  return (
                    <motion.div
                      key={course.id}
                      layoutId={`course-card-${course.id}`} // Manter para Shared Layout
                      variants={itemVars} // Aplicar variante
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      onClick={() => onCourseClick(course.id)}
                      className="bg-white dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg hover:border-indigo-500/30 transition-all group flex items-center gap-6 cursor-pointer relative overflow-hidden"
                    >
                      <motion.div
                        layoutId={`course-cover-${course.id}`}
                        className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative group-hover:scale-105 transition-transform duration-300"
                      >
                        {course.imageUrl ? (
                          <img src={course.imageUrl} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-white/50">
                            <i className="fas fa-book-open text-xs"></i>
                          </div>
                        )}
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          {isEnrolled && (
                            <span className="bg-emerald-300/70 text-[#002a15] border border-emerald-400/50 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-xl">
                              Inscrito
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            {course.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <i className="fas fa-layer-group text-slate-500"></i> {course.modules.length} módulos
                          </span>
                          <span className="flex items-center gap-1.5">
                            <i className="fas fa-tasks text-slate-500"></i> {progress.completed}/{progress.total} aulas
                          </span>
                        </div>
                      </div>

                      <div className="w-32 hidden sm:block">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.4)] rounded-full" style={{ width: `${progress.percent}%` }}></div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showEnrollButton && !isEnrolled
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                          : 'bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-white border border-slate-200 dark:border-white/5'
                          }`}>
                          <i className={`fas ${showEnrollButton && !isEnrolled ? 'fa-plus' : 'fa-play'}`}></i>
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                // RENDERIZAÇÃO: MODO MINIMALISTA
                if (viewMode === 'minimal') {
                  return (
                    <motion.div
                      key={course.id}
                      layoutId={`course-card-${course.id}`} // Mantém layoutId
                      variants={itemVars} // Aplicar variante
                      onClick={() => onCourseClick(course.id)}
                      className="bg-white dark:bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer transition-all group flex flex-col h-full relative"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <motion.div
                          layoutId={`course-cover-${course.id}`}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isEnrolled
                            ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                            }`}
                        >
                          {course.imageUrl ? (
                            <img src={course.imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (<i className="fas fa-book-open"></i>)}
                        </motion.div>
                        {isEnrolled && (
                          <div className="bg-emerald-300/70 text-[#002a15] border border-emerald-400/50 p-2 rounded-xl text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-xl">
                            <i className="fas fa-check-circle"></i>
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2 leading-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        {course.title}
                      </h4>

                      <div className="mt-auto space-y-3 pt-4 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Progresso</span>
                          <span className="text-slate-800 dark:text-white">{progress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.4)] rounded-full" style={{ width: `${progress.percent}%` }}></div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // RENDERIZAÇÃO: MODO CARDS (DEFAULT)
                return (
                  <motion.div key={course.id} variants={itemVars}>
                    <CourseCard
                      course={course}
                      isEnrolled={isEnrolled}
                      progress={progress.percent}
                      onClick={() => onCourseClick(course.id)}
                      onManage={user.role === 'INSTRUCTOR' ? () => onManageCourse?.(course.id) : undefined}
                      useInteractiveHoverButton={true}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
