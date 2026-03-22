import React, { useEffect, useState, startTransition } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// Lazy Load Heavy UI Components
const Sidebar = React.lazy(() => import('./components/Sidebar'));
import LessonForumModal from './components/features/classroom/LessonForumModal';
import LessonMaterialsModal from './components/features/classroom/LessonMaterialsModal';
const GeminiBuddy = React.lazy(() => import('./components/GeminiBuddy'));
const AuthForm = React.lazy(() => import('./components/AuthForm'));
const AdminAuthForm = React.lazy(() => import('./components/AdminAuthForm'));
import { PresenceCheckModal } from './components/PresenceCheckModal';
const PendingApprovalScreen = React.lazy(() => import('./components/PendingApprovalScreen'));
import Breadcrumb from './components/Breadcrumb';
import { LessonRecord } from './domain/admin';
import { Course, Module } from './domain/entities';
import { ModernLoader } from './components/ModernLoader';

// Lazy Imports
const AdminContentManagement = React.lazy(() => import('./components/AdminContentManagement'));
const StudentDashboard = React.lazy(() => import('@/components/features/dashboard/StudentDashboard'));
const UserManagement = React.lazy(() => import('@/components/features/admin/UserManagement'));
const FileManagement = React.lazy(() => import('./components/FileManagement'));
const AdminSettingsPage = React.lazy(() => import('@/components/features/admin/AdminSettingsPage').then(module => ({ default: module.AdminSettingsPage })));
const AdminCourseAccessPage = React.lazy(() => import('./components/AdminCourseAccessPage'));
const InstructorInteractionCenter = React.lazy(() => import('./components/features/instructor/InstructorInteractionCenter'));
const UserProfilePage = React.lazy(() => import('./components/features/user/UserProfilePage'));
const AchievementsPage = React.lazy(() => import('./components/AchievementsPage'));
const AuditPage = React.lazy(() => import('@/components/features/admin/AuditPage'));
const UserDetailsModal = React.lazy(() => import('@/components/features/admin/UserDetailsModal'));
const BuddyFullPage = React.lazy(() => import('./components/BuddyFullPage'));
const CourseEnrollmentModal = React.lazy(() => import('./components/CourseEnrollmentModal'));
const LessonContentEditorPage = React.lazy(() => import('./components/LessonContentEditorPage'));
const LessonViewer = React.lazy(() => import('@/components/features/classroom/LessonViewer'));
// Duplicate PendingApprovalScreen removed
const SystemHealth = React.lazy(() => import('./components/SystemHealth').then(module => ({ default: module.SystemHealth }))); // Check if named export
const CourseLayout = React.lazy(() => import('./components/CourseLayout'));
const CourseOverview = React.lazy(() => import('./components/CourseOverview'));
const QuestionnaireManagementPage = React.lazy(() => import('./components/QuestionnaireManagementPage'));
const DropboxCallbackPage = React.lazy(() => import('./components/DropboxCallbackPage'));

import { useAuth } from './contexts/AuthContext';
import { useCourse } from './contexts/CourseContext';
import { AnimatedThemeToggler } from './components/ui/animated-theme-toggler';
import { useTheme } from './contexts/ThemeContext';
import { SupportDialog } from './components/SupportDialog';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationBell from './components/ui/NotificationBell';



import { AdminService } from './services/AdminService';
import { adminService as sharedAdminService } from './services/Dependencies';
const LessonLoader = React.lazy(() => import('./components/LessonLoader'));
const ForcePasswordChangeModal = React.lazy(() => import('./components/ForcePasswordChangeModal'));
import { useActivityTracker } from './hooks/useActivityTracker';
import { useIdleTimeout } from './hooks/useIdleTimeout';

const LessonContentEditorWrapper: React.FC<{ adminService: AdminService }> = ({ adminService }) => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (lessonId) {
      setLoading(true);
      
      const checkAccess = async () => {
        try {
          const [lessonData, hasAccess] = await Promise.all([
            adminService.getLesson(lessonId),
            adminService.canEditLesson(lessonId)
          ]);
          setLesson(lessonData);
          setIsAuthorized(hasAccess);
        } catch (err) {
          console.error(err);
          toast.error("Erro ao verificar permissões da aula.");
          navigate('/admin/content');
        } finally {
          setLoading(false);
        }
      };

      checkAccess();
    }
  }, [lessonId, adminService, navigate]);

  if (loading) return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0a0e14]">
      <ModernLoader message="Verificando permissões..." />
    </div>
  );

  if (isAuthorized === false) return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#0a0e14]">
      <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-sm">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-user-lock text-3xl text-red-500"></i>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Acesso Negado</h2>
        <p className="text-sm text-slate-400 mb-6 font-medium">Você não tem permissão para editar esta aula específica. Entre em contato com o Master para solicitar acesso.</p>
        <button 
          onClick={() => navigate('/admin/content')}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all text-xs"
        >
          Voltar para Gestão
        </button>
      </div>
    </div>
  );

  if (!lesson) return <div className="p-8 text-slate-500">Aula não encontrada.</div>;

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-[#0a0e14] overflow-y-auto">
      <LessonContentEditorPage
        lesson={lesson}
        onSave={async (content, metadata: any) => {
          await adminService.updateLesson(lesson.id, {
            content: content,
            title: metadata?.title,
            videoUrl: metadata?.video_url,
            videoUrls: metadata?.video_urls,
            audioUrl: metadata?.audio_url,
            imageUrl: metadata?.image_url,
            durationSeconds: metadata?.duration_seconds,
            position: metadata?.position,
            contentBlocks: metadata?.content_blocks
          });
        }}
        onCancel={() => navigate('/admin/content')}
      />
    </div>
  );
};

// Admin Check Helper wrapper to protect admin routes
// Extracted outside `App` to prevent React from unmounting all children on every App re-render
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user?.hasAdminPanelAccess ? <>{children}</> : <div className="p-8 flex items-center justify-center min-h-screen text-slate-500 font-bold">Acesso negado. Somente Instrutores podem acessar esta área.</div>;
};

const MasterRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isMaster = user?.role === 'MASTER' || user?.email === 'timbo.correa@gmail.com';
  return isMaster ? <>{children}</> : <div className="p-8 flex items-center justify-center min-h-screen text-slate-500 font-bold tracking-tight">🚫 Acesso restrito ao perfil Master (Proprietário).</div>;
};

const App: React.FC = () => {
  const { user, session, isLoading: authLoading, logout, authService, refreshSession } = useAuth();



  // Reuse shared singleton to avoid extra Supabase client/repository instances.
  const adminService = sharedAdminService;

  const {
    availableCourses,
    enrolledCourses,
    activeCourse,
    activeModule,
    activeLesson,
    selectCourse,
    enrollInCourse,
    updateProgress,
    selectLesson,
    selectModule,
    isLoadingCourses
  } = useCourse();

  // Start Audit Tracker
  useActivityTracker(activeLesson?.title);

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Enrollment Modal State
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Admin Data (Managed Courses with full structure)
  const [adminCourses, setAdminCourses] = useState<import('./domain/entities').Course[]>([]);
  const [isAdminCoursesLoading, setIsAdminCoursesLoading] = useState(false);
  
  // Lesson Modals Global State
  const [forumLesson, setForumLesson] = useState<{ id: string, title: string } | null>(null);
  const [materialsLesson, setMaterialsLesson] = useState<{ id: string, title: string } | null>(null);

  const isAdmin = user?.role === 'MASTER' || user?.role === 'INSTRUCTOR' || user?.email === 'timbo.correa@gmail.com';
  // Network Connection Monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineModal, setShowOfflineModal] = useState(false);



  // Idle Timeout Implementation - Auto-logout disabled as requested
  const handleIdleTimeout = React.useCallback(async () => {
    console.log('💤 Timer atingido, mas o auto-logout foi desabilitado.');
  }, []);

  // Set timeout to 24 hours just to keep the timer from triggering frequently
  const timeoutDuration = 24 * 60 * 60 * 1000;

  useIdleTimeout({
    onIdle: handleIdleTimeout,
    timeout: timeoutDuration,
    onRefreshSession: refreshSession
  });

  useEffect(() => {
    if (user?.hasAdminPanelAccess) {
      setIsAdminCoursesLoading(true);
      
      const loadAdminCourses = async () => {
        try {
          // Agora o RLS se encarrega de retornar apenas os cursos autorizados.
          // Não precisamos mais de atribuições de lições via JS lateral aqui.
          const courses = await adminService.listCoursesOutline();
          setAdminCourses(courses);
        } catch (err) {
          console.error("Failed to load admin courses", err);
        } finally {
          setIsAdminCoursesLoading(false);
        }
      };

      loadAdminCourses();
    } else {
      setAdminCourses([]);
    }
  }, [user, adminService]);

  // Derive activeView for Sidebar highlighting
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/courses') return 'courses';
    if (path === '/achievements') return 'achievements';
    if (path === '/history') return 'history';
    if (path === '/audit') return 'audit';
    if (path === '/buddy') return 'buddy';
    if (path.startsWith('/admin/content')) return 'content';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/files')) return 'files';
    if (path.startsWith('/admin/health')) return 'system-health';
    if (path.startsWith('/admin/access')) return 'access';
    if (path.startsWith('/admin/questionnaire')) return 'questionnaire';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.match(/\/admin\/lesson\/[^/]+\/edit/)) return 'content'; // Keep 'content' active for editor
    if (path.startsWith('/course/')) return 'lesson';
    if (path.startsWith('/editor/')) return 'content-editor';
    return 'dashboard';
  };

  const activeView = getActiveView();
  const isLessonRoute = location.pathname.match(/\/course\/[^/]+\/lesson\//) !== null;

  // Derive active lesson ID from URL for admin routes or from context for student routes
  const getActiveLessonId = () => {
    const path = location.pathname;
    // Check if we're in admin lesson edit route
    const adminLessonMatch = path.match(/\/admin\/lesson\/([^/]+)\/edit/);
    if (adminLessonMatch) {
      return adminLessonMatch[1]; // Return lesson ID from URL
    }
    // Otherwise use context-based lesson ID
    return activeLesson?.id;
  };

  const activeLessonId = getActiveLessonId();


  // Network Connection Monitoring
  useEffect(() => {
    console.log('🔍 Network monitoring initialized in App.tsx. Current state:', navigator.onLine ? 'ONLINE' : 'OFFLINE');

    const handleOnline = () => {
      console.log('🌐 Conexão restaurada');
      setIsOnline(true);
      setShowOfflineModal(false);
      toast.success('✅ Conexão com a internet restaurada!');
    };

    const handleOffline = () => {
      console.log('📵 Conexão perdida');
      console.log('📵 Atualizando estados: isOnline=false, showOfflineModal=true');
      setIsOnline(false);
      setShowOfflineModal(true);
      toast.error('❌ Conexão com a internet perdida!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state and trigger modal if offline
    if (!navigator.onLine) {
      console.log('⚠️ App iniciou OFFLINE - mostrando modal');
      setIsOnline(false);
      setShowOfflineModal(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sidebar Navigation Handler
  const handleViewChange = (view: string, keepMobileOpen = false) => {
    if (!keepMobileOpen) setIsMobileMenuOpen(false);

    startTransition(() => {
      switch (view) {
        case 'dashboard': navigate('/'); break;
        case 'courses': navigate('/courses'); break;
        case 'achievements': navigate('/achievements'); break;
        case 'history': navigate('/history'); break;
        case 'audit': navigate('/audit'); break;
        case 'buddy': navigate('/buddy'); break;
        case 'content': navigate('/admin/content'); break;
        case 'users': navigate('/admin/users'); break;
        case 'files': navigate('/admin/files'); break;
        case 'system-health': navigate('/admin/health'); break;
        case 'access': navigate('/admin/access'); break;
        case 'questionnaire': navigate('/admin/questionnaire'); break;
        case 'settings': navigate('/admin/settings'); break;
        default: navigate('/');
      }
    });
  };

  const handleEnrollRequest = (courseId: string) => {
    // Check if already enrolled
    if (enrolledCourses.some(c => c.id === courseId)) {
      navigate(`/course/${courseId}`);
    } else {
      setSelectedCourseForEnrollment(courseId);
      setIsEnrollmentModalOpen(true);
    }
  };

  const verifyEnrollmentAndNavigate = (courseId: string, moduleId?: string, lessonId?: string) => {
    const isEnrolled = enrolledCourses.some(c => c.id === courseId);
    if (!isEnrolled) {
      alert("Você precisa se inscrever neste curso para acessar o conteúdo.");
      return;
    }
    if (lessonId && moduleId) {
      navigate(`/course/${courseId}/lesson/${lessonId}`);
    } else {
      navigate(`/course/${courseId}`);
    }

  };

  const traverseToAdminEditor = (courseId: string, moduleId?: string, lessonId?: string) => {
    if (lessonId) {
      navigate(`/admin/lesson/${lessonId}/edit`);
    } else {
      navigate('/admin/content', { state: { courseId, moduleId } });
    }
  };

  // Activity Logging Logic
  // Activity Logging Logic
  const handleTrackAction = (action: string, path?: string) => {
    if (user) {
      const payload = {
        text: action,
        path: path || location.pathname // fallback to current path
      };
      adminService.logActivity(user.id, 'INTERACTION', JSON.stringify(payload));
    }
  };

  // Navigation Tracking
  useEffect(() => {
    if (user) {
      const path = location.pathname;
      let description = `Visitou: ${path}`;
      if (path === '/') description = 'Acessou o Painel Inicial';
      else if (path === '/courses') description = 'Listou Meus Cursos';
      else if (path === '/history') description = 'Visualizou Histórico';
      else if (path === '/achievements') description = 'Visualizou Conquistas';

      const payload = {
        text: description,
        path: path
      };

      adminService.logActivity(user.id, 'NAVIGATION', JSON.stringify(payload));
    }
  }, [location.pathname, user?.id]); // Depend on pathname and user.id

  // Breadcrumb Logic (Simplified)
  const getBreadcrumbItems = () => {
    const items: Array<{ label: string; icon?: string; onClick?: () => void }> = [
      { label: 'Painel', icon: 'fas fa-home', onClick: () => navigate('/') }
    ];

    if (activeView === 'lesson' && activeCourse) {
      items.push({
        label: activeCourse.title,
        icon: 'fas fa-graduation-cap',
        onClick: () => navigate(`/course/${activeCourse.id}`)
      });
      if (activeModule) {
        items.push({ label: activeModule.title, icon: 'fas fa-layer-group' });
        if (activeLesson) {
          items.push({ label: activeLesson.title, icon: 'fas fa-play-circle' });
        }
      }
    }
    // Add other view breadcrumbs as needed...
    return items;
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#050810] relative items-center justify-center">
        {/* Dynamic Background for Loader */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
        </div>

        <Toaster theme="dark" richColors position="top-center" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Carregando StudySystem...</p>
        </div>
      </div>
    );
  }

  // Allow Dropbox Callback to run even without session (bypass Auth Guard)
  if (location.pathname === '/oauth/dropbox') {
    return (
      <React.Suspense fallback={<ModernLoader />}>
        <DropboxCallbackPage />
      </React.Suspense>
    );
  }

  if (!session || !user) {
    const isAdminLogin = location.pathname === '/admin/login';
    
    return (
      <React.Suspense fallback={<div className="h-screen w-full bg-[#050810] flex items-center justify-center"><ModernLoader message="Carregando Login..." /></div>}>
        {isAdminLogin ? (
          <AdminAuthForm authService={authService} onSuccess={async () => { await refreshSession(); }} />
        ) : (
          <AuthForm authService={authService} onSuccess={async () => { await refreshSession(); }} />
        )}
      </React.Suspense>
    );
  }

  // Prevenir que alunos acessem o sistema se logaram via /admin/login (Check de segurança pós-login)
  if (location.pathname === '/admin/login' && !user.hasAdminPanelAccess) {
    toast.error('Acesso negado. Esta página é restrita para administradores.');
    logout();
    return null;
  }



  // App Component Logic
  // ...
  // Pending/Rejected Screens (Keep logic similar to before)
  if (user.isPending()) {
    return (
      <React.Suspense fallback={<ModernLoader />}>
        <PendingApprovalScreen userEmail={user.email} onLogout={logout} />
      </React.Suspense>
    );
  }
  if (user.isRejected()) { logout(); return null; }

  // Force Password Change Check
  if (user.isTempPassword) {
    return (
      <>
        <Toaster theme="dark" richColors position="top-center" />
        <React.Suspense fallback={<ModernLoader />}>
          <ForcePasswordChangeModal
            authService={authService}
            onSuccess={async () => {
              // Refresh session to update user profile (isTempPassword should come back false)
              await refreshSession();
            }}
          />
        </React.Suspense>
      </>
    );
  }



  // Admin Check Helper foi movido para fora do componente App para evitar unmount das rotas filhas em re-renders

  const topbarActions = (
    <div className="flex items-center gap-1">
      {location.pathname.match(/\/admin\/lesson\/[^/]+\/edit/) && activeLessonId && (
        <button
          onClick={() => {
            let foundCourseId;
            for (const course of adminCourses) {
              for (const module of course.modules || []) {
                if (module.lessons?.some((l: any) => l.id === activeLessonId)) {
                  foundCourseId = course.id;
                  break;
                }
              }
              if (foundCourseId) break;
            }
            const targetCourseId = foundCourseId || activeCourse?.id;

            if (targetCourseId) {
              const event = new CustomEvent('previewAsStudent', { detail: { lessonId: activeLessonId } });
              window.dispatchEvent(event);

              setTimeout(() => {
                window.open(`/course/${targetCourseId}/lesson/${activeLessonId}?preview=true`, '_blank');
              }, 100);
            } else {
              import('sonner').then(({ toast }) => toast.error('Não foi possível identificar o curso desta aula para pré-visualização.'));
            }
          }}
          className="w-10 h-10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors bg-indigo-50/50 dark:bg-indigo-500/10"
          title="Pré-visualizar como Estudante"
        >
          <i className="fas fa-play"></i>
        </button>
      )}
      <NotificationBell />
      <button
        onClick={toggleFullscreen}
        className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
        title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
      >
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
      </button>
      <button
        onClick={() => setIsSupportOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
        title="Suporte Técnico"
      >
        <i className="fas fa-headset"></i>
      </button>
      
      {/* Botão de Perfil */}
      <button
        onClick={() => navigate('/profile')}
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-800 overflow-hidden group"
        title="Meu Perfil"
      >
        {user?.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.name} 
            className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/50 transition-all shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
            <i className="fas fa-user text-xs"></i>
          </div>
        )}
      </button>

      <AnimatedThemeToggler
        type="button"
        onClick={toggleTheme}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        aria-label="Alternar tema"
      />
      <button
        onClick={logout}
        className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
        title="Encerrar Sessão"
      >
        <i className="fas fa-sign-out-alt"></i>
      </button>
    </div>
  );

  return (
    <NotificationProvider>
      <div className="flex flex-col lg:flex-row lg:h-screen w-full bg-slate-100 dark:bg-[#050810] text-slate-800 dark:text-slate-100 transition-colors duration-300 font-lexend relative overflow-hidden">
      {/* GLOBAL DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-teal-500/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-2000"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02]"></div>
      </div>

      <Toaster theme="dark" richColors position="top-center" />

      {/* Sidebar - Suspense Wrapper */}
      <React.Suspense fallback={<div className="w-[360px] h-full bg-slate-900/60 hidden lg:block" />}>
        <Sidebar
          session={session}
          activeView={activeView}
          onViewChange={handleViewChange}
          onLogout={logout}
          user={user}
          onNavigateFile={(path) => navigate('/admin/files', { state: { path } })}
          courses={enrolledCourses}
          adminCourses={adminCourses}
          onOpenContent={user.hasAdminPanelAccess ? traverseToAdminEditor : verifyEnrollmentAndNavigate}
          onSelectLesson={(courseId, modId, lessId) => navigate(`/course/${courseId}/lesson/${lessId}`)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          activeLessonId={activeLessonId}
          activeCourse={activeCourse}
          onExpandCourse={(courseId) => selectCourse(courseId)}
          isOnline={isOnline}
          isLoadingCourses={isLoadingCourses}
          isLoadingAdminCourses={isAdminCoursesLoading}
          isHiddenOnDesktop={isLessonRoute}
          onOpenForum={(l) => setForumLesson(l)}
          onOpenMaterials={(l) => setMaterialsLesson(l)}
        />
      </React.Suspense>

      {/* Overlay (works on mobile always, and on desktop when on lesson route) */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] ${isLessonRoute ? '' : 'lg:hidden'} animate-in fade-in duration-300`} onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Topbar Actions Component (reused in desktop and mobile) */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden h-full">
        {/* Header / Breadcrumb (hidden on lesson route since LessonViewer has its own header) */}
        {!isLessonRoute && (
          <div className="hidden lg:block z-40 relative">
            <Breadcrumb items={getBreadcrumbItems()} actions={topbarActions} />
          </div>
        )}

        {/* Mobile Header (Simplified for refactor) */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#e2e8f0] dark:bg-[#0a0e14] border-b border-slate-200 dark:border-slate-800 lg:hidden fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tighter">StudySystem</h1>
          </div>
          {topbarActions}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent scroll-smooth relative pt-[73px] lg:pt-0">
          <React.Suspense fallback={
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-100 dark:bg-[#0a0e14] lg:static lg:bg-transparent lg:z-auto lg:h-full">
              <ModernLoader message="Carregando..." />
            </div>
          }>
            <Routes location={location} key={location.pathname}>
              {/* Dashboard Routes */}
              <Route path="/" element={
                <StudentDashboard
                  user={user}
                  courses={user.hasAdminPanelAccess ? adminCourses : availableCourses}
                  onCourseClick={handleEnrollRequest}
                  showEnrollButton={true}
                  enrolledCourseIds={enrolledCourses.map(c => c.id)}
                  sectionTitle="Cursos da Plataforma"
                  onManageCourse={user.hasAdminPanelAccess ? (id) => navigate('/admin/content', { state: { courseId: id } }) : undefined}
                  onManageContent={user.hasAdminPanelAccess ? () => navigate('/admin/content') : undefined}
                  isLoading={isLoadingCourses}
                />
              } />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              <Route path="/courses" element={
                <StudentDashboard
                  user={user}
                  courses={enrolledCourses}
                  onCourseClick={(id) => navigate(`/course/${id}`)}
                  showEnrollButton={false}
                  sectionTitle="Meus Cursos"
                  enrolledCourseIds={enrolledCourses.map(c => c.id)}
                  onManageCourse={user.hasAdminPanelAccess ? (id) => navigate('/admin/content', { state: { courseId: id } }) : undefined}
                  onManageContent={user.hasAdminPanelAccess ? () => navigate('/admin/content') : undefined}
                  isLoading={isLoadingCourses}
                />
              } />

              {/* Feature Routes */}
              <Route path="/profile" element={<UserProfilePage user={user} authService={authService} onUpdate={refreshSession} />} />
              <Route path="/achievements" element={<AchievementsPage user={user} course={activeCourse} adminService={adminService} />} />
              <Route path="/buddy" element={<BuddyFullPage />} />
              <Route path="/audit" element={<AuditPage />} />

              {/* Course Routes */}
              <Route path="/course/:courseId" element={<CourseLayout />}>
                <Route index element={
                  // Course Overview (Module List)
                  // Reusing logic from old App.tsx where we showed module list if no lesson selected
                   <CourseOverview
                    user={user}
                    activeCourse={activeCourse}
                    onSelectModule={(m: any) => selectModule(m.id)}
                    onSelectLesson={(l: any, tab?: string) => navigate(`/course/${activeCourse?.id}/lesson/${l.id}${tab ? `?tab=${tab}` : ''}`)}
                    onOpenForum={(l) => setForumLesson(l)}
                    onOpenMaterials={(l) => setMaterialsLesson(l)}
                  />
                } />
                <Route path="lesson/:lessonId" element={
                  <LessonLoader user={user} onTrackAction={handleTrackAction} onToggleSidebar={() => setIsMobileMenuOpen(true)} />
                } />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/content" element={
                <AdminRoute>
                  <AdminContentManagement
                    adminService={adminService}
                    user={user}
                    initialCourseId={undefined}
                    onOpenContentEditor={(lesson) => navigate(`/admin/lesson/${lesson.id}/edit`)}
                  />
                </AdminRoute>
              } />
              <Route path="/admin/lesson/:lessonId/edit" element={<AdminRoute><LessonContentEditorWrapper adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/users" element={<MasterRoute><UserManagement adminService={adminService} /></MasterRoute>} />
              <Route path="/admin/access" element={<MasterRoute><AdminCourseAccessPage adminService={adminService} /></MasterRoute>} />
              <Route path="/admin/questionnaire" element={<AdminRoute><QuestionnaireManagementPage adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/files" element={<AdminRoute><FileManagement /></AdminRoute>} />
              <Route path="/admin/health" element={<AdminRoute><SystemHealth adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage adminService={adminService} /></AdminRoute>} />
              <Route path="/instructor/interact" element={<AdminRoute><InstructorInteractionCenter /></AdminRoute>} />
              <Route path="/admin/login" element={<Navigate to="/admin/questionnaire" replace />} />
              <Route path="/oauth/dropbox" element={<DropboxCallbackPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>

      {/* Enrollment Modal */}
      {
        selectedCourseForEnrollment && (
          <CourseEnrollmentModal
            course={availableCourses.find(c => c.id === selectedCourseForEnrollment)!}
            isOpen={isEnrollmentModalOpen}
            onClose={() => { setIsEnrollmentModalOpen(false); setSelectedCourseForEnrollment(null); }}
            isLoading={isEnrolling}
            onConfirm={async () => {
              setIsEnrolling(true);
              await enrollInCourse(selectedCourseForEnrollment);
              setIsEnrolling(false);
              setIsEnrollmentModalOpen(false);
              navigate(`/ course / ${selectedCourseForEnrollment}`);
              setSelectedCourseForEnrollment(null);
            }}
          />
        )
      }

      {/* Gemini Buddy (simplified integration) */}
      <React.Suspense fallback={null}>
        <GeminiBuddy
          userName={user.name}
          systemContext="Você está no StudySystem v2 com Rotas."
          currentContext={activeLesson?.content || activeLesson?.contentBlocks?.map(b => b.text).join('\n\n') || ''}
        />
      </React.Suspense>

      {/* Support Widget removed from here, moved to Sidebar */}

      {/* Offline Connection Modal */}
      {
        showOfflineModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a0e14]/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-red-900/20 w-full max-w-md overflow-hidden border border-red-500/50 animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 p-6 text-center border-b border-red-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[2px]"></div>
                <div className="relative z-10 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 p-[1px] shadow-lg shadow-red-500/30">
                    <div className="w-full h-full rounded-full bg-[#0a0e14] flex items-center justify-center">
                      <i className="fas fa-wifi-slash text-4xl text-red-500 animate-pulse"></i>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                    Conexão Perdida
                  </h2>
                  <p className="text-sm text-slate-300 font-medium">
                    Sem acesso à internet
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <i className="fas fa-exclamation-triangle text-red-500 text-xl mt-1"></i>
                  <div>
                    <h3 className="font-bold text-white mb-1 leading-tight">
                      Não é possível acessar o sistema
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Você perdeu a conexão com a internet. Suas alterações não serão salvas até que a conexão seja restaurada.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    O que fazer:
                  </h4>
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-check text-emerald-500 text-[10px]"></i>
                      </div>
                      <span className="text-xs">Verifique sua conexão Wi-Fi ou dados móveis</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-check text-emerald-500 text-[10px]"></i>
                      </div>
                      <span className="text-xs">Mantenha esta página aberta - não recarregue!</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-check text-emerald-500 text-[10px]"></i>
                      </div>
                      <span className="text-xs">O sistema tentará reconectar automaticamente</span>
                    </li>
                  </ul>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 mt-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Aguardando conexão...
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-white/5 border-t border-white/5">
                <button
                  onClick={() => setShowOfflineModal(false)}
                  className="w-full px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all active:scale-95 border border-white/5"
                >
                  Entendi, vou aguardar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Support Dialog */}
      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={user?.role === 'INSTRUCTOR' ? adminService : undefined}
      />

      {/* GLOBAL MODALS */}
      <LessonForumModal 
          lessonId={forumLesson?.id || ''}
          lessonTitle={forumLesson?.title || ''}
          user={user}
          isOpen={!!forumLesson}
          onClose={() => setForumLesson(null)}
      />

      {materialsLesson && (
        <LessonMaterialsModal 
          lessonId={materialsLesson.id} 
          lessonTitle={materialsLesson.title} 
          isOpen={true} 
          onClose={() => setMaterialsLesson(null)} 
        />
      )}
    </div>
    </NotificationProvider>
  );
};

// End of App 
export default App;
