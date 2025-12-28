import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import GeminiBuddy from './components/GeminiBuddy';
import AuthForm from './components/AuthForm';
import StudentDashboard from './components/StudentDashboard';
import AdminContentManagement from './components/AdminContentManagement';
import UserManagement from './components/UserManagement';
import AchievementsPage from './components/AchievementsPage';
import LessonMaterialsSidebar from './components/LessonMaterialsSidebar';
import CourseEnrollmentModal from './components/CourseEnrollmentModal';
import Breadcrumb from './components/Breadcrumb';
import LessonContentEditorPage from './components/LessonContentEditorPage';
import LessonViewer from './components/LessonViewer';
import HistoryPage from './components/HistoryPage';
import { IUserSession } from './domain/auth';
import { LessonRecord } from './domain/admin';
import { Achievement, Course, Lesson, Module, User } from './domain/entities';
import { SupabaseAuthRepository } from './repositories/SupabaseAuthRepository';
import { SupabaseCourseRepository } from './repositories/SupabaseCourseRepository';
import { SupabaseAdminRepository } from './repositories/SupabaseAdminRepository';
import { AuthService } from './services/AuthService';
import { CourseService } from './services/CourseService';
import { AdminService } from './services/AdminService';
import { createSupabaseClient } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<IUserSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]); // NOVO: cursos inscritos
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [lessonSidebarTab, setLessonSidebarTab] = useState<'materials' | 'notes'>('materials');
  const [adminSelection, setAdminSelection] = useState<{ courseId?: string; moduleId?: string; lessonId?: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null); // Estado para editor de conteúdo
  const [contentTheme, setContentTheme] = useState<'light' | 'dark'>('light'); // Estado para tema do conteúdo da aula
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para menu mobile

  // Estados do modal de inscrição
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  // Estados para modos de visualização nas telas de navegação
  type ViewMode = 'list' | 'grid' | 'minimal';
  const [moduleNavViewMode, setModuleNavViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('moduleNavViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [lessonNavViewMode, setLessonNavViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem('lessonNavViewMode');
    return (savedMode as ViewMode) || 'list';
  });

  const [initialBuddyMessage, setInitialBuddyMessage] = useState<string | undefined>(undefined);
  const [userHistory, setUserHistory] = useState<string[]>([]);

  const addToHistory = (action: string) => {
    if (!currentUser) return;

    // Format: "dd/mm HH:MM - Action"
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const entry = `${timestamp} - ${action}`;

    setUserHistory(prev => {
      const newState = [entry, ...prev].slice(0, 50);
      localStorage.setItem(`userHistory_${currentUser.id}`, JSON.stringify(newState));
      return newState;
    });
  };

  // Load History on Login
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`userHistory_${currentUser.id}`);
      if (saved) {
        try { setUserHistory(JSON.parse(saved)); } catch { }
      }
    } else {
      setUserHistory([]);
    }
  }, [currentUser]);

  const { authService, courseService, adminService } = useMemo(() => {
    const authRepo = new SupabaseAuthRepository();
    // DIP: Injetar SupabaseClient no repositório
    const supabaseClient = createSupabaseClient();
    const courseRepo = new SupabaseCourseRepository(supabaseClient);
    const adminRepo = new SupabaseAdminRepository();
    return {
      authService: new AuthService(authRepo),
      courseService: new CourseService(courseRepo),
      adminService: new AdminService(adminRepo)
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!activeAchievement) return;
    const timer = setTimeout(() => setActiveAchievement(null), 5000);
    return () => clearTimeout(timer);
  }, [activeAchievement]);

  useEffect(() => {
    if (activeAchievement || achievementQueue.length === 0) return;
    setActiveAchievement(achievementQueue[0]);
    setAchievementQueue(queue => queue.slice(1));
  }, [activeAchievement, achievementQueue]);

  useEffect(() => {
    const loadSessionAndProfile = async () => {
      try {
        const activeSession = await authService.restoreSession();
        if (activeSession) {
          setSession(activeSession);
          const profile = await courseService.fetchUserProfile(activeSession.user.id);
          setCurrentUser(profile);
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionAndProfile();
  }, [authService, courseService]);

  // Controle de Sessão Simultânea (Realtime)
  useEffect(() => {
    if (!session || !currentUser) return;

    const supabase = (authService as any).client; // Acessando o cliente para o realtime
    if (!supabase) return;

    const channel = supabase
      .channel(`profile_session_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`
        },
        async (payload: any) => {
          const newSessionId = payload.new.last_session_id;

          // Se o last_session_id no banco mudou e não é o ID da nossa sessão atual
          if (newSessionId && newSessionId !== session.sessionId) {
            console.warn('⚠️ Nova sessão detectada em outro dispositivo. Deslogando...');
            alert('Sua conta foi acessada em outro dispositivo. Esta sessão será encerrada.');
            handleLogout();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, currentUser, authService]);

  useEffect(() => {
    if (!session || !currentUser) return;

    const loadData = async () => {
      try {
        // Carregar TODOS os cursos e cursos INSCRITOS em paralelo
        const [allCourses, enrolled] = await Promise.all([
          courseService.fetchAvailableCourses(currentUser.id),
          courseService.fetchEnrolledCourses(currentUser.id)
        ]);

        setAvailableCourses(allCourses);
        setEnrolledCourses(enrolled);

        // Inicializar curso atual com primeiro inscrito (se houver)
        if (!course && enrolled.length > 0) {
          setCourse(enrolled[0]);
          setActiveModule(null);
          setCurrentLesson(enrolled[0].modules[0]?.lessons[0] || null);
          setLessonSidebarTab('materials');
        }
      } catch (err) {
        console.error('Failed to load courses', err);
        setAvailableCourses([]);
        setEnrolledCourses([]);
        setCourse(null);
        setCurrentLesson(null);
      }
    };

    loadData();
  }, [session, currentUser, courseService]);

  // Gerar breadcrumb baseado no estado atual
  const getBreadcrumbItems = () => {
    const items: Array<{ label: string; icon?: string; onClick?: () => void }> = [];

    // Sempre começa com Painel
    items.push({
      label: 'Painel',
      icon: 'fas fa-home',
      onClick: () => setActiveView('dashboard')
    });

    // Adicionar itens baseado na view
    if (activeView === 'dashboard') {
      // Já está em Painel, nada mais a adicionar
      return items;
    }

    if (activeView === 'courses') {
      items.push({ label: 'Meus Cursos', icon: 'fas fa-book' });
      return items;
    }

    if (activeView === 'achievements') {
      items.push({ label: 'Conquistas', icon: 'fas fa-trophy' });
      return items;
    }

    if (activeView === 'content') {
      items.push({ label: 'Gerenciar Conteúdo', icon: 'fas fa-cog' });
      return items;
    }

    if (activeView === 'users') {
      items.push({ label: 'Gerenciar Usuários', icon: 'fas fa-users' });
      return items;
    }

    // View de aula - caminho completo
    if (activeView === 'lesson' && course) {
      items.push({
        label: course.title,
        icon: 'fas fa-graduation-cap',
        onClick: () => {
          setCurrentLesson(null);
          setActiveModule(null);
        }
      });

      if (activeModule) {
        items.push({
          label: activeModule.title,
          icon: 'fas fa-layer-group',
          onClick: () => setCurrentLesson(null)
        });

        if (currentLesson) {
          items.push({
            label: currentLesson.title,
            icon: 'fas fa-play-circle'
          });
        }
      }
    }

    return items;
  };

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const enqueueAchievements = (achievements: Achievement[]) => {
    if (achievements.length === 0) return;

    setAchievementQueue(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      if (activeAchievement) existingIds.add(activeAchievement.id);

      const toAdd = achievements.filter(a => !existingIds.has(a.id));
      return [...prev, ...toAdd];
    });
  };

  const handleProgressUpdate = async (watchedSeconds: number, lastBlockId?: string) => {
    if (!currentLesson || !course || !currentUser) return;

    const becameCompleted = currentLesson.updateProgress(watchedSeconds);
    const achievements = await courseService.updateUserProgress(currentUser, currentLesson, course, becameCompleted, lastBlockId);
    enqueueAchievements(achievements);

    setCurrentUser(currentUser.clone());
    const nextCourse = new Course(course.id, course.title, course.description, course.imageUrl, [...course.modules]);
    setCourse(nextCourse);
    setAvailableCourses(prev => prev.map(c => (c.id === nextCourse.id ? nextCourse : c)));
  };

  const handleCourseClick = (courseId: string) => {
    const selected = availableCourses.find(c => c.id === courseId) || null;
    if (selected) {
      setCourse(selected);
      setActiveModule(null);
      setCurrentLesson(null);
    }
    setLessonSidebarTab('materials');
    setActiveView('lesson');
  };

  const handleSelectModule = (moduleId: string) => {
    if (!course) return;
    const mod = course.modules.find(m => m.id === moduleId) || null;
    setActiveModule(mod);
    setCurrentLesson(null);
    setLessonSidebarTab('materials');
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setLessonSidebarTab('materials');
    if (course) {
      addToHistory(`Abriu a aula "${lesson.title}" [ID_CURSO:${course.id}|ID_AULA:${lesson.id}]`);
    }
  };

  const handleManageCourse = (courseId: string) => {
    setAdminSelection({ courseId });
    setActiveView('content');
  };


  const handleEnrollAndStart = async (courseId: string) => {
    if (!currentUser) return;

    // Verificar se já está inscrito
    const isEnrolled = enrolledCourses.some(c => c.id === courseId);

    if (isEnrolled) {
      // Se já inscrito, apenas inicia o curso
      handleCourseClick(courseId);
    } else {
      // Se não inscrito, abre modal de confirmação
      const courseToEnroll = availableCourses.find(c => c.id === courseId);
      if (courseToEnroll) {
        setSelectedCourseForEnrollment(courseToEnroll);
        setIsEnrollmentModalOpen(true);
      }
    }
  };

  const confirmEnrollment = async () => {
    if (!currentUser || !selectedCourseForEnrollment) return;

    setIsEnrolling(true);

    try {
      // Inscrever
      await courseService.enrollUserInCourse(currentUser.id, selectedCourseForEnrollment.id);

      // Recarregar cursos inscritos
      const updatedEnrolled = await courseService.fetchEnrolledCourses(currentUser.id);
      setEnrolledCourses(updatedEnrolled);

      // Fechar modal
      setIsEnrollmentModalOpen(false);
      setSelectedCourseForEnrollment(null);

      // Iniciar o curso
      handleCourseClick(selectedCourseForEnrollment.id);
    } catch (err) {
      console.error('Erro ao inscrever', err);
      // TODO: Mostrar toast de erro
    } finally {
      setIsEnrolling(false);
    }
  };

  // --- PERSISTENCE, WELCOME BACK & ONBOARDING LOGIC ---
  useEffect(() => {
    if (activeView === 'lesson' && course && currentLesson && currentUser) {
      localStorage.setItem(`userActivityState_${currentUser.id}`, JSON.stringify({
        timestamp: Date.now(),
        courseId: course.id,
        activeModuleId: activeModule?.id,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title
      }));
    }
  }, [activeView, course, currentLesson, activeModule, currentUser]);

  // Check for returning user OR new user on mount
  useEffect(() => {
    if (!currentUser) return;

    const checkState = () => {
      // 1. Check for "Welcome Back" (Returning User > 15min)
      const savedState = localStorage.getItem(`userActivityState_${currentUser.id}`);
      let restored = false;

      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          const timeDiff = Date.now() - state.timestamp;
          const fifteenMinutes = 15 * 60 * 1000;

          if (timeDiff > fifteenMinutes) {
            setInitialBuddyMessage(
              `👋 Olá de novo, ${currentUser.name}! Percebi que você estava estudando **"${state.lessonTitle}"** antes de sair. Quer continuar de onde parou? [[RESUME:${state.courseId}:${state.lessonId}]]`
            );
            restored = true;
          }
        } catch (e) {
          console.error("Error parsing user state", e);
        }
      }

      // 2. Check for Onboarding (New User / First Time)
      if (!restored) {
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${currentUser.id}`);
        if (!hasSeenOnboarding) {
          setInitialBuddyMessage(
            `👋 Olá, ${currentUser.name}! Bem-vindo ao Sistema de Estudos. 🚀\n\nEu sou o seu assistente pessoal. Gostaria de fazer um tour rápido para conhecer as funcionalidades do sistema?`
          );
          localStorage.setItem(`hasSeenOnboarding_${currentUser.id}`, 'true');
        }
      }
    };

    checkState();
  }, [currentUser]);

  // Handle Buddy Navigation Action
  const handleBuddyNavigate = (targetCourseId: string, targetLessonId: string) => {
    const targetCourse = availableCourses.find(c => c.id === targetCourseId);
    if (!targetCourse) return;

    // Find lesson and module
    let foundLesson: Lesson | undefined;
    let foundModule: Module | undefined;

    for (const mod of targetCourse.modules) {
      const lesson = mod.lessons.find(l => l.id === targetLessonId);
      if (lesson) {
        foundLesson = lesson;
        foundModule = mod;
        break;
      }
    }

    if (foundLesson && foundModule) {
      setCourse(targetCourse);
      setActiveModule(foundModule);
      setCurrentLesson(foundLesson);
      setActiveView('lesson');
      setInitialBuddyMessage(undefined);
    }
  };

  // Funções para alternar modos de visualização nas telas de navegação
  const toggleModuleNavViewMode = (mode: ViewMode) => {
    setModuleNavViewMode(mode);
    localStorage.setItem('moduleNavViewMode', mode);
  };

  const toggleLessonNavViewMode = (mode: ViewMode) => {
    setLessonNavViewMode(mode);
    localStorage.setItem('lessonNavViewMode', mode);
  };

  // Componente de toggle de visualização
  const ViewModeToggle: React.FC<{ current: ViewMode; onChange: (mode: ViewMode) => void; }> = ({ current, onChange }) => (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
      <button onClick={() => onChange('list')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Lista">
        <i className="fas fa-list"></i>
      </button>
      <button onClick={() => onChange('grid')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Grade">
        <i className="fas fa-th"></i>
      </button>
      <button onClick={() => onChange('minimal')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'minimal' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Minimalista">
        <i className="fas fa-square"></i>
      </button>
    </div>
  );


  const handleOpenContentFromSidebar = (courseId: string, moduleId?: string, lessonId?: string) => {
    // Se clicou em uma aula específica, abrir diretamente o editor
    if (lessonId && moduleId) {
      const course = availableCourses.find(c => c.id === courseId);
      const module = course?.modules.find(m => m.id === moduleId);
      const lesson = module?.lessons.find(l => l.id === lessonId);

      if (lesson) {
        // Converter Lesson entity para LessonRecord (snake_case)
        const lessonRecord: LessonRecord = {
          id: lesson.id,
          module_id: moduleId,
          title: lesson.title,
          content: lesson.content,
          video_url: lesson.videoUrl,
          audio_url: lesson.audioUrl,
          image_url: lesson.imageUrl,
          duration_seconds: lesson.durationSeconds,
          position: lesson.position ?? 0,
          content_blocks: lesson.contentBlocks,
          created_at: new Date().toISOString() // Placeholder, não crítico para edição
        };

        setEditingLesson(lessonRecord);
        setActiveView('content-editor');
        return;
      }
    }

    setAdminSelection({ courseId, moduleId, lessonId });
    setActiveView('content');
  };

  const handleSelectLessonDetailed = (courseId: string, moduleId: string, lessonId: string) => {
    const targetCourse = availableCourses.find(c => c.id === courseId);
    if (!targetCourse) return;

    const module = targetCourse.modules.find(m => m.id === moduleId);
    const lesson = module?.lessons.find(l => l.id === lessonId);

    if (lesson && module) {
      setCourse(targetCourse);
      setActiveModule(module);
      setCurrentLesson(lesson);
      setActiveView('lesson');
      setLessonSidebarTab('materials');
      setIsMobileMenuOpen(false);
      addToHistory(`Abriu a aula "${lesson.title}" [ID_CURSO:${targetCourse.id}|ID_AULA:${lesson.id}]`);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
    setCurrentUser(null);
    setAvailableCourses([]);
    setCourse(null);
    setCurrentLesson(null);
    setAdminSelection(null);
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
    return (
      <AuthForm
        authService={authService}
        onSuccess={async () => {
          const s = await authService.restoreSession();
          if (s) {
            setSession(s);
            const profile = await courseService.fetchUserProfile(s.user.id);
            setCurrentUser(profile);
          }
        }}
      />
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <StudentDashboard
            user={currentUser}
            courses={availableCourses}  // TODOS os cursos
            onCourseClick={handleEnrollAndStart}  // Handler de inscrição
            showEnrollButton={true}  // Mostrar bot ão de inscrever
            enrolledCourseIds={enrolledCourses.map(c => c.id)}  // IDs inscritos para badges
            onManageCourse={currentUser.role === 'INSTRUCTOR' ? handleManageCourse : undefined}
            onManageContent={
              currentUser.role === 'INSTRUCTOR'
                ? () => {
                  setAdminSelection(null);
                  setActiveView('content');
                }
                : undefined
            }
            sectionTitle="Cursos da Plataforma"
          />
        );
      case 'courses':
        return (
          <StudentDashboard
            user={currentUser}
            courses={enrolledCourses}  // APENAS cursos inscritos
            onCourseClick={handleCourseClick}  // Handler padrão
            showEnrollButton={false}  // Sem botão de inscrever
            onManageCourse={currentUser.role === 'INSTRUCTOR' ? handleManageCourse : undefined}
            onManageContent={
              currentUser.role === 'INSTRUCTOR'
                ? () => {
                  setAdminSelection(null);
                  setActiveView('content');
                }
                : undefined
            }
            sectionTitle="Meus Cursos"
          />
        );
      case 'achievements':
        return <AchievementsPage user={currentUser} course={course} />;
      case 'history':
        return <HistoryPage history={userHistory} />;
      case 'content':
        return currentUser.role === 'INSTRUCTOR' ? (
          <AdminContentManagement
            adminService={adminService}
            initialCourseId={adminSelection?.courseId}
            initialModuleId={adminSelection?.moduleId}
            initialLessonId={adminSelection?.lessonId}
            onOpenContentEditor={(lesson) => {
              setEditingLesson(lesson);
              setActiveView('content-editor');
            }}
          />
        ) : (
          <div className="p-8">Acesso negado.</div>
        );
      case 'users':
        return currentUser.role === 'INSTRUCTOR' ? <UserManagement adminService={adminService} /> : <div className="p-8">Acesso negado.</div>;

      case 'content-editor':
        if (!editingLesson) return <div className="p-8">Nenhuma aula selecionada para edição.</div>;
        return (
          <LessonContentEditorPage
            lesson={editingLesson}
            apiKey={currentUser.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY}
            onSave={async (newContent, metadata) => {
              try {
                // Atualizar aula no backend
                const updatedLesson = await adminService.updateLesson(editingLesson.id, {
                  title: metadata?.title || editingLesson.title,
                  content: newContent,
                  videoUrl: metadata?.video_url ?? editingLesson.video_url,
                  imageUrl: metadata?.image_url ?? editingLesson.image_url,
                  durationSeconds: metadata?.duration_seconds ?? editingLesson.duration_seconds,
                  position: editingLesson.position,
                  contentBlocks: metadata?.content_blocks ?? editingLesson.content_blocks
                });

                // Atualizar o editingLesson com os dados frescos do banco
                setEditingLesson(updatedLesson);

                console.log('✅ Aula atualizada e recarregada com sucesso!');
              } catch (error) {
                console.error('❌ Erro ao salvar aula:', error);
                alert('Erro ao salvar a aula. Verifique o console para mais detalhes.');
              }
            }}
            onCancel={() => {
              setEditingLesson(null);
              setActiveView('content');
            }}
          />
        );

      case 'lesson': {
        if (!course) return <div className="p-8">Carregando curso...</div>;

        // Etapa 1: escolher módulo
        if (!activeModule) {
          return (
            <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
              <button
                onClick={() => setActiveView('dashboard')}
                className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider"
              >
                <i className="fas fa-arrow-left"></i> Voltar ao Painel
              </button>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Escolha um módulo</h2>
                  <ViewModeToggle current={moduleNavViewMode} onChange={toggleModuleNavViewMode} />
                </div>

                {/* Modo Grade */}
                {moduleNavViewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.modules.map(m => (
                      <div key={m.id} onClick={() => handleSelectModule(m.id)} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/20 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group hover:shadow-lg">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            <i className="fas fa-layer-group text-lg"></i>
                          </div>
                          <i className="fas fa-arrow-right text-slate-400 group-hover:text-indigo-500 transition"></i>
                        </div>
                        <p className="text-base font-black text-slate-800 dark:text-white mb-2">{m.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                          <i className="fas fa-play-circle mr-1"></i>{m.lessons.length} Aulas
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modo Minimalista */}
                {moduleNavViewMode === 'minimal' && (
                  <div className="space-y-2">
                    {course.modules.map(m => (
                      <div key={m.id} onClick={() => handleSelectModule(m.id)} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <i className="fas fa-layer-group"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.lessons.length} aulas</p>
                        </div>
                        <i className="fas fa-chevron-right text-slate-400 group-hover:text-indigo-500 transition"></i>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modo Lista (padrão) */}
                {moduleNavViewMode === 'list' && (
                  <div className="space-y-3">
                    {course.modules.map(m => (
                      <div key={m.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-indigo-400 transition cursor-pointer flex items-center justify-between" onClick={() => handleSelectModule(m.id)}>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{m.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aulas: {m.lessons.length}</p>
                        </div>
                        <i className="fas fa-chevron-right text-slate-400"></i>
                      </div>
                    ))}
                  </div>
                )}
                {course.modules.length === 0 && <p className="text-sm text-slate-500">Nenhum módulo disponível.</p>}
              </div>
            </div>
          );
        }

        // Etapa 2: escolher aula do módulo selecionado  
        if (activeModule && !currentLesson) {
          return (
            <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
              <button onClick={() => { setActiveModule(null); setCurrentLesson(null); }} className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider">
                <i className="fas fa-arrow-left"></i> Voltar aos módulos
              </button>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Aulas de {activeModule.title}</h2>
                  <ViewModeToggle current={lessonNavViewMode} onChange={toggleLessonNavViewMode} />
                </div>

                {/* Modo Grade */}
                {lessonNavViewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeModule.lessons.map(lesson => (
                      <div key={lesson.id} onClick={() => handleSelectLesson(lesson)} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/20 hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer group hover:shadow-lg">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <i className="fas fa-play text-lg"></i>
                          </div>
                          <i className="fas fa-arrow-right text-slate-400 group-hover:text-purple-500 transition"></i>
                        </div>
                        <p className="text-base font-black text-slate-800 dark:text-white mb-2">{lesson.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                          <i className="fas fa-clock mr-1"></i>Duração: {(lesson.durationSeconds ?? 0).toLocaleString()}s
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modo Minimalista */}
                {lessonNavViewMode === 'minimal' && (
                  <div className="space-y-2">
                    {activeModule.lessons.map(lesson => (
                      <div key={lesson.id} onClick={() => handleSelectLesson(lesson)} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                          <i className="fas fa-play"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{lesson.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{(lesson.durationSeconds ?? 0).toLocaleString()}s</p>
                        </div>
                        <i className="fas fa-play text-purple-500"></i>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modo Lista (padrão) */}
                {lessonNavViewMode === 'list' && (
                  <div className="space-y-3">
                    {activeModule.lessons.map(lesson => (
                      <div key={lesson.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-indigo-400 transition cursor-pointer flex items-center justify-between" onClick={() => handleSelectLesson(lesson)}>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{lesson.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Duração: {(lesson.durationSeconds ?? 0).toLocaleString()}s</p>
                        </div>
                        <i className="fas fa-play text-indigo-500"></i>
                      </div>
                    ))}
                  </div>
                )}
                {activeModule.lessons.length === 0 && <p className="text-sm text-slate-500">Nenhuma aula neste módulo.</p>}
              </div>
            </div>
          );
        }

        // Etapa 3: player da aula selecionada
        const lessonToPlay = currentLesson;
        if (!lessonToPlay) return <div className="p-8">Nenhuma aula disponível.</div>;

        return (
          <LessonViewer
            course={course}
            lesson={lessonToPlay}
            user={currentUser}
            onLessonSelect={handleSelectLesson}
            onProgressUpdate={handleProgressUpdate}
            onBackToLessons={() => setCurrentLesson(null)}
            onBackToModules={() => {
              setActiveModule(null);
              setCurrentLesson(null);
            }}
            contentTheme={contentTheme}
            setContentTheme={setContentTheme}
            sidebarTab={lessonSidebarTab}
            setSidebarTab={setLessonSidebarTab}
            onTrackAction={addToHistory}
          />
        );
      }
      default:
        return (
          <StudentDashboard
            user={currentUser}
            courses={availableCourses}
            onCourseClick={handleCourseClick}
            onManageCourse={currentUser.role === 'INSTRUCTOR' ? handleManageCourse : undefined}
            onManageContent={
              currentUser.role === 'INSTRUCTOR'
                ? () => {
                  setAdminSelection(null);
                  setActiveView('content');
                }
                : undefined
            }
          />
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen w-full bg-white dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-lexend relative overflow-x-hidden">
      <Sidebar
        session={session}
        activeView={activeView}
        onViewChange={(view, keepMobileOpen = false) => {
          setActiveView(view);
          if (!keepMobileOpen) setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        courses={enrolledCourses}
        onOpenContent={(courseId, moduleId, lessonId) => {
          // Security Check: Verify enrollment
          const isEnrolled = enrolledCourses.some(c => c.id === courseId);
          if (!isEnrolled) {
            alert("Você precisa se inscrever neste curso para acessar o conteúdo.");
            return;
          }
          handleOpenContentFromSidebar(courseId, moduleId, lessonId);
        }}
        onSelectLesson={handleSelectLessonDetailed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeLessonId={currentLesson?.id || editingLesson?.id} // Destaca aula atual ou aula sendo editada
      />

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Breadcrumb Navigation / Header */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden h-full">
        <header className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-[#0a0e14] border-b border-slate-200 dark:border-slate-800 lg:hidden sticky top-0 z-50">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs rotate-3">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <h1 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tighter">StudySystem</h1>
          </div>
        </header>

        <div className="hidden lg:block">
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent scroll-smooth relative">
          {renderContent()}

          {activeAchievement && (
            <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-[2px] rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)]">
                <div className="bg-slate-950 px-6 py-5 rounded-[22px] flex items-center gap-5 min-w-[340px]">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-yellow-400 text-2xl border border-white/10 shadow-inner">
                    <i className={`fas ${activeAchievement.icon}`}></i>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-1">
                      Medalha Desbloqueada!
                    </span>
                    <h4 className="text-lg font-black text-white leading-tight tracking-tight">{activeAchievement.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{activeAchievement.description}</p>
                  </div>
                  <button onClick={() => setActiveAchievement(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Confirmação de Inscrição */}
      {selectedCourseForEnrollment && (
        <CourseEnrollmentModal
          course={selectedCourseForEnrollment}
          isOpen={isEnrollmentModalOpen}
          onClose={() => {
            setIsEnrollmentModalOpen(false);
            setSelectedCourseForEnrollment(null);
          }}
          onConfirm={confirmEnrollment}
          isLoading={isEnrolling}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `
        }}
      />

      {/* Global AI Assistant */}
      {session && currentUser && (
        <GeminiBuddy
          key={currentUser.id} // Forces complete reset when user changes
          apiKey={currentUser.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY}
          userName={currentUser.name}
          systemContext={`
            Estatísticas do Sistema (Dados em tempo real):
            - Total de Cursos na Plataforma: ${availableCourses.length}
            - Cursos Inscritos pelo Aluno: ${enrolledCourses.length}
            
            HISTÓRICO DE ATIVIDADES DO USUÁRIO (Use estas informações para responder perguntas sobre "onde parei", "o que fiz", etc):
            ${userHistory.length > 0 ? userHistory.slice(0, 10).map((item, idx) => `${idx + 1}. ${item}`).join('\n            ') : 'Nenhuma atividade registrada ainda.'}
            
            Contexto de Navegação:
            ${activeView === 'admin'
              ? "O usuário está na Área Administrativa. Ele pode criar/editar cursos e gerenciar usuários."
              : activeView === 'lesson' && course && activeModule && currentLesson
                ? `O aluno está na aula "${currentLesson.title}" (Módulo: ${activeModule.title}).`
                : "O aluno está no Painel Principal. Aqui ele vê seus cursos e conquistas."}
          `}
          currentContext={
            activeView === 'lesson' && currentLesson
              ? (currentLesson.contentBlocks && currentLesson.contentBlocks.length > 0
                ? currentLesson.contentBlocks.map(b => b.text).join('\n\n')
                : currentLesson.content)
              : undefined
          }
          initialMessage={initialBuddyMessage}
          onNavigate={handleBuddyNavigate}
        />
      )}
    </div>
  );
};

export default App;