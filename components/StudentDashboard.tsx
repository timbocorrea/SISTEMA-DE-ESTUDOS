import React from 'react';
import { Course, User } from '../domain/entities';
import WeeklySummary from './dashboard/WeeklySummary';
import DashboardHeader from './dashboard/DashboardHeader';
import CourseCard from './dashboard/CourseCard';
import DashboardSkeleton from './skeletons/DashboardSkeleton';
import { motion } from 'framer-motion';

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

  // Mock XP History Data (Last 7 days)
  const xpHistory = React.useMemo(() => {
    // Generate deterministic pseudo-random data based on user ID or just random for now
    // In a real app, this would come from the backend
    const today = new Date();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      // Random XP between 50 and 300, higher on weekends or random
      const baseXP = 50 + Math.floor(Math.random() * 250);
      return {
        date: days[date.getDay()],
        xp: baseXP
      };
    });
  }, []); // Static for this session

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
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Visualização em Cards"
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  onClick={() => setViewMode('minimal')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'minimal' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Visualização Minimalista"
                >
                  <i className="fas fa-th"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <p className="text-slate-600 dark:text-slate-300 font-bold">Nenhum curso disponível ainda.</p>
              {user.role === 'INSTRUCTOR' && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Crie um curso em <span className="font-black">Gestão de Conteúdo</span>.
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
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex items-center gap-6 cursor-pointer"
                    >
                      <motion.div
                        layoutId={`course-cover-${course.id}`}
                        className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative group-hover:opacity-90 transition-opacity"
                      >
                        {course.imageUrl ? (
                          <img src={course.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center text-white">
                            <i className="fas fa-book-open text-xs"></i>
                          </div>
                        )}
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          {isEnrolled && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">
                              Inscrito
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                            {course.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <i className="fas fa-layer-group"></i> {course.modules.length} módulos
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="fas fa-tasks"></i> {progress.completed}/{progress.total} aulas
                          </span>
                        </div>
                      </div>

                      <div className="w-32 hidden sm:block">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress.percent}%` }}></div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showEnrollButton && !isEnrolled
                          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400'
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
                      className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col h-full"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <motion.div
                          layoutId={`course-cover-${course.id}`}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isEnrolled
                            ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                        >
                          {course.imageUrl ? (
                            <img src={course.imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (<i className="fas fa-book-open"></i>)}
                        </motion.div>
                        {isEnrolled && (
                          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-xl text-xs">
                            <i className="fas fa-check-circle"></i>
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {course.title}
                      </h4>

                      <div className="mt-auto space-y-3 pt-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Progresso</span>
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress.percent}%` }}></div>
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
