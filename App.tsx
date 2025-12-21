
import React, { useState, useEffect, useMemo } from 'react';
import { SupabaseCourseRepository } from './repositories/SupabaseCourseRepository';
import { SupabaseAuthRepository } from './repositories/SupabaseAuthRepository';
import { CourseService } from './services/CourseService';
import { AuthService } from './services/AuthService';
import { Course, Lesson, User, Achievement } from './domain/entities';
import { IUserSession } from './domain/auth';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import GeminiBuddy from './components/GeminiBuddy';
import AuthForm from './components/AuthForm';
import StudentDashboard from './components/StudentDashboard';
import AdminContentManagement from './components/AdminContentManagement';
import UserManagement from './components/UserManagement';

const App: React.FC = () => {
  const [session, setSession] = useState<IUserSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
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

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Limpa a notificação após 5 segundos
  useEffect(() => {
    if (unlockedAchievement) {
      const timer = setTimeout(() => setUnlockedAchievement(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [unlockedAchievement]);

  useEffect(() => {
    const existingSession = authService.getCurrentSession();
    if (existingSession) {
      setSession(existingSession);
      const user = new User(
        existingSession.user.id,
        existingSession.user.name,
        existingSession.user.email,
        existingSession.user.role,
        850 // XP inicial para teste (perto do nível 2)
      );
      setCurrentUser(user);
    }
    setIsLoading(false);
  }, [authService]);

  useEffect(() => {
    if (!session) return;
    const loadData = async () => {
      try {
        const data = await courseService.loadCourseDetails('course-1');
        setCourse(data);
      } catch (err) {
        console.error("Failed to load course", err);
      }
    };
    loadData();
  }, [session, courseService]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleProgressUpdate = async (watchedSeconds: number) => {
    if (!currentLesson || !course || !currentUser) return;
    
    currentLesson.updateProgress(watchedSeconds);
    
    // Captura conquista via serviço
    const achievement = await courseService.updateUserProgress(currentUser, currentLesson, course);
    
    if (achievement) {
      setUnlockedAchievement(achievement);
    }
    
    // Atualiza estado local mantendo imutabilidade
    setCurrentUser(currentUser.clone());
    setCourse(new Course(course.id, course.title, course.description, [...course.modules]));
  };

  const handleLogout = () => {
    authService.logout();
    setSession(null);
    setCurrentUser(null);
    setActiveView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#050810]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session || !currentUser) {
    return <AuthForm authService={authService} onSuccess={() => {
      const s = authService.getCurrentSession();
      setSession(s);
      if (s) setCurrentUser(new User(s.user.id, s.user.name, s.user.email, s.user.role));
    }} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <StudentDashboard user={currentUser} onCourseClick={() => setActiveView('lesson')} />;
      case 'lesson':
        if (!course) return <div className="p-8">Carregando curso...</div>;
        const lessonToPlay = currentLesson || course.modules[0].lessons[0];
        if (!currentLesson) setCurrentLesson(lessonToPlay);
        
        return (
          <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <button onClick={() => setActiveView('dashboard')} className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider">
                  <i className="fas fa-arrow-left"></i> Voltar ao Painel
               </button>
               <VideoPlayer lesson={lessonToPlay} onProgress={handleProgressUpdate} />
               <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                 <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{lessonToPlay.title}</h2>
                 <p className="text-slate-500 dark:text-slate-400 font-medium">Estudos Acadêmicos de ADS • Engenharia de Software</p>
                 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${lessonToPlay.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'}`}></div>
                       <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                          {lessonToPlay.isCompleted ? 'Aula Concluída' : 'Em progresso'}
                       </span>
                    </div>
                    {lessonToPlay.isCompleted && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-xs uppercase animate-bounce">
                        <i className="fas fa-check-circle"></i>
                        <span>+150 XP CREDITADOS!</span>
                      </div>
                    )}
                 </div>
               </div>
            </div>
            <div className="space-y-6">
               <GeminiBuddy currentContext={`${course.title} - ${lessonToPlay.title}`} />
            </div>
          </div>
        );
      default:
        return <StudentDashboard user={currentUser} onCourseClick={() => setActiveView('lesson')} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-lexend">
      <Sidebar 
        session={session} 
        activeView={activeView} 
        onViewChange={setActiveView} 
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent scroll-smooth relative">
        {renderContent()}

        {/* Feedback de Conquista (Achievement Toast) */}
        {unlockedAchievement && (
          <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-[2px] rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)]">
              <div className="bg-slate-950 px-6 py-5 rounded-[22px] flex items-center gap-5 min-w-[340px]">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-yellow-400 text-2xl border border-white/10 shadow-inner">
                  <i className={`fas ${unlockedAchievement.icon}`}></i>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-1">Medalha Desbloqueada!</span>
                  <h4 className="text-lg font-black text-white leading-tight tracking-tight">{unlockedAchievement.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{unlockedAchievement.description}</p>
                </div>
                <button onClick={() => setUnlockedAchievement(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default App;
