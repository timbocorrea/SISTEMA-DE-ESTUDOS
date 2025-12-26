import React, { useEffect, useState } from 'react';
import { IUserSession } from '../domain/auth';
import { Course, User } from '../domain/entities';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  courses?: Course[];
  onOpenContent?: (courseId: string, moduleId?: string, lessonId?: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  user?: User | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  session,
  activeView,
  onViewChange,
  onLogout,
  theme,
  onToggleTheme,
  user,
  courses = [],
  onOpenContent,
  onSelectLesson,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const isAdmin = session.user.role === 'INSTRUCTOR';

  // Estado de colapso com persistência
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_is_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar_is_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const [contentMenuOpen, setContentMenuOpen] = useState(activeView === 'content');
  const [coursesMenuOpen, setCoursesMenuOpen] = useState(activeView === 'courses');
  const [expandedCourseId, setExpandedCourseId] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string>('');

  useEffect(() => {
    if (activeView === 'content') {
      setContentMenuOpen(true);
    }
    if (activeView === 'courses') {
      setCoursesMenuOpen(true);
    }
  }, [activeView]);

  const level = user?.level || 3;
  const xp = user?.xp || 2450;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large' },
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy' },
    { id: 'history', label: 'Histórico', icon: 'fas fa-history' }
  ];

  return (
    <aside className={`
      ${isMobileOpen ? 'flex fixed' : 'hidden'} 
      lg:flex lg:relative 
      flex-col
      inset-y-0 left-0 
      z-[70] lg:z-0 
      ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} 
      w-72 h-full 
      bg-[#f8fafc] dark:bg-[#111827] 
      border-r border-slate-200 dark:border-slate-800 
      p-4 
      transition-all duration-300 
      group
      shadow-2xl lg:shadow-none
    `}>

      {/* Close Button Mobile */}
      <button
        onClick={onCloseMobile}
        className="absolute right-4 top-4 lg:hidden w-10 h-10 flex items-center justify-center text-slate-400"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all z-50 opacity-0 group-hover:opacity-100"
        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'} text-[10px]`}></i>
      </button>

      {/* Header */}
      <div className={`flex items-center gap-3 px-1 mb-8 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 min-w-[40px] bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 rotate-3">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <h1 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight tracking-tighter uppercase whitespace-nowrap">StudySystem</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Case Study ADS</p>
        </div>
      </div>

      {/* User Status Card */}
      <div className={`mb-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm transition-all duration-300 overflow-hidden ${isCollapsed ? 'p-2 mx-0' : 'p-4 mx-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 mb-3'}`}>
          <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-white border-2 border-white dark:border-slate-700 shadow-md transition-all ${isCollapsed ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[12px]'}`}>
            {level}
          </div>
          <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-none uppercase tracking-tight whitespace-nowrap">Nível {level}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter truncate">{1000 - xpInLevel} XP para prox.</p>
          </div>
        </div>

        {/* Progress bar hides when collapsed for cleaner look */}
        {!isCollapsed && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden animate-in fade-in duration-500">
            <div
              className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {!isCollapsed && <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 opacity-50 whitespace-nowrap">Menu Principal</p>}

        <button
          onClick={() => onViewChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === 'dashboard'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            } ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? "Dashboard" : ''}
        >
          <i className="fas fa-th-large w-5 text-center"></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Dashboard
          </span>
        </button>

        {/* Meus Cursos com Submenu */}
        <div className={`${isCollapsed ? 'mt-1 pt-1' : ''}`}>
          <button
            onClick={() => {
              setCoursesMenuOpen(open => !open);
              onViewChange('courses');
              if (isCollapsed) setIsCollapsed(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'courses'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              } ${isCollapsed ? 'justify-center' : ''}`}
            title="Meus Cursos"
          >
            <div className="flex items-center gap-3 min-w-0">
              <i className="fas fa-graduation-cap w-5 text-center"></i>
              <span className={`truncate transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Meus Cursos</span>
            </div>
            {!isCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${coursesMenuOpen ? 'rotate-180' : ''}`}></i>}
          </button>

          {!isCollapsed && coursesMenuOpen && (
            <div className="ml-7 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-1 mb-2 animate-in slide-in-from-top-2 duration-200">
              {courses.map(course => {
                const isCourseOpen = expandedCourseId === course.id;
                const modules = course.modules || [];
                return (
                  <div key={course.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setExpandedCourseId(isCourseOpen ? '' : course.id);
                        setExpandedModuleId('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-widest truncate ${isCourseOpen
                        ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {course.title}
                    </button>

                    {isCourseOpen && (
                      <div className="ml-3 pl-3 border-l border-slate-200/70 dark:border-slate-800/70 space-y-1">
                        {modules.map(module => {
                          const isModuleOpen = expandedModuleId === module.id;
                          const lessons = module.lessons || [];
                          return (
                            <div key={module.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  setExpandedModuleId(isModuleOpen ? '' : module.id);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-bold tracking-tight truncate ${isModuleOpen
                                  ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-300'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                              >
                                {module.title}
                              </button>

                              {isModuleOpen && lessons.length > 0 && (
                                <div className="ml-3 pl-3 border-l border-slate-200/70 dark:border-slate-800/70 space-y-1">
                                  {lessons.map(lesson => (
                                    <button
                                      key={lesson.id}
                                      onClick={() => {
                                        onSelectLesson?.(course.id, module.id, lesson.id);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-medium tracking-tight text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 truncate"
                                    >
                                      {lesson.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === item.id
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            <i className={`${item.icon} w-5 text-center`}></i>
            <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              {item.label}
            </span>
          </button>
        ))}

        {isAdmin && (
          <>
            {!isCollapsed && <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 mb-4 opacity-50 whitespace-nowrap">Administração</p>}

            {/* Admin Section Container */}
            <div className={`${isCollapsed ? 'mt-4 border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
              <button
                onClick={() => {
                  setContentMenuOpen(open => !open);
                  onViewChange('content');
                  // Auto-expand sidebar logic is optional, removing strict dependency for cleaner UX
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'content'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title="Gestão de Conteúdo"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fas fa-file-alt w-5 text-center"></i>
                  <span className={`truncate transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Gestão de Conteúdo</span>
                </div>
                {!isCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${contentMenuOpen ? 'rotate-180' : ''}`}></i>}
              </button>

              {/* Submenu Tree (Only visible if expanded) */}
              {!isCollapsed && contentMenuOpen && (
                <div className="ml-7 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-1 mb-2 animate-in slide-in-from-top-2 duration-200">
                  {courses.map(course => {
                    const isCourseOpen = expandedCourseId === course.id;
                    const modules = course.modules || [];
                    return (
                      <div key={course.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setExpandedCourseId(isCourseOpen ? '' : course.id);
                            setExpandedModuleId('');
                            onOpenContent?.(course.id);
                            onViewChange('content');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-widest truncate ${isCourseOpen
                            ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          {course.title}
                        </button>

                        {isCourseOpen && (
                          <div className="ml-3 pl-3 border-l border-slate-200/70 dark:border-slate-800/70 space-y-1">
                            {modules.map(module => {
                              const isModuleOpen = expandedModuleId === module.id;
                              const lessons = module.lessons || [];
                              return (
                                <div key={module.id} className="space-y-1">
                                  <button
                                    onClick={() => {
                                      setExpandedModuleId(isModuleOpen ? '' : module.id);
                                      onOpenContent?.(course.id, module.id);
                                      onViewChange('content');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-bold tracking-tight truncate ${isModuleOpen
                                      ? 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-300'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                    {module.title}
                                  </button>

                                  {isModuleOpen && lessons.length > 0 && (
                                    <div className="ml-3 pl-3 border-l border-slate-200/70 dark:border-slate-800/70 space-y-1">
                                      {lessons.map(lesson => (
                                        <button
                                          key={lesson.id}
                                          onClick={() => {
                                            onOpenContent?.(course.id, module.id, lesson.id);
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-medium tracking-tight text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 truncate"
                                        >
                                          {lesson.title}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {isModuleOpen && lessons.length === 0 && (
                                    <div className="px-3 py-2 text-[11px] text-slate-400 italic">Sem aulas</div>
                                  )}
                                </div>
                              );
                            })}
                            {modules.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-400 italic">Sem módulos</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {courses.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-400">Nenhum curso</div>}
                </div>
              )}

              <button
                onClick={() => onViewChange('users')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight ${activeView === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isCollapsed ? 'justify-center' : ''}`}
                title="Controle de Usuários"
              >
                <i className="fas fa-users w-5 text-center"></i>
                <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Controle de Usuários
                </span>
              </button>
            </div>
          </>
        )}
      </nav>

      <div className={`mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-800 transition-all ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold ${isCollapsed ? 'justify-center' : ''}`}
          title={theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
        >
          <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'} w-5 text-center`}></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            {theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
          </span>
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all text-sm font-bold ${isCollapsed ? 'justify-center' : ''}`}
          title="Encerrar Sessão"
        >
          <i className="fas fa-sign-out-alt w-5 text-center"></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Encerrar Sessão
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
