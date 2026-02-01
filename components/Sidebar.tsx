import React, { useEffect, useState } from 'react';
import { IUserSession } from '../domain/auth';
import { Course, User } from '../domain/entities';
import { SupportDialog } from './SupportDialog';
import { AdminService } from '../services/AdminService';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';
import { Link } from 'react-router-dom';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string, keepMobileOpen?: boolean) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  courses?: Course[];
  adminCourses?: Course[];
  onOpenContent?: (courseId: string, moduleId?: string, lessonId?: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  user?: User | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeLessonId?: string; // ID da aula sendo editada no Content Editor
  onNavigateFile?: (path: string) => void;
  activeCourse?: Course | null;
  onExpandCourse?: (courseId: string) => void;
  isOnline?: boolean; // Network connection status
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
  adminCourses = [],
  onOpenContent,
  onSelectLesson,
  isMobileOpen = false,
  onCloseMobile,
  activeLessonId,
  onNavigateFile,
  activeCourse,
  onExpandCourse,
  isOnline = true // Default to online
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
    { id: 'history', label: 'Histórico', icon: 'fas fa-history' },
    { id: 'buddy', label: 'Buddy AI', icon: 'fas fa-robot' }
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
      bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl
      border-r border-slate-200 dark:border-white/5 
      p-4 
      transition-all duration-300 
      group
      shadow-2xl lg:shadow-none
      cursor-default lg:cursor-default
    `}>

      {/* Close Button Mobile */}
      <button
        onClick={onCloseMobile}
        className="absolute right-3 top-3 lg:hidden w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
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
        <div className="w-10 h-10 min-w-[40px] bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-3 ring-1 ring-white/10 group-hover/header:rotate-6 transition-transform">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <h1 className="font-black text-slate-800 dark:text-white text-lg leading-tight tracking-tighter uppercase whitespace-nowrap drop-shadow-md">StudySystem</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Sistema de Estudos</p>
        </div>
      </div>

      {/* User Status Card */}
      <div className={`mb-8 bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/5 transition-all duration-300 overflow-hidden ${isActuallyCollapsed ? 'p-2 mx-0' : 'p-4 mx-0'}`}>
        <div className={`flex items-center ${isActuallyCollapsed ? 'justify-center' : 'gap-3 mb-3'}`}>
          <div className={`rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-white border-2 border-slate-900 shadow-lg shadow-orange-500/20 transition-all ${isActuallyCollapsed ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[12px]'}`}>
            {level}
          </div>
          <div className={`flex-1 overflow-hidden transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-none uppercase tracking-tight whitespace-nowrap">Nível {level}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter truncate">{1000 - xpInLevel} XP para prox.</p>
          </div>
        </div>

        {/* Progress bar hides when collapsed for cleaner look */}
        {!isActuallyCollapsed && (
          <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-800/50 rounded-full overflow-hidden animate-in fade-in duration-500">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide overflow-x-hidden">
        {!isActuallyCollapsed && <p className="px-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 opacity-50 whitespace-nowrap">Menu Principal</p>}

        <Link
          to="/"
          onClick={(e) => {
            e.stopPropagation();
            onViewChange('dashboard');
          }}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === 'dashboard'
            ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
            : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
            } ${isActuallyCollapsed ? 'justify-center' : ''}`}
          title={isActuallyCollapsed ? "Dashboard" : ''}
        >
          <div className={`transition-transform duration-300 ${activeView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`}>
            <i className={`fas fa-th-large w-5 text-center ${activeView === 'dashboard' ? 'text-indigo-400' : ''}`}></i>
          </div>
          <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            Dashboard
          </span>
        </Link>

        {/* Meus Cursos com Submenu */}
        <div className={`${isActuallyCollapsed ? 'mt-1 pt-1' : ''}`}>
          <Link
            to="/courses"
            onClick={(e) => {
              e.stopPropagation();
              setCoursesMenuOpen(open => !open);
              onViewChange('courses', true);
              if (isActuallyCollapsed) setIsCollapsed(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'courses'
              ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
              : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
              } ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title="Meus Cursos"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`transition-transform duration-300 ${activeView === 'courses' ? 'scale-110' : 'group-hover:scale-110'}`}>
                <i className={`fas fa-graduation-cap w-5 text-center ${activeView === 'courses' ? 'text-indigo-400' : ''}`}></i>
              </div>
              <span className={`truncate transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Meus Cursos</span>
            </div>
            {!isActuallyCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${coursesMenuOpen ? 'rotate-180' : ''}`}></i>}
          </Link>

          {!isActuallyCollapsed && coursesMenuOpen && (
            <div className="ml-7 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 mb-2">
              {courses.map(course => {
                const isCourseOpen = expandedCourseId === course.id;
                // Fallback to activeCourse modules if available and matching
                const modules = (isCourseOpen && activeCourse?.id === course.id && activeCourse.modules)
                  ? activeCourse.modules
                  : (course.modules || []);
                return (
                  <div key={course.id} className="space-y-1">
                    <Link
                      to="/courses"
                      onClick={(e) => {
                        e.stopPropagation();
                        // const newId = isCourseOpen ? '' : course.id; // Logic handled in setExpanded
                        const newId = isCourseOpen ? '' : course.id;
                        setExpandedCourseId(newId);
                        setExpandedModuleId('');
                        if (newId) onExpandCourse?.(newId);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-black uppercase tracking-widest truncate block ${isCourseOpen
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                      {course.title}
                    </Link>

                    {isCourseOpen && (
                      <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
                        {modules.map(module => {
                          const isModuleOpen = expandedModuleId === module.id;
                          const lessons = module.lessons || [];
                          return (
                            <div key={module.id} className="space-y-1">
                              <Link
                                to="/courses"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedModuleId(isModuleOpen ? '' : module.id);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-bold tracking-tight truncate block ${isModuleOpen
                                  ? 'bg-cyan-500/10 text-cyan-400'
                                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                  }`}
                              >
                                {module.title}
                              </Link>

                              {isModuleOpen && lessons.length > 0 && (
                                <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
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
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-medium tracking-tight truncate ${isActiveLesson
                                          ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20'
                                          : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                                          }`}
                                      >
                                        {isActiveLesson && <i className="fas fa-play-circle mr-2 text-emerald-400"></i>}
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
          <Link
            key={item.id}
            to={`/${item.id}`} // Assumes path matches id: /achievements, /history
            onClick={(e) => {
              e.stopPropagation();
              onViewChange(item.id);
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === item.id
              ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
              : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
              } ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title={isActuallyCollapsed ? item.label : ''}
          >
            <div className={`transition-transform duration-300 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              <i className={`${item.icon} w-5 text-center ${activeView === item.id ? 'text-indigo-400' : ''}`}></i>
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              {item.label}
            </span>
          </Link>
        ))}

        {isAdmin && (
          <>
            {!isActuallyCollapsed && <p className="px-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-8 mb-4 opacity-50 whitespace-nowrap">Administração</p>}

            {/* Admin Section Container */}
            <div className={`${isActuallyCollapsed ? 'mt-4 border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
              <Link
                to="/admin/content"
                onClick={(e) => {
                  e.stopPropagation();
                  setContentMenuOpen(open => !open);
                  onViewChange('content', true);
                  // Auto-expand sidebar logic is optional, removing strict dependency for cleaner UX
                  if (isActuallyCollapsed) setIsCollapsed(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'content'
                  ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                  } ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Gestão de Conteúdo"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`transition-transform duration-300 ${activeView === 'content' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-file-alt w-5 text-center ${activeView === 'content' ? 'text-indigo-400' : ''}`}></i>
                  </div>
                  <span className={`truncate transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Gestão de Conteúdo</span>
                </div>
                {!isActuallyCollapsed && <i className={`fas fa-chevron-down text-xs transition-transform ${contentMenuOpen ? 'rotate-180' : ''}`}></i>}
              </Link>

              {/* Submenu Tree (Only visible if expanded) */}
              {!isActuallyCollapsed && contentMenuOpen && (
                <div className="ml-7 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 mb-2">
                  {adminCourses.map(course => {
                    const isCourseOpen = expandedCourseId === course.id;
                    const modules = course.modules || [];
                    return (
                      <div key={course.id} className="space-y-1">
                        <Link
                          to="/admin/content"
                          state={{ courseId: course.id }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCourseId(isCourseOpen ? '' : course.id);
                            setExpandedModuleId('');
                            onOpenContent?.(course.id);
                            onViewChange('content');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-black uppercase tracking-widest truncate block ${isCourseOpen
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                            }`}
                        >
                          {course.title}
                        </Link>

                        {isCourseOpen && (
                          <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
                            {modules.map(module => {
                              const isModuleOpen = expandedModuleId === module.id;
                              const lessons = module.lessons || [];
                              return (
                                <div key={module.id} className="space-y-1">
                                  <Link
                                    to="/admin/content"
                                    state={{ courseId: course.id, moduleId: module.id }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedModuleId(isModuleOpen ? '' : module.id);
                                      onOpenContent?.(course.id, module.id);
                                      onViewChange('content');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-bold tracking-tight truncate block ${isModuleOpen
                                      ? 'bg-cyan-500/10 text-cyan-400'
                                      : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                                      }`}
                                  >
                                    {module.title}
                                  </Link>

                                  {isModuleOpen && lessons.length > 0 && (
                                    <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
                                      {lessons.map(lesson => {
                                        const isActiveLesson = activeLessonId === lesson.id;
                                        return (
                                          <Link
                                            key={lesson.id}
                                            to={`/admin/lesson/${lesson.id}/edit`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // onOpenContent?.(course.id, module.id, lesson.id); // Redundant if Link works
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-medium tracking-tight truncate block ${isActiveLesson
                                              ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20'
                                              : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
                                              }`}
                                          >
                                            {isActiveLesson && <i className="fas fa-pencil-alt mr-2 text-emerald-400"></i>}
                                            {lesson.title}
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {isModuleOpen && lessons.length === 0 && (
                                    <div className="px-3 py-2 text-[11px] text-slate-500/50 italic">Sem aulas</div>
                                  )}
                                </div>
                              );
                            })}
                            {modules.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-500/50 italic">Sem módulos</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {adminCourses.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-500">Nenhum curso</div>}
                </div>
              )}

              <Link
                to="/admin/users"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('users');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight group relative ${activeView === 'users' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Controle de Usuários"
              >
                <div className={`transition-transform duration-300 ${activeView === 'users' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-users w-5 text-center ${activeView === 'users' ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Controle de Usuários
                </span>
              </Link>

              {/* Arquivos Menu with Subfolders */}
              <div>
                <Link
                  to="/admin/files"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView === 'files') {
                      // Only toggle menu?
                    }
                    onViewChange('files');
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'files' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Gerenciar Arquivos"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`transition-transform duration-300 ${activeView === 'files' ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <i className={`fas fa-folder-open w-5 text-center ${activeView === 'files' ? 'text-indigo-400' : ''}`}></i>
                    </div>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                      Arquivos
                    </span>
                  </div>
                  {!isActuallyCollapsed && activeView === 'files' && <i className="fas fa-chevron-down text-xs"></i>}
                </Link>

                {!isActuallyCollapsed && activeView === 'files' && (
                  <div className="ml-7 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 mb-2">
                    {['audios', 'course-covers', 'images', 'pdfs'].map(folder => (
                      <button
                        key={folder}
                        onClick={() => onNavigateFile?.(folder)}
                        className="w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-medium text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-400 capitalize"
                      >
                        <i className="fas fa-folder mr-2 text-amber-500/80"></i>
                        {folder}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/admin/access"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('access');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'access' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Acesso aos Cursos"
              >
                <div className={`transition-transform duration-300 ${activeView === 'access' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-lock w-5 text-center ${activeView === 'access' ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Acesso aos Cursos
                </span>
              </Link>

              <Link
                to="/admin/questionnaire"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('questionnaire');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'questionnaire' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Banco de Questões"
              >
                <div className={`transition-transform duration-300 ${activeView === 'questionnaire' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-clipboard-question w-5 text-center ${activeView === 'questionnaire' ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Banco de Questões
                </span>
              </Link>

              <Link
                to="/admin/health"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('system-health');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'system-health' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Saúde do Sistema"
              >
                <div className={`transition-transform duration-300 ${activeView === 'system-health' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-heartbeat w-5 text-center ${activeView === 'system-health' ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Saúde do Sistema
                </span>
              </Link>

              <Link
                to="/admin/settings"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChange('settings');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'settings' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                title="Configuração do Suporte"
              >
                <div className={`transition-transform duration-300 ${activeView === 'settings' ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <i className={`fas fa-cogs w-5 text-center ${activeView === 'settings' ? 'text-indigo-400' : ''}`}></i>
                </div>
                <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                  Configuração do Suporte
                </span>
              </Link>
            </div>
          </>
        )}
      </nav>

      <div className={`mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-white/5 transition-all ${isActuallyCollapsed ? 'flex flex-col items-center' : ''}`}>

        {/* Support Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSupportOpen(true);
          }}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300 transition-all text-sm font-bold group ${isActuallyCollapsed ? 'justify-center' : ''}`}
          title="Suporte Técnico"
        >
          <div className="group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-headset w-5 text-center"></i>
          </div>
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
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300 transition-all text-sm font-bold group ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title="Alterar Tema"
          >
            <div className="group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-palette w-5 text-center"></i>
            </div>
            <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              Tema
            </span>
            {!isActuallyCollapsed && (
              <i className={`fas fa-chevron-${themeDropdownOpen ? 'up' : 'down'} ml-auto text-xs opacity-50`}></i>
            )}
          </button>

          {/* Dropdown Menu */}
          {themeDropdownOpen && !isActuallyCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#0a0e14]/90 backdrop-blur-xl rounded-xl shadow-xl shadow-black/20 dark:shadow-black/50 border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTheme();
                  if (theme === 'dark') setThemeDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${theme === 'light'
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
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
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
              >
                <i className="fas fa-moon w-4"></i>
                <span>Escuro</span>
                {theme === 'dark' && <i className="fas fa-check ml-auto text-xs"></i>}
              </button>
            </div>
          )}
        </div>

        {/* Network Status Indicator - Only shown when offline */}
        {!isOnline && (
          <div className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-red-900/20 border border-red-500/30 text-sm font-bold ${isActuallyCollapsed ? 'justify-center' : ''}`}>
            <div className="relative flex items-center justify-center w-5">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </div>
            <span className={`transition-all duration-300 text-red-400 uppercase tracking-wider ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              Sem Conexão
            </span>
          </div>
        )}

        {/* Logout Button with Red Glow */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogout();
          }}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold group relative ${isActuallyCollapsed ? 'justify-center' : ''} hover:shadow-lg hover:shadow-red-500/10`}
          title="Encerrar Sessão"
        >
          <div className="group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
          </div>
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
