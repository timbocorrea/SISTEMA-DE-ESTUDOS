import React from 'react';
import { Course, User } from '../domain/entities';
import LevelProgressCircle from './LevelProgressCircle';

interface StudentDashboardProps {
  user: User;
  courses: Course[];
  onCourseClick: (id: string) => void;
  onManageCourse?: (id: string) => void;
  onManageContent?: () => void;
  showEnrollButton?: boolean;  // Se deve mostrar botão de inscrever
  enrolledCourseIds?: string[];  // IDs dos cursos inscritos (para badges)
  sectionTitle?: string; // Título da seção de cursos
}

const GamificationStats: React.FC<{ user: User }> = ({ user }) => {
  // Usar métodos do domínio (Rich Domain Model) em vez de cálculos locais
  const progressPercent = user.calculateLevelProgress();
  const xpRemaining = user.getRemainingXpForNextLevel();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-8 transition-all hover:shadow-md">
      {/* Componente de círculo de progresso (SRP - Single Responsibility) */}
      <LevelProgressCircle level={user.level} progressPercent={progressPercent} />

      <div className="flex-1 w-full space-y-3 md:space-y-4">
        <div className="flex justify-between items-center md:items-end">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <i className="fas fa-bolt text-yellow-500"></i>
              <span className="hidden md:inline">Sua Progressão Acadêmica</span>
              <span className="md:hidden">Progresso Acadêmico</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="md:hidden bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Nv. {user.level}</span>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                XP Total: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user.xp.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              {xpRemaining} XP para o próximo
            </div>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.floor(progressPercent)}%</span>
          </div>
        </div>

        <div className="relative w-full h-3 md:h-5 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden p-0.5 md:p-1 border border-slate-200 dark:border-slate-700 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-xl transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const computeCourseProgress = (course: Course) => {
  const lessons = course.modules.flatMap(m => m.lessons);
  const total = lessons.length;
  const completed = lessons.filter(l => l.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  courses,
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

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Meu Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Olá, {user.name.split(' ')[0]}! 👋 Vamos aprender algo novo hoje?
          </p>
        </div>
        {user.role === 'INSTRUCTOR' && (
          <button
            onClick={onManageContent}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20"
          >
            <i className="fas fa-tools mr-2"></i> Gestão de Conteúdo
          </button>
        )}
      </div>

      <GamificationStats user={user} />

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <i className="fas fa-graduation-cap text-indigo-500"></i>
            {sectionTitle}
          </h3>
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

        {courses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <p className="text-slate-600 dark:text-slate-300 font-bold">Nenhum curso disponível ainda.</p>
            {user.role === 'INSTRUCTOR' && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Crie um curso em <span className="font-black">Gestão de Conteúdo</span>.
              </p>
            )}
          </div>
        ) : (
          <div className={`gap-6 ${viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4'}`}>
            {courses.map(course => {
              const progress = computeCourseProgress(course);
              const isEnrolled = enrolledCourseIds.includes(course.id);

              // RENDERIZAÇÃO: MODO LISTA
              if (viewMode === 'list') {
                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex items-center gap-6"
                  >
                    <div
                      onClick={() => onCourseClick(course.id)}
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 relative cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {course.imageUrl ? (
                        <img src={course.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center text-white">
                          <i className="fas fa-book-open text-xs"></i>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {isEnrolled && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">
                            Inscrito
                          </span>
                        )}
                        <h4 className="font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
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
                      <button
                        onClick={() => onCourseClick(course.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showEnrollButton && !isEnrolled
                          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400'
                          }`}
                      >
                        <i className={`fas ${showEnrollButton && !isEnrolled ? 'fa-plus' : 'fa-play'}`}></i>
                      </button>
                    </div>
                  </div>
                );
              }

              // RENDERIZAÇÃO: MODO MINIMALISTA
              if (viewMode === 'minimal') {
                return (
                  <div
                    key={course.id}
                    onClick={() => onCourseClick(course.id)}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isEnrolled
                        ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                        <i className="fas fa-book-open"></i>
                      </div>
                      {isEnrolled && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-xl text-xs">
                          <i className="fas fa-check-circle"></i>
                        </div>
                      )}
                    </div>

                    <h4 className="font-extrabold text-slate-800 dark:text-white text-lg mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
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
                  </div>
                );
              }

              // RENDERIZAÇÃO: MODO CARDS (PADRÃO)
              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg dark:hover:border-slate-700 transition-all group flex flex-col"
                >
                  <div
                    onClick={() => onCourseClick(course.id)}
                    className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer"
                  >
                    {course.imageUrl ? (
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 via-violet-600/40 to-slate-900" />
                    )}

                    {/* Gradient Overlay for text readability if needed, or visual depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {!course.imageUrl && (
                      <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center text-white text-sm backdrop-blur-sm shadow-lg">
                        <i className="fas fa-book-open"></i>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-800 dark:text-white flex items-center gap-1 shadow-sm z-10">
                      <i className="fas fa-layer-group text-indigo-500 text-[8px]"></i> {course.modules.length}
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col space-y-2">
                    {/* Badge "Inscrito" se estiver inscrito */}
                    {isEnrolled && (
                      <span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide w-fit flex items-center gap-0.5">
                        <i className="fas fa-check-circle text-[7px]"></i> Inscrito
                      </span>
                    )}

                    <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide w-fit">
                      {progress.completed}/{progress.total} aulas
                    </span>

                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {course.description || 'Sem descrição.'}
                    </p>

                    <div className="space-y-1 mt-auto">
                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-wide">
                        <span>Progresso: {progress.percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress.percent}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {/* Lógica condicional de botões */}
                      {showEnrollButton && !isEnrolled ? (
                        // Botão de INSCREVER (Dashboard - não inscrito)
                        <button
                          onClick={() => onCourseClick(course.id)}
                          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl font-black transition-all shadow-md shadow-green-500/20 active:scale-95 text-[10px] uppercase tracking-wide"
                        >
                          <i className="fas fa-user-plus mr-1 text-[8px]"></i>
                          Inscrever-se
                        </button>
                      ) : (
                        // Botão de CONTINUAR (Meus Cursos ou já inscrito)
                        <button
                          onClick={() => onCourseClick(course.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl font-black transition-all shadow-md shadow-indigo-500/20 active:scale-95 text-[10px] uppercase tracking-wide"
                        >
                          Continuar
                        </button>
                      )}

                      {user.role === 'INSTRUCTOR' && (
                        <button
                          onClick={() => (onManageCourse ? onManageCourse(course.id) : onManageContent?.())}
                          className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white py-2 rounded-xl font-black transition-all active:scale-95 text-[10px] uppercase tracking-wide"
                        >
                          <i className="fas fa-pen mr-1 text-[8px]"></i> Gerenciar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;

