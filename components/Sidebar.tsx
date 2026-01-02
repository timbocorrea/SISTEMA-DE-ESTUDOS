import React, { useEffect, useState } from 'react';
import { IUserSession } from '../domain/auth';
import { Course, User } from '../domain/entities';
import { SupportDialog } from './SupportDialog';
import { AdminService } from '../services/AdminService';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string, keepMobileOpen?: boolean) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  courses?: Course[];
  onOpenContent?: (courseId: string, moduleId?: string, lessonId?: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  user?: User | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeLessonId?: string; // ID da aula sendo editada no Content Editor
  onNavigateFile?: (path: string) => void;
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
  onCloseMobile,
  activeLessonId,
  onNavigateFile
}) => {
  const isAdmin = session.user.role === 'INSTRUCTOR';

  /* Sidebar Expanded by Default */
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false); // Support Dialog State

  // Removido o useEffect de persistência para garantir que sempre inicie fechado

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

  const isActuallyCollapsed = isMobileOpen === true ? false : isCollapsed;

  const level = user?.level ?? 1;
  const xp = user?.xp ?? 0;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const menuItems = [
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy' },
    { id: 'history', label: 'Histórico', icon: 'fas fa-history' }
  ];

  return (
    <aside
      onClick={(e) => {
        // Toggle collapse quando clicar no sidebar (exceto mobile e se clicar em botões/links)
        if (!isMobileOpen && window.innerWidth >= 1024) {
          const target = e.target as HTMLElement;
          // Não toggle se clicar em botão, link, ou input
          if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
            setIsCollapsed(!isCollapsed);
          }
        }
      }}
      className={`
      ${isMobileOpen ? 'flex fixed' : 'hidden'} 
      lg:flex lg:relative 
      flex-col
      inset-y-0 left-0 
      z-[70] lg:z-0 
      ${isActuallyCollapsed ? 'lg:w-20' : 'lg:w-72'} 
      w-72 h-full 
      bg-[#e2e8f0] dark:bg-[#111827] 
      border-r border-slate-300 dark:border-slate-800 
      p-4 
      transition-all duration-300 
      group
      shadow-2xl lg:shadow-none
      cursor-pointer lg:cursor-pointer
    `}>

      {/* Close Button Mobile */}
      <button
        onClick={onCloseMobile}
        className="absolute right-4 top-4 lg:hidden w-10 h-10 flex items-center justify-center text-slate-400"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      {/* Header */}
      <div
        onClick={() => {
          onViewChange('courses');
          onCloseMobile?.();
        }}
        className={`flex items-center gap-3 px-1 mb-8 transition-all ${isActuallyCollapsed ? 'justify-center' : ''} relative cursor-pointer group/header`}
      >
        <div className="w-10 h-10 min-w-[40px] bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 rotate-3">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <h1 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight tracking-tighter uppercase whitespace-nowrap">StudySystem</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Sistema de Estudos</p>
        </div>
      </div>

      {/* User Status Card */}
      <div className={`mb-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm transition-all duration-300 overflow-hidden ${isActuallyCollapsed ? 'p-2 mx-0' : 'p-4 mx-0'}`}>
        <div className={`flex items-center ${isActuallyCollapsed ? 'justify-center' : 'gap-3 mb-3'}`}>
          <div className={`rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-white border-2 border-white dark:border-slate-700 shadow-md transition-all ${isActuallyCollapsed ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[12px]'}`}>
            {level}
          </div>
          <div className={`flex-1 overflow-hidden transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-none uppercase tracking-tight whitespace-nowrap">Nível {level}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter truncate">{1000 - xpInLevel} XP para prox.</p>
          </div>
        </div>

        {/* Progress bar hides when collapsed for cleaner look */}
        {!isActuallyCollapsed && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden animate-in fade-in duration-500">
            <div
              className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {!isActuallyCollapsed && <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 opacity-50 whitespace-nowrap">Menu Principal</p>}

        <button
          onClick={() => onViewChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === 'dashboard'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            } ${isActuallyCollapsed ? 'justify-center' : ''}`}
          title={isActuallyCollapsed ? "Dashboard" : ''}
        >
          <i className="fas fa-th-large w-5 text-center"></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Dashboard
          </span>
        </button>

        {/* Meus Cursos com Submenu */}
        <div className={`${isActuallyCollapsed ? 'mt-1 pt-1' : ''}`}>
          <button
            onClick={() => {
              setCoursesMenuOpen(open => !open);
              onViewChange('courses', true);
              if (isActuallyCollapsed) setIsCollapsed(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'courses'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              } ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title="Meus Cursos"
          >
            <div className="flex items-center gap-3 min-w-0">
              <i className="fas fa-graduation-cap w-5 text-center"></i>
              <span className={`truncate transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Meus Cursos</span>
            </div>
            {!isActuallyCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${coursesMenuOpen ? 'rotate-180' : ''}`}></i>}
          </button>

          {!isActuallyCollapsed && coursesMenuOpen && (
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
                                  {lessons.map(lesson => {
                                    const isActiveLesson = activeLessonId === lesson.id;
                                    return (
                                      <button
                                        key={lesson.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectLesson?.(course.id, module.id, lesson.id);
                                          onCloseMobile?.();
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-medium tracking-tight truncate ${isActiveLesson
                                          ? 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm border border-indigo-600/30'
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                          }`}
                                      >
                                        {isActiveLesson && <i className="fas fa-play-circle mr-2 text-indigo-600 dark:text-indigo-400"></i>}
                                        {lesson.title}
                                      </button>
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
              } ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title={isActuallyCollapsed ? item.label : ''}
          >
            <i className={`${item.icon} w-5 text-center`}></i>
            <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              {item.label}
            </span>
          </button>
        ))}

        {isAdmin && (
          <>
            {!isActuallyCollapsed && <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 mb-4 opacity-50 whitespace-nowrap">Administração</p>}

            {/* Admin Section Container */}
            <div className={`${isActuallyCollapsed ? 'mt-4 border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
              <button
                onClick={() => {
                  setContentMenuOpen(open => !open);
                  onViewChange('content', true);
                  // Auto-expand sidebar logic is optional, removing strict dependency for cleaner UX
                  if (isActuallyCollapsed) setIsCollapsed(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'content'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Gestão de Conteúdo"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className="fas fa-file-alt w-5 text-center"></i>
                  <span className={`truncate transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Gestão de Conteúdo</span>
                </div>
                {!isActuallyCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${contentMenuOpen ? 'rotate-180' : ''}`}></i>}
              </button>

              {/* Submenu Tree (Only visible if expanded) */}
              {!isActuallyCollapsed && contentMenuOpen && (
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
                                      {lessons.map(lesson => {
                                        const isActiveLesson = activeLessonId === lesson.id;
                                        return (
                                          <button
                                            key={lesson.id}
                                            onClick={() => {
                                              onOpenContent?.(course.id, module.id, lesson.id);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-all text-[11px] font-medium tracking-tight truncate ${isActiveLesson
                                              ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm border border-emerald-600/30'
                                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                              }`}
                                          >
                                            {isActiveLesson && <i className="fas fa-pencil-alt mr-2 text-emerald-600 dark:text-emerald-400"></i>}
                                            {lesson.title}
                                          </button>
                                        );
                                      })}
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
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight ${activeView === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Controle de Usuários"
              >
                <i className="fas fa-users w-5 text-center"></i>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Controle de Usuários
                </span>
              </button>

              {/* Arquivos Menu with Subfolders */}
              <div>
                <button
                  onClick={() => {
                    // Toggle if already active view or collapsed
                    if (activeView === 'files') {
                      // Only toggle menu
                    }
                    onViewChange('files');
                    // Add state for file menu open? Reuse contentMenuOpen or new state?
                    // Let's reuse a simple local toggle or just expanded by default when active
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'files' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Gerenciar Arquivos"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <i className="fas fa-folder-open w-5 text-center"></i>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                      Arquivos
                    </span>
                  </div>
                  {!isActuallyCollapsed && activeView === 'files' && <i className="fas fa-chevron-down text-xs"></i>}
                </button>

                {!isActuallyCollapsed && activeView === 'files' && (
                  <div className="ml-7 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-1 mb-2 animate-in slide-in-from-top-2 duration-200">
                    {['audios', 'course-covers', 'images', 'pdfs'].map(folder => (
                      <button
                        key={folder}
                        onClick={() => onNavigateFile?.(folder)}
                        className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 capitalize"
                      >
                        <i className="fas fa-folder mr-2 text-yellow-500"></i>
                        {folder}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onViewChange('access')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'access' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Acesso aos Cursos"
              >
                <i className="fas fa-lock w-5 text-center"></i>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Acesso aos Cursos
                </span>
              </button>

              <button
                onClick={() => onViewChange('system-health')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'system-health' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Saúde do Sistema"
              >
                <i className="fas fa-heartbeat w-5 text-center"></i>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Saúde do Sistema
                </span>
              </button>

              <button
                onClick={() => onViewChange('settings')}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${activeView === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Configuração do Suporte"
              >
                <i className="fas fa-cogs w-5 text-center"></i>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Configuração do Suporte
                </span>
              </button>
            </div>
          </>
        )}
      </nav>

      <div className={`mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-800 transition-all ${isActuallyCollapsed ? 'flex flex-col items-center' : ''}`}>

        {/* Support Button */}
        <button
          onClick={() => setIsSupportOpen(true)}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold ${isActuallyCollapsed ? 'justify-center' : ''}`}
          title="Suporte Técnico"
        >
          <i className="fas fa-headset w-5 text-center"></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Suporte
          </span>
        </button>

        {/* Theme Button with Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setThemeDropdownOpen(!themeDropdownOpen);
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title="Alterar Tema"
          >
            <i className="fas fa-palette w-5 text-center"></i>
            <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              Tema
            </span>
            {!isActuallyCollapsed && (
              <i className={`fas fa-chevron-${themeDropdownOpen ? 'up' : 'down'} ml-auto text-xs`}></i>
            )}
          </button>

          {/* Dropdown Menu */}
          {themeDropdownOpen && !isActuallyCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTheme();
                  if (theme === 'dark') setThemeDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${theme === 'light'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
              >
                <i className="fas fa-sun w-4"></i>
                <span>Claro</span>
                {theme === 'light' && <i className="fas fa-check ml-auto text-xs"></i>}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTheme();
                  if (theme === 'light') setThemeDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${theme === 'dark'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
              >
                <i className="fas fa-moon w-4"></i>
                <span>Escuro</span>
                {theme === 'dark' && <i className="fas fa-check ml-auto text-xs"></i>}
              </button>
            </div>
          )}
        </div>

        {/* Logout Button with Red Glow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogout();
          }}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm font-bold group relative ${isActuallyCollapsed ? 'justify-center' : ''} hover:shadow-lg hover:shadow-red-500/20`}
          title="Encerrar Sessão"
        >
          <i className="fas fa-sign-out-alt w-5 text-center"></i>
          <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Encerrar
          </span>
        </button>
      </div>

      {/* Support Dialog */}
      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={session.user.role === 'INSTRUCTOR' ? new AdminService(new SupabaseAdminRepository()) : undefined}
      />
    </aside >
  );
};

export default Sidebar;
