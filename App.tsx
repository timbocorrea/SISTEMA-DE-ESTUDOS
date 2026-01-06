import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import Sidebar from './components/Sidebar';
import GeminiBuddy from './components/GeminiBuddy';
import AuthForm from './components/AuthForm';
import StudentDashboard from './components/StudentDashboard';
import AdminContentManagement from './components/AdminContentManagement';
import UserManagement from './components/UserManagement';
import FileManagement from './components/FileManagement';
import { AdminSettingsPage } from './components/AdminSettingsPage';
import AdminCourseAccessPage from './components/AdminCourseAccessPage';
import AchievementsPage from './components/AchievementsPage';
import BuddyFullPage from './components/BuddyFullPage';
import CourseEnrollmentModal from './components/CourseEnrollmentModal';
import Breadcrumb from './components/Breadcrumb';
import LessonContentEditorPage from './components/LessonContentEditorPage';
import { LessonRecord } from './domain/admin';
import LessonViewer from './components/LessonViewer';
import HistoryPage, { HistoryItem } from './components/HistoryPage';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import { SystemHealth } from './components/SystemHealth';
import CourseLayout from './components/CourseLayout';
import CourseOverview from './components/CourseOverview';
import QuestionnaireManagementPage from './components/QuestionnaireManagementPage';

import { useAuth } from './contexts/AuthContext';
import { useCourse } from './contexts/CourseContext';


// Configure QueryClient (same as before)


import { SupabaseAdminRepository } from './repositories/SupabaseAdminRepository';
import { AdminService } from './services/AdminService';
import LessonLoader from './components/LessonLoader';

const LessonContentEditorWrapper: React.FC<{ adminService: AdminService }> = ({ adminService }) => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lessonId) {
      adminService.getLesson(lessonId)
        .then(setLesson)
        .catch((err) => {
          console.error(err);
          alert("Erro ao carregar aula");
          navigate('/admin/content');
        })
        .finally(() => setLoading(false));
    }
  }, [lessonId, adminService, navigate]);

  if (loading) return <div className="p-8 text-slate-500">Carregando editor...</div>;
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
          // Não exibir alert aqui para nao interromper fluxo, o editor ja tem seus logs
          // Mas o editor espera Promise<void>, entao ok.
        }}
        onCancel={() => navigate('/admin/content')}
      />
    </div>
  );
};

const App: React.FC = () => {
  const { user, session, isLoading: authLoading, logout, authService, refreshSession } = useAuth();

  // Instantiate AdminService (Lazy or Memoized)
  const [adminService] = useState(() => new AdminService(new SupabaseAdminRepository()));

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

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  // Enrollment Modal State
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Admin Data (Managed Courses with full structure)
  const [adminCourses, setAdminCourses] = useState<import('./domain/entities').Course[]>([]);

  // Network Connection Monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'INSTRUCTOR') {
      adminService.listCoursesFull()
        .then(setAdminCourses)
        .catch(err => console.error("Failed to load admin courses", err));
    }
  }, [user, adminService]);

  // Derive activeView for Sidebar highlighting
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/courses') return 'courses';
    if (path === '/achievements') return 'achievements';
    if (path === '/history') return 'history';
    if (path === '/buddy') return 'buddy';
    if (path.startsWith('/admin/content')) return 'content';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/files')) return 'files';
    if (path.startsWith('/admin/health')) return 'system-health';
    if (path.startsWith('/admin/access')) return 'access';
    if (path.startsWith('/admin/questionnaire')) return 'questionnaire';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.startsWith('/course/')) return 'lesson';
    if (path.startsWith('/editor/')) return 'content-editor';
    return 'dashboard';
  };

  const activeView = getActiveView();

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

  // Theme Logic
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sidebar Navigation Handler
  const handleViewChange = (view: string, keepMobileOpen = false) => {
    if (!keepMobileOpen) setIsMobileMenuOpen(false);

    switch (view) {
      case 'dashboard': navigate('/'); break;
      case 'courses': navigate('/courses'); break;
      case 'achievements': navigate('/achievements'); break;
      case 'history': navigate('/history'); break;
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
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Toaster theme={theme} richColors position="top-right" />
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Auth Screen
  if (!session || !user) {
    return (
      <AuthForm authService={authService} onSuccess={async () => { await refreshSession(); }} />
    );
  }

  // Pending/Rejected Screens (Keep logic similar to before)
  if (user.isPending()) return <PendingApprovalScreen userEmail={user.email} onLogout={logout} />;
  if (user.isRejected()) { logout(); return null; }

  // Admin Check Helper
  const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return user.role === 'INSTRUCTOR' ? <>{children}</> : <div className="p-8">Acesso negado.</div>;
  };

  return (

    <div className="flex flex-col lg:flex-row lg:h-screen w-full bg-white dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-lexend relative overflow-x-hidden">
      <Toaster theme={theme} richColors position="top-right" />

      {/* Sidebar */}
      <Sidebar
        session={session}
        activeView={activeView}
        onViewChange={handleViewChange}
        onLogout={logout}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        user={user}
        onNavigateFile={(path) => navigate('/admin/files', { state: { path } })}
        courses={enrolledCourses}
        adminCourses={adminCourses}
        onOpenContent={user.role === 'INSTRUCTOR' ? traverseToAdminEditor : verifyEnrollmentAndNavigate}
        onSelectLesson={(courseId, modId, lessId) => navigate(`/course/${courseId}/lesson/${lessId}`)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeLessonId={activeLesson?.id}
        activeCourse={activeCourse}
        onExpandCourse={selectCourse}
        isOnline={isOnline}
      />

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden h-full">
        {/* Header / Breadcrumb */}
        <div className="hidden lg:block">
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>

        {/* Mobile Header (Simplified for refactor) */}
        <header className="flex items-center gap-4 px-4 py-3 bg-[#e2e8f0] dark:bg-[#0a0e14] border-b border-slate-200 dark:border-slate-800 lg:hidden fixed top-0 left-0 right-0 z-50">
          <button onClick={() => setIsMobileMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tighter">StudySystem</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent scroll-smooth relative pt-[73px] lg:pt-0">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Dashboard Routes */}
              <Route path="/" element={
                <StudentDashboard
                  user={user}
                  courses={availableCourses}
                  onCourseClick={handleEnrollRequest}
                  showEnrollButton={true}
                  enrolledCourseIds={enrolledCourses.map(c => c.id)}
                  sectionTitle="Cursos da Plataforma"
                  onManageCourse={user.role === 'INSTRUCTOR' ? (id) => navigate('/admin/content', { state: { courseId: id } }) : undefined}
                  onManageContent={user.role === 'INSTRUCTOR' ? () => navigate('/admin/content') : undefined}
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
                  onManageCourse={user.role === 'INSTRUCTOR' ? (id) => navigate('/admin/content', { state: { courseId: id } }) : undefined}
                  onManageContent={user.role === 'INSTRUCTOR' ? () => navigate('/admin/content') : undefined}
                  isLoading={isLoadingCourses}
                />
              } />

              {/* Feature Routes */}
              <Route path="/achievements" element={<AchievementsPage user={user} course={activeCourse} />} />
              <Route path="/history" element={<HistoryPageWrapper adminService={adminService} userId={user.id} />} />
              <Route path="/buddy" element={<BuddyFullPage />} />

              {/* Course Routes */}
              <Route path="/course/:courseId" element={<CourseLayout />}>
                <Route index element={
                  // Course Overview (Module List)
                  // Reusing logic from old App.tsx where we showed module list if no lesson selected
                  <CourseOverview
                    user={user}
                    activeCourse={activeCourse}
                    onSelectModule={(m: any) => selectModule(m.id)}
                    onSelectLesson={(l: any) => navigate(`/course/${activeCourse?.id}/lesson/${l.id}`)}
                  />
                } />
                <Route path="lesson/:lessonId" element={
                  <LessonLoader user={user} theme={theme} onTrackAction={handleTrackAction} />
                } />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/content" element={
                <AdminRoute>
                  <AdminContentManagement
                    adminService={adminService}
                    initialCourseId={undefined}
                    onOpenContentEditor={(lesson) => navigate(`/admin/lesson/${lesson.id}/edit`)}
                  />
                </AdminRoute>
              } />
              <Route path="/admin/lesson/:lessonId/edit" element={<AdminRoute><LessonContentEditorWrapper adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UserManagement adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/access" element={<AdminRoute><AdminCourseAccessPage adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/questionnaire" element={<AdminRoute><QuestionnaireManagementPage adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/files" element={<AdminRoute><FileManagement /></AdminRoute>} />
              <Route path="/admin/health" element={<AdminRoute><SystemHealth adminService={adminService} /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage adminService={adminService} /></AdminRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Enrollment Modal */}
      {selectedCourseForEnrollment && (
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
      )}

      {/* Gemini Buddy (simplified integration) */}
      <GeminiBuddy
        userName={user.name}
        systemContext="Você está no StudySystem v2 com Rotas."
      />

      {/* Support Widget removed from here, moved to Sidebar */}

      {/* Offline Connection Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-red-500 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <i className="fas fa-wifi-slash text-4xl text-white"></i>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Conexão Perdida
              </h2>
              <p className="text-sm text-white/90 font-medium">
                Sem acesso à internet
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <i className="fas fa-exclamation-triangle text-red-500 text-xl mt-1"></i>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                    Não é possível acessar o sistema
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Você perdeu a conexão com a internet. Suas alterações não serão salvas até que a conexão seja restaurada.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  O que fazer:
                </h4>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                    <span>Verifique sua conexão Wi-Fi ou dados móveis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                    <span>Mantenha esta página aberta - não recarregue!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                    <span>O sistema tentará reconectar automaticamente</span>
                  </li>
                </ul>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Aguardando conexão...
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all active:scale-95"
              >
                Entendi, vou aguardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// History Wrapper
const HistoryPageWrapper: React.FC<{ adminService: AdminService; userId: string }> = ({ adminService, userId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getXpHistory(userId)
      .then(logs => {
        const formattedHistory = logs.map(log => {
          const date = new Date(log.created_at).toLocaleString('pt-BR');

          let text = log.description || 'Atividade registrada';
          let path: string | undefined = undefined;

          // Try to parse JSON description
          if (log.description && (log.description.startsWith('{') || log.description.startsWith('['))) {
            try {
              const parsed = JSON.parse(log.description);
              if (parsed.text) text = parsed.text;
              if (parsed.path) path = parsed.path;
            } catch (e) {
              // ignore
            }
          }

          return {
            text,
            date,
            points: log.amount,
            path
          };
        });
        setHistory(formattedHistory);
      })
      .catch(err => {
        console.error("Failed to load history", err);
      })
      .finally(() => setLoading(false));
  }, [adminService, userId]);

  if (loading) return <div className="p-8 text-slate-500 text-center">Carregando histórico...</div>;

  return <HistoryPage history={history} />;
};

// End of App 
export default App;
