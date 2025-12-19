
import React, { useState, useEffect, useMemo } from 'react';
import { SupabaseCourseRepository } from './repositories/SupabaseCourseRepository';
import { SupabaseAuthRepository } from './repositories/SupabaseAuthRepository';
import { CourseService } from './services/CourseService';
import { AuthService } from './services/AuthService';
import { Course, Lesson } from './domain/entities';
import { IUserSession } from './domain/auth';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import GeminiBuddy from './components/GeminiBuddy';
import AuthForm from './components/AuthForm';
import StudentDashboard from './components/StudentDashboard';
import AdminContentManagement from './components/AdminContentManagement';

const App: React.FC = () => {
  const [session, setSession] = useState<IUserSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const { authService, courseService } = useMemo(() => {
    const authRepo = new SupabaseAuthRepository();
    const courseRepo = new SupabaseCourseRepository();
    return {
      authService: new AuthService(authRepo),
      courseService: new CourseService(courseRepo)
    };
  }, []);

  // Sync theme with document element class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const existingSession = authService.getCurrentSession();
    if (existingSession) setSession(existingSession);
    setIsLoading(false);
  }, [authService]);

  useEffect(() => {
    if (!session) return;
    const loadData = async () => {
      try {
        const data = await courseService.loadCourseDetails('course-1');
        setCourse(data);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, [session, courseService]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleProgressUpdate = async (watchedSeconds: number) => {
    if (!currentLesson || !course || !session) return;
    currentLesson.updateProgress(watchedSeconds);
    await courseService.updateUserProgress(session.user.id, currentLesson);
    setCourse(new Course(course.id, course.title, course.description, [...course.modules]));
  };

  const handleLogout = () => {
    authService.logout();
    setSession(null);
    setActiveView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#050810]">
        <div className="w-12 h-12 border-4 border-[#0084ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm authService={authService} onSuccess={() => setSession(authService.getCurrentSession())} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <StudentDashboard session={session} onCourseClick={() => setActiveView('lesson')} />;
      case 'content':
        return session.user.role === 'INSTRUCTOR' ? <AdminContentManagement /> : <StudentDashboard session={session} onCourseClick={() => setActiveView('lesson')} />;
      case 'lesson':
        if (!course) return <div>Carregando curso...</div>;
        const lessonToPlay = currentLesson || course.modules[0].lessons[0];
        return (
          <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <button onClick={() => setActiveView('dashboard')} className="text-slate-500 dark:text-slate-400 text-sm font-bold flex items-center gap-2 hover:text-blue-500 transition">
                  <i className="fas fa-arrow-left"></i> Voltar ao Dashboard
               </button>
               <VideoPlayer lesson={lessonToPlay} onProgress={handleProgressUpdate} />
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-4">{lessonToPlay.title}</h2>
               <p className="text-slate-500 dark:text-slate-400">{course.title}</p>
            </div>
            <div className="space-y-6">
               <GeminiBuddy currentContext={`${course.title} - ${lessonToPlay.title}`} />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            Página "{activeView}" em desenvolvimento.
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar 
        session={session} 
        activeView={activeView} 
        onViewChange={setActiveView} 
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
