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
import { IUserSession } from './domain/auth';
import { LessonRecord } from './domain/admin';
import { Achievement, Course, Lesson, Module, User } from './domain/entities';
import { SupabaseAuthRepository } from './repositories/SupabaseAuthRepository';
import { SupabaseCourseRepository } from './repositories/SupabaseCourseRepository';
import { SupabaseAdminRepository } from './repositories/SupabaseAdminRepository';
import { AuthService } from './services/AuthService';
import { CourseService } from './services/CourseService';
import { AdminService } from './services/AdminService';

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
  const [lessonSidebarTab, setLessonSidebarTab] = useState<'materials' | 'buddy'>('materials');
  const [adminSelection, setAdminSelection] = useState<{ courseId?: string; moduleId?: string; lessonId?: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null); // Estado para editor de conteúdo
  const [contentTheme, setContentTheme] = useState<'light' | 'dark'>('light'); // Estado para tema do conteúdo da aula

  // Estados do modal de inscrição
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState<Course | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const { authService, courseService, adminService } = useMemo(() => {
    const authRepo = new SupabaseAuthRepository();
    const courseRepo = new SupabaseCourseRepository();
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

  const handleProgressUpdate = async (watchedSeconds: number) => {
    if (!currentLesson || !course || !currentUser) return;

    const becameCompleted = currentLesson.updateProgress(watchedSeconds);
    const achievements = await courseService.updateUserProgress(currentUser, currentLesson, course, becameCompleted);
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

  const handleSelectLesson = (lessonId: string) => {
    if (!activeModule) return;
    const lesson = activeModule.lessons.find(l => l.id === lessonId) || null;
    setCurrentLesson(lesson);
    setLessonSidebarTab('materials');
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
            onSave={async (newContent, metadata) => {
              // Atualizar aula no backend
              await adminService.updateLesson(editingLesson.id, {
                title: metadata?.title || editingLesson.title,
                content: newContent,
                videoUrl: metadata?.video_url ?? editingLesson.video_url,
                imageUrl: metadata?.image_url ?? editingLesson.image_url,
                durationSeconds: metadata?.duration_seconds ?? editingLesson.duration_seconds,
                position: editingLesson.position
              });
              // Voltar para gerenciamento de conteúdo
              setEditingLesson(null);
              setActiveView('content');
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
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Escolha um módulo</h2>
                <div className="space-y-3">
                  {course.modules.map(m => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-indigo-400 transition cursor-pointer flex items-center justify-between"
                      onClick={() => handleSelectModule(m.id)}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{m.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aulas: {m.lessons.length}</p>
                      </div>
                      <i className="fas fa-chevron-right text-slate-400"></i>
                    </div>
                  ))}
                  {course.modules.length === 0 && <p className="text-sm text-slate-500">Nenhum módulo disponível.</p>}
                </div>
              </div>
            </div>
          );
        }

        // Etapa 2: escolher aula do módulo selecionado
        if (activeModule && !currentLesson) {
          return (
            <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
              <button
                onClick={() => {
                  setActiveModule(null);
                  setCurrentLesson(null);
                }}
                className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider"
              >
                <i className="fas fa-arrow-left"></i> Voltar aos módulos
              </button>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Aulas de {activeModule.title}</h2>
                <div className="space-y-3">
                  {activeModule.lessons.map(lesson => (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-indigo-400 transition cursor-pointer flex items-center justify-between"
                      onClick={() => handleSelectLesson(lesson.id)}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{lesson.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Duração: {(lesson.durationSeconds ?? 0).toLocaleString()}s
                        </p>
                      </div>
                      <i className="fas fa-play text-indigo-500"></i>
                    </div>
                  ))}
                  {activeModule.lessons.length === 0 && <p className="text-sm text-slate-500">Nenhuma aula neste módulo.</p>}
                </div>
              </div>
            </div>
          );
        }

        // Etapa 3: player da aula selecionada
        const lessonToPlay = currentLesson;
        if (!lessonToPlay) return <div className="p-8">Nenhuma aula disponível.</div>;

        return (
          <div className="max-w-[1800px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9 space-y-6">
              <button
                onClick={() => {
                  setCurrentLesson(null);
                }}
                className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider"
              >
                <i className="fas fa-arrow-left"></i> Voltar às aulas
              </button>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{lessonToPlay.title}</h2>
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Estudos Acadêmicos de ADS · Engenharia de Software
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${lessonToPlay.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'
                        }`}
                    ></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {lessonToPlay.isCompleted ? 'Aula Concluída' : 'Em progresso'}
                    </span>
                    {lessonToPlay.isCompleted && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-xs uppercase animate-bounce ml-4">
                        <i className="fas fa-check-circle"></i>
                        <span>+150 XP CREDITADOS!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <VideoPlayer lesson={lessonToPlay} onProgress={handleProgressUpdate} />

              {/* Conteúdo da Matéria (Texto) */}
              {lessonToPlay.content && (
                <div className={`p-8 rounded-3xl border shadow-sm transition-colors ${contentTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className={`flex items-center justify-between mb-6 pb-4 border-b ${contentTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contentTheme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                        <i className={`fas fa-book-open ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                      </div>
                      <div>
                        <h3 className={`text-lg font-black ${contentTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Conteúdo da Aula</h3>
                        <p className={`text-xs ${contentTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Material de apoio e orientações</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setContentTheme(prev => prev === 'light' ? 'dark' : 'light')}
                      className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md ${contentTheme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700 hover:text-yellow-300'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        }`}
                      title={contentTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                    >
                      <i className={`fas ${contentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                      <span>{contentTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>
                  </div>
                  <div
                    className={`leading-relaxed lesson-content-view ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.8'
                    }}
                    dangerouslySetInnerHTML={{ __html: lessonToPlay.content }}
                  />
                </div>
              )}


            </div>
            <div className="lg:col-span-3 space-y-6 sticky top-8 h-fit self-start">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex">
                <button
                  onClick={() => setLessonSidebarTab('materials')}
                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${lessonSidebarTab === 'materials'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                >
                  Materiais
                </button>
                <button
                  onClick={() => setLessonSidebarTab('buddy')}
                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${lessonSidebarTab === 'buddy'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                >
                  Buddy AI
                </button>
              </div>

              {lessonSidebarTab === 'materials' ? (
                <LessonMaterialsSidebar lesson={lessonToPlay} />
              ) : (
                <GeminiBuddy currentContext={`${course.title} - ${lessonToPlay.title}`} />
              )}
            </div>
          </div>
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
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-lexend">
      <Sidebar
        session={session}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        courses={availableCourses}
        onOpenContent={handleOpenContentFromSidebar}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Breadcrumb items={getBreadcrumbItems()} />

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
    </div>
  );
};

export default App;

