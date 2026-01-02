import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
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
    selectModule
  } = useCourse();

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  // Enrollment Modal State
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Derive activeView for Sidebar highlighting
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/courses') return 'courses';
    if (path === '/achievements') return 'achievements';
    if (path === '/history') return 'history';
    if (path.startsWith('/admin/content')) return 'content';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/files')) return 'files';
    if (path.startsWith('/admin/health')) return 'system-health';
    if (path.startsWith('/admin/access')) return 'access';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.startsWith('/course/')) return 'lesson';
    if (path.startsWith('/editor/')) return 'content-editor';
    return 'dashboard';
  };

  const activeView = getActiveView();

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
      case 'content': navigate('/admin/content'); break;
      case 'users': navigate('/admin/users'); break;
      case 'files': navigate('/admin/files'); break;
      case 'system-health': navigate('/admin/health'); break;
      case 'access': navigate('/admin/access'); break;
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
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#050810]">
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
        onOpenContent={user.role === 'INSTRUCTOR' ? traverseToAdminEditor : verifyEnrollmentAndNavigate}
        onSelectLesson={(courseId, modId, lessId) => navigate(`/course/${courseId}/lesson/${lessId}`)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeLessonId={activeLesson?.id}
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
          <Routes>
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
              />
            } />

            {/* Feature Routes */}
            <Route path="/achievements" element={<AchievementsPage user={user} course={activeCourse} />} />
            <Route path="/history" element={<HistoryPageWrapper adminService={adminService} userId={user.id} />} />

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
            <Route path="/admin/files" element={<AdminRoute><FileManagement path="" onPathChange={() => { }} /></AdminRoute>} />
            <Route path="/admin/health" element={<AdminRoute><SystemHealth adminService={adminService} /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage adminService={adminService} /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
