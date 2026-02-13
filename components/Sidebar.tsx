import React, { useEffect, useState, useCallback, memo } from 'react';
import { IUserSession } from '../domain/auth';
import { Course, User } from '../domain/entities';
import { SupportDialog } from './SupportDialog';
import { AdminService } from '../services/AdminService';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';
import { Link } from 'react-router-dom';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string, keepMobileOpen?: boolean) => void;
  onLogout: () => void;
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
  isLoadingCourses?: boolean;
  isLoadingAdminCourses?: boolean;
  isHiddenOnDesktop?: boolean;
}

// Memoized Lesson Item Component for instant rendering
const LessonItem = memo<{
  lesson: any;
  isActive: boolean;
  isAdminMode: boolean;
  courseId: string;
  moduleId: string;
  onSelect?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
}>(({ lesson, isActive, isAdminMode, courseId, moduleId, onSelect, onCloseMobile }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminMode && onSelect) {
      onSelect(courseId, moduleId, lesson.id);
      onCloseMobile?.();
    }
  }, [isAdminMode, onSelect, courseId, moduleId, lesson.id, onCloseMobile]);

  if (isAdminMode) {
    return (
      <Link
        to={`/admin/lesson/${lesson.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        data-sidebar-casing="normal"
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-100 text-sm font-medium normal-case tracking-tight whitespace-normal break-words block ${isActive
          ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20'
          : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
      >
        {isActive && <i className="fas fa-pencil-alt mr-2 text-emerald-400"></i>}
        {lesson.title}
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      data-sidebar-casing="normal"
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-100 text-sm font-medium normal-case tracking-tight whitespace-normal break-words ${isActive
        ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20'
        : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
        }`}
    >
      {isActive && <i className="fas fa-play-circle mr-2 text-emerald-400"></i>}
      {lesson.title}
    </button>
  );
});

// Memoized Module Item Component for instant rendering
const ModuleItem = memo<{
  module: any;
  isOpen: boolean;
  isAdminMode: boolean;
  courseId: string;
  activeLessonId?: string;
  onToggle: (moduleId: string) => void;
  onOpenContent?: (courseId: string, moduleId?: string) => void;
  onViewChange: (view: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
}>(({ module, isOpen, isAdminMode, courseId, activeLessonId, onToggle, onOpenContent, onViewChange, onSelectLesson, onCloseMobile }) => {
  const lessons = module.lessons || [];

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(module.id);
  }, [module.id, onToggle]);

  const handleAdminClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(module.id);
    onOpenContent?.(courseId, module.id);
    onViewChange('content');
  }, [module.id, onToggle, onOpenContent, courseId, onViewChange]);

  const itemClasses = `w-full text-left px-3 py-2 rounded-lg transition-colors duration-100 text-sm font-bold normal-case tracking-tight whitespace-normal break-words block ${isOpen
    ? 'bg-cyan-500/10 text-cyan-400'
    : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
    }`;

  return (
    <div className="space-y-1">
      {isAdminMode ? (
        <Link
          to="/admin/content"
          state={{ courseId, moduleId: module.id }}
          onClick={handleAdminClick}
          data-sidebar-casing="normal"
          className={itemClasses}
        >
          {module.title}
        </Link>
      ) : (
        <button
          onClick={handleToggle}
          data-sidebar-casing="normal"
          className={itemClasses}
        >
          {module.title}
        </button>
      )}

      {isOpen && lessons.length > 0 && (
        <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
          {lessons.map((lesson: any) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isActive={activeLessonId === lesson.id}
              isAdminMode={isAdminMode}
              courseId={courseId}
              moduleId={module.id}
              onSelect={onSelectLesson}
              onCloseMobile={onCloseMobile}
            />
          ))}
        </div>
      )}

      {isOpen && lessons.length === 0 && (
        <div className="px-3 py-2 text-[11px] text-slate-500/50 italic">Sem aulas</div>
      )}
    </div>
  );
});

// Memoized Course Item Component for instant rendering
const CourseItem = memo<{
  course: Course;
  isOpen: boolean;
  isAdminMode: boolean;
  expandedModuleId: string;
  activeLessonId?: string;
  activeCourse?: Course | null;
  isLoadingModules?: boolean;
  onToggleCourse: (courseId: string) => void;
  onToggleModule: (moduleId: string) => void;
  onExpandCourse?: (courseId: string) => void;
  onOpenContent?: (courseId: string, moduleId?: string) => void;
  onViewChange: (view: string) => void;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onCloseMobile?: () => void;
}>(({ course, isOpen, isAdminMode, expandedModuleId, activeLessonId, activeCourse, isLoadingModules = false, onToggleCourse, onToggleModule, onExpandCourse, onOpenContent, onViewChange, onSelectLesson, onCloseMobile }) => {
  const modules = (activeCourse?.id === course.id && activeCourse.modules?.length)
    ? activeCourse.modules
    : (course.modules || []);
  const shouldShowLoading = isOpen && modules.length === 0 && isLoadingModules;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = isOpen ? '' : course.id;
    onToggleCourse(newId);
    if (newId) {
      onExpandCourse?.(newId);
    }
  }, [isOpen, course.id, onToggleCourse, onExpandCourse]);

  const handleAdminClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = isOpen ? '' : course.id;
    onToggleCourse(newId);
    if (newId) {
      onExpandCourse?.(newId);
    }
    onOpenContent?.(course.id);
    onViewChange('content');
  }, [isOpen, course.id, onToggleCourse, onExpandCourse, onOpenContent, onViewChange]);

  const itemClasses = `w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 text-sm font-bold normal-case tracking-tight whitespace-normal break-words block ${isOpen
    ? 'bg-amber-500/10 text-amber-500'
    : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
    }`;

  return (
    <div className="space-y-1">
      {isAdminMode ? (
        <Link
          to="/admin/content"
          state={{ courseId: course.id }}
          onClick={handleAdminClick}
          data-sidebar-casing="normal"
          className={itemClasses}
        >
          {course.title}
        </Link>
      ) : (
        <button
          onClick={handleToggle}
          data-sidebar-casing="normal"
          className={itemClasses}
        >
          {course.title}
        </button>
      )}

      {isOpen && (
        <div className="ml-3 pl-3 border-l border-white/10 space-y-1">
          {shouldShowLoading && (
            <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Carregando modulos...</div>
          )}
          {!shouldShowLoading && modules.map((module: any) => (
            <ModuleItem
              key={module.id}
              module={module}
              isOpen={expandedModuleId === module.id}
              isAdminMode={isAdminMode}
              courseId={course.id}
              activeLessonId={activeLessonId}
              onToggle={onToggleModule}
              onOpenContent={onOpenContent}
              onViewChange={onViewChange}
              onSelectLesson={onSelectLesson}
              onCloseMobile={onCloseMobile}
            />
          ))}
          {!shouldShowLoading && modules.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-slate-500/50 italic">Sem modulos</div>
          )}
        </div>
      )}
    </div>
  );
});

const Sidebar: React.FC<SidebarProps> = ({
  session,
  activeView,
  onViewChange,
  onLogout,
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
  isOnline = true,
  isLoadingCourses = false,
  isLoadingAdminCourses = false,
  isHiddenOnDesktop = false
}) => {
  const isAdmin = session.user.role === 'INSTRUCTOR';

  /* Sidebar Expanded by Default */
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [contentMenuOpen, setContentMenuOpen] = useState(activeView === 'content');
  const [coursesMenuOpen, setCoursesMenuOpen] = useState(activeView === 'courses');
  const [expandedCourseId, setExpandedCourseId] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string>('');

  const handleToggleCourse = useCallback((courseId: string) => {
    setExpandedCourseId(courseId);
    setExpandedModuleId('');
  }, []);

  const handleToggleModule = useCallback((moduleId: string) => {
    setExpandedModuleId(moduleId);
  }, []);

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
    { id: 'audit', label: 'Auditoria (Pais)', icon: 'fas fa-shield-alt' },
    { id: 'buddy', label: 'Buddy AI', icon: 'fas fa-robot' }
  ];

  return (
    <aside
      onClick={(e) => {
        if (!isMobileOpen && window.innerWidth >= 1024) {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
            setIsCollapsed(!isCollapsed);
          }
        }
      }}
      className={`
      ${isMobileOpen ? 'flex fixed h-[100dvh] overflow-y-auto' : 'hidden'} 
      ${isHiddenOnDesktop ? '' : 'lg:flex lg:relative lg:h-full lg:overflow-hidden lg:z-0'}
      flex-col
      inset-y-0 left-0 
      z-[70] 
      ${isActuallyCollapsed && !isHiddenOnDesktop ? 'lg:w-20' : 'lg:w-[432px]'} 
      w-[432px]
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
        aria-label="Fechar menu"
        className="absolute right-3 top-3 lg:hidden w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors z-50"
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

      {/* Collapse Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed(!isCollapsed);
        }}
        aria-label={isActuallyCollapsed ? "Expandir Menu" : "Retrair Menu"}
        className={`
          hidden lg:flex
          items-center justify-center
          w-full mb-4
          py-2 px-3
          rounded-xl
          transition-all duration-300
          text-slate-600 dark:text-slate-400
          hover:bg-slate-100 dark:hover:bg-white/5
          hover:text-indigo-600 dark:hover:text-indigo-400
          group/toggle
          ${isActuallyCollapsed ? 'justify-center' : 'justify-between'}
        `}
        title={isActuallyCollapsed ? "Expandir Menu" : "Retrair Menu"}
      >
        <div className={`flex items-center gap-2 transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
          <i className="fas fa-bars text-sm"></i>
          <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            Menu
          </span>
        </div>

        <div className={`
          flex items-center justify-center
          w-6 h-6
          rounded-lg
          bg-slate-200 dark:bg-slate-800
          group-hover/toggle:bg-indigo-100 dark:group-hover/toggle:bg-indigo-900/30
          transition-all duration-300
          ${isActuallyCollapsed ? 'rotate-180' : ''}
        `}>
          <i className={`fas fa-chevron-left text-[10px] transition-transform duration-300 ${isActuallyCollapsed ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {/* User Status Card */}
      {isActuallyCollapsed ? (
        /* Collapsed: Just centered badge, no card wrapper to avoid clipping */
        <div className="mb-6 flex justify-center shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-white text-[11px] border-2 border-white dark:border-slate-700 shadow-md" title={`Nível ${level}`}>
            {level}
          </div>
        </div>
      ) : (
        /* Expanded: Full card with text and progress bar */
        <div className="mb-8 shrink-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-white text-[12px] border-2 border-slate-900 shadow-lg shadow-orange-500/20">
              {level}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-700 dark:text-slate-100 leading-none uppercase tracking-tight truncate">Nível {level}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-tighter truncate">{1000 - xpInLevel} XP para prox.</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      <nav className={`flex-1 space-y-1 overflow-x-hidden ${isMobileOpen ? 'min-h-min' : 'overflow-y-auto scrollbar-hide'} lg:overflow-y-auto lg:scrollbar-hide`}>
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

        {/* Courses Menu */}
        <div className={`${isActuallyCollapsed ? 'mt-1 pt-1' : ''}`}>
          <Link
            to="/courses"
            onClick={(e) => {
              e.stopPropagation();
              setCoursesMenuOpen(open => !open);
              onViewChange('courses', true);
              if (isActuallyCollapsed) setIsCollapsed(false);
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group relative overflow-hidden ${activeView === 'courses'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 ring-1 ring-indigo-400/50'
              : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'
              } ${isActuallyCollapsed ? 'justify-center' : ''}`}
            title="Meus Cursos"
          >
            <div className="flex items-center gap-3 min-w-0 relative z-10">
              <div className={`transition-transform duration-300 ${activeView === 'courses' ? 'scale-110' : 'group-hover:scale-110'}`}>
                <i className={`fas fa-graduation-cap w-5 text-center ${activeView === 'courses' ? 'text-white drop-shadow-md' : ''}`}></i>
              </div>
              <span className={`truncate transition-all duration-300 ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Meus Cursos</span>
            </div>
            {!isActuallyCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCoursesMenuOpen(open => !open);
                }}
                className="relative z-20 p-1 -m-1 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                <i className={`fas fa-chevron-down text-xs transition-transform ${coursesMenuOpen ? 'rotate-180' : ''}`}></i>
              </button>
            )}

            {/* Active Glow Effect */}
            {activeView === 'courses' && (
              <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none rounded-xl"></div>
            )}
          </Link>

          {!isActuallyCollapsed && coursesMenuOpen && (
            <div className="ml-7 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 mb-2">
              {isLoadingCourses && courses.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Carregando cursos...</div>
              )}
              {!isLoadingCourses && courses.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Nenhum curso</div>
              )}
              {courses.map(course => (
                <CourseItem
                  key={course.id}
                  course={course}
                  isOpen={expandedCourseId === course.id}
                  isAdminMode={false}
                  expandedModuleId={expandedModuleId}
                  activeLessonId={activeLessonId}
                  activeCourse={activeCourse}
                  isLoadingModules={isLoadingCourses}
                  onToggleCourse={handleToggleCourse}
                  onToggleModule={handleToggleModule}
                  onExpandCourse={onExpandCourse}
                  onOpenContent={onOpenContent}
                  onViewChange={onViewChange}
                  onSelectLesson={onSelectLesson}
                  onCloseMobile={onCloseMobile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Other Menu Items */}
        {menuItems.map(item => (
          <Link
            key={item.id}
            to={`/${item.id}`}
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

        {/* Admin Links */}
        {isAdmin && (
          <>
            {!isActuallyCollapsed && <p className="px-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-8 mb-4 opacity-50 whitespace-nowrap">Administração</p>}

            <div className={`${isActuallyCollapsed ? 'mt-4 border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
              <Link
                to="/admin/content"
                onClick={(e) => {
                  e.stopPropagation();
                  setContentMenuOpen(open => !open);
                  onViewChange('content', true);
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
                {!isActuallyCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContentMenuOpen(open => !open);
                    }}
                    className="relative z-20 p-1 -m-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <i className={`fas fa-chevron-down text-xs transition-transform ${contentMenuOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                )}
              </Link>

              {!isActuallyCollapsed && contentMenuOpen && (
                <div className="ml-7 pl-3 border-l border-slate-200 dark:border-white/10 space-y-1 mb-2">
                  {isLoadingAdminCourses && adminCourses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500/70 italic">Carregando cursos...</div>
                  )}
                  {!isLoadingAdminCourses && adminCourses.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-500">Nenhum curso</div>
                  )}
                  {adminCourses.map(course => (
                    <CourseItem
                      key={course.id}
                      course={course}
                      isOpen={expandedCourseId === course.id}
                      isAdminMode={true}
                      expandedModuleId={expandedModuleId}
                      activeLessonId={activeLessonId}
                      activeCourse={activeCourse}
                      isLoadingModules={isLoadingAdminCourses}
                      onToggleCourse={handleToggleCourse}
                      onToggleModule={handleToggleModule}
                      onExpandCourse={onExpandCourse}
                      onOpenContent={onOpenContent}
                      onViewChange={onViewChange}
                      onSelectLesson={onSelectLesson}
                      onCloseMobile={onCloseMobile}
                    />
                  ))}
                </div>
              )}

              {/* Admin Users */}
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

              {/* Audit Access - Only for Minors (Supervision) or Admins */}
              {user && (user.role === 'INSTRUCTOR' || user.isMinor) && (
                <Link
                  to="/audit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewChange('audit');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 group ${activeView === 'audit' ? 'bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-white shadow-lg shadow-indigo-500/10 dark:shadow-white/5 ring-1 ring-indigo-200 dark:ring-white/10' : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-300'} ${isActuallyCollapsed ? 'justify-center' : ''}`}
                  title="Auditoria"
                >
                  <div className={`transition-transform duration-300 ${activeView === 'audit' ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <i className={`fas fa-eye w-5 text-center ${activeView === 'audit' ? 'text-indigo-400' : ''}`}></i>
                  </div>
                  <span className={`transition-all duration-300 whitespace-nowrap ${isActuallyCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                    Auditoria
                  </span>
                </Link>
              )}

              {/* Admin Access */}
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

        {/* Theme Toggle */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all ${isActuallyCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!isActuallyCollapsed && (
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tema</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {theme === 'dark' ? 'Escuro' : 'Claro'}
              </span>
            </div>
          )}
          <AnimatedThemeToggler
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Alternar tema"
          />
        </div>

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


        {/* Network Status Indicator */}
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

        {/* Logout Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogout();
          }}
          aria-label="Encerrar Sessão"
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

      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={session.user.role === 'INSTRUCTOR' ? new AdminService(new SupabaseAdminRepository()) : undefined}
      />
    </aside >
  );
};

export default Sidebar;
