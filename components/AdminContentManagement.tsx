
import React, { useEffect, useMemo, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord, LessonRecord, LessonResourceRecord, ModuleRecord } from '../domain/admin';
import { fileUploadService } from '../services/FileUploadService';
import ResourceUploadForm from './ResourceUploadForm';
import CreateCourseModal from './CreateCourseModal';
import CreateModuleModal from './CreateModuleModal';
import CreateLessonModal from './CreateLessonModal';

type Props = {
  adminService: AdminService;
  initialCourseId?: string;
  initialModuleId?: string;
  initialLessonId?: string;
  onOpenContentEditor?: (lesson: LessonRecord) => void; // NOVO: callback para abrir editor
};

const AdminContentManagement: React.FC<Props> = ({ adminService, initialCourseId, initialModuleId, onOpenContentEditor }) => {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string>('');
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, ModuleRecord[]>>({});
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, LessonRecord[]>>({});
  const [lessonResources, setLessonResources] = useState<Record<string, LessonResourceRecord[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [activeCourseIdForModuleCreation, setActiveCourseIdForModuleCreation] = useState<string | null>(null);
  const [activeModuleIdForLessonCreation, setActiveModuleIdForLessonCreation] = useState<string | null>(null);

  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);

  const [activeLesson, setActiveLesson] = useState<LessonRecord | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<LessonResourceRecord['resource_type']>('PDF');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourcePosition, setNewResourcePosition] = useState<number>(0);

  // Estados para upload de arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file'); // Padrão: upload de arquivo

  // Estados para edição de recursos
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResourceTitle, setEditingResourceTitle] = useState('');

  // Estados para modos de visualização
  type ViewMode = 'list' | 'grid' | 'minimal';
  const [moduleViewMode, setModuleViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('moduleViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [lessonViewMode, setLessonViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('lessonViewMode');
    return (saved as ViewMode) || 'list';
  });

  const stats = useMemo(() => {
    const totalModules = Object.values(modulesByCourse).reduce((acc, list) => acc + list.length, 0);
    const totalLessons = Object.values(lessonsByModule).reduce((acc, list) => acc + list.length, 0);
    return [
      { label: 'Cursos', value: courses.length, icon: 'fas fa-graduation-cap', color: 'bg-indigo-600/10 text-indigo-500' },
      { label: 'Modulos', value: totalModules, icon: 'fas fa-layer-group', color: 'bg-cyan-600/10 text-cyan-500' },
      { label: 'Aulas', value: totalLessons, icon: 'fas fa-play-circle', color: 'bg-purple-600/10 text-purple-500' }
    ];
  }, [courses.length, modulesByCourse, lessonsByModule]);

  const getModules = (courseId: string) => modulesByCourse[courseId] || [];
  const getLessons = (moduleId: string) => lessonsByModule[moduleId] || [];

  const refreshCourses = async () => {
    setError('');
    const list = await adminService.listCourses();
    setCourses(list);
  };

  const refreshModules = async (courseId: string) => {
    setError('');
    const list = await adminService.listModules(courseId);
    setModulesByCourse(prev => ({ ...prev, [courseId]: list }));
  };

  const refreshLessons = async (moduleId: string) => {
    setError('');
    const list = await adminService.listLessons(moduleId);
    setLessonsByModule(prev => ({ ...prev, [moduleId]: list }));
  };

  const refreshLessonResources = async (lessonId: string) => {
    setError('');
    const list = await adminService.listLessonResources(lessonId);
    setLessonResources(prev => ({ ...prev, [lessonId]: list }));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setBusy(true);
        await refreshCourses();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!courses.length) return;
    if (initialCourseId && courses.some(c => c.id === initialCourseId)) {
      setExpandedCourseId(initialCourseId);
      refreshModules(initialCourseId);
    }
  }, [courses, initialCourseId]);

  useEffect(() => {
    if (!expandedCourseId || !initialModuleId) return;
    const modules = getModules(expandedCourseId);
    if (modules.length && modules.some(m => m.id === initialModuleId)) {
      setExpandedModuleId(initialModuleId);
      refreshLessons(initialModuleId);
    }
  }, [expandedCourseId, modulesByCourse, initialModuleId]);
  const handleCreateCourse = async (title: string, description: string, imageUrl: string) => {
    try {
      setBusy(true);
      await adminService.createCourse(title.trim(), description.trim() || undefined, imageUrl.trim() || undefined);
      await refreshCourses();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    try {
      setBusy(true);
      await adminService.updateCourse(editingCourse.id, {
        title: editingCourse.title,
        description: editingCourse.description ?? null,
        imageUrl: editingCourse.image_url ?? null
      });
      setEditingCourse(null);
      await refreshCourses();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Excluir este curso? Isso remove modulos e aulas relacionadas.')) return;
    try {
      setBusy(true);
      await adminService.deleteCourse(courseId);
      setExpandedCourseId('');
      await refreshCourses();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateModule = async (courseId: string, title: string, position: number) => {
    try {
      setBusy(true);
      await adminService.createModule(courseId, title.trim(), position);
      await refreshModules(courseId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;
    try {
      setBusy(true);
      await adminService.updateModule(editingModule.id, {
        title: editingModule.title,
        position: editingModule.position
      });
      setEditingModule(null);
      await refreshModules(editingModule.course_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModule = async (courseId: string, moduleId: string) => {
    if (!confirm('Excluir este modulo? Isso remove aulas relacionadas.')) return;
    try {
      setBusy(true);
      await adminService.deleteModule(moduleId);
      setLessonsByModule(prev => {
        const copy = { ...prev };
        delete copy[moduleId];
        return copy;
      });
      await refreshModules(courseId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLesson = async (moduleId: string, data: { title: string, videoUrl?: string, content?: string, durationSeconds: number, position: number }) => {
    try {
      setBusy(true);
      await adminService.createLesson(moduleId, {
        title: data.title.trim(),
        videoUrl: data.videoUrl,
        content: data.content,
        durationSeconds: data.durationSeconds,
        position: data.position
      });
      await refreshLessons(moduleId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    try {
      setBusy(true);
      await adminService.updateLesson(editingLesson.id, {
        title: editingLesson.title,
        content: editingLesson.content ?? null,
        videoUrl: editingLesson.video_url ?? null,
        durationSeconds: editingLesson.duration_seconds,
        position: editingLesson.position
      });
      setEditingLesson(null);
      await refreshLessons(editingLesson.module_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Excluir esta aula?')) return;
    try {
      setBusy(true);
      await adminService.deleteLesson(lessonId);
      if (activeLessonId === lessonId) {
        setActiveLessonId('');
        setActiveLesson(null);
      }
      await refreshLessons(moduleId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveActiveLesson = async () => {
    if (!activeLesson) return;
    try {
      setBusy(true);
      const updated = await adminService.updateLesson(activeLesson.id, {
        title: activeLesson.title,
        content: activeLesson.content ?? null,
        videoUrl: activeLesson.video_url ?? null,
        audioUrl: activeLesson.audio_url ?? null,
        imageUrl: activeLesson.image_url ?? null,
        durationSeconds: activeLesson.duration_seconds,
        position: activeLesson.position
      });
      setActiveLesson(updated);
      await refreshLessons(updated.module_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateResource = async (lessonId: string) => {
    if (!newResourceTitle.trim()) return;

    // Validar: ou tem arquivo ou tem URL
    if (uploadMethod === 'file' && !selectedFile) {
      setError('Por favor, selecione um arquivo para fazer upload');
      return;
    }
    if (uploadMethod === 'url' && !newResourceUrl.trim()) {
      setError('Por favor, insira uma URL');
      return;
    }

    try {
      setBusy(true);
      setIsUploading(true);
      setUploadProgress(0);
      let finalUrl = newResourceUrl.trim();

      // Se método for upload de arquivo
      if (uploadMethod === 'file' && selectedFile) {
        // Validar tipo de arquivo
        if (!fileUploadService.validateFileType(selectedFile, newResourceType)) {
          throw new Error(`Tipo de arquivo inválido para ${newResourceType}`);
        }

        setUploadProgress(30);

        // Fazer upload
        const folder = fileUploadService.getFolderByType(newResourceType);
        finalUrl = await fileUploadService.uploadFile(selectedFile, folder);

        setUploadProgress(70);
      }

      // Criar recurso no banco
      await adminService.createLessonResource(lessonId, {
        title: newResourceTitle.trim(),
        resourceType: newResourceType,
        url: finalUrl,
        position: newResourcePosition
      });

      setUploadProgress(100);

      // Limpar estados
      setNewResourceTitle('');
      setNewResourceUrl('');
      setNewResourcePosition(0);
      setSelectedFile(null);
      setUploadProgress(0);

      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteResource = async (lessonId: string, resourceId: string) => {
    if (!confirm('Excluir este material?')) return;
    try {
      setBusy(true);
      await adminService.deleteLessonResource(resourceId);
      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateResource = async (resourceId: string, lessonId: string) => {
    if (!editingResourceTitle.trim()) {
      setError('Título não pode estar vazio');
      return;
    }
    try {
      setBusy(true);
      await adminService.updateLessonResource(resourceId, {
        title: editingResourceTitle.trim()
      });
      setEditingResourceId(null);
      setEditingResourceTitle('');
      await refreshLessonResources(lessonId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openLessonDetail = async (lesson: LessonRecord) => {
    setActiveLessonId(lesson.id);
    setActiveLesson({ ...lesson });
    await refreshLessonResources(lesson.id);
  };

  // Funções para alternar modos de visualização
  const toggleModuleViewMode = (mode: ViewMode) => {
    setModuleViewMode(mode);
    localStorage.setItem('moduleViewMode', mode);
  };

  const toggleLessonViewMode = (mode: ViewMode) => {
    setLessonViewMode(mode);
    localStorage.setItem('lessonViewMode', mode);
  };

  // Componente de toggle de visualização
  const ViewModeToggle: React.FC<{ current: ViewMode; onChange: (mode: ViewMode) => void; label: string }> = ({ current, onChange, label }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}:</span>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        <button
          onClick={() => onChange('list')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'list'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Lista"
        >
          <i className="fas fa-list"></i>
        </button>
        <button
          onClick={() => onChange('grid')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'grid'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Grade"
        >
          <i className="fas fa-th"></i>
        </button>
        <button
          onClick={() => onChange('minimal')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${current === 'minimal'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          title="Minimalista"
        >
          <i className="fas fa-square"></i>
        </button>
      </div>
    </div>
  );
  const renderLessonList = (module: ModuleRecord) => {
    const lessons = getLessons(module.id);
    const isExpanded = expandedModuleId === module.id;

    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        <div
          className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition ${isExpanded ? 'bg-cyan-50 dark:bg-cyan-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
            }`}
          onClick={() => {
            const next = isExpanded ? '' : module.id;
            setExpandedModuleId(next);
            if (!lessons.length) refreshLessons(module.id);
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 dark:text-white truncate">{module.title}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Posicao: {module.position ?? 0}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={e => {
                e.stopPropagation();
                setEditingModule({ ...module });
              }}
              className="p-2 text-slate-400 hover:text-cyan-500 transition-colors"
              title="Editar modulo"
            >
              <i className="fas fa-pen"></i>
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                handleDeleteModule(module.course_id, module.id);
              }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Excluir modulo"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/20">
            <div className="flex justify-end">
              <button
                disabled={busy}
                onClick={() => setActiveModuleIdForLessonCreation(module.id)}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Criar aula
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {lessons.map(lesson => (
                <div key={lesson.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div
                    className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => openLessonDetail(lesson)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-white truncate">{lesson.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Posicao: {lesson.position ?? 0} • Duracao: {(lesson.duration_seconds ?? 0).toLocaleString()}s
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 truncate">Video: {lesson.video_url || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingLesson({ ...lesson });
                        }}
                        className="p-2 text-slate-400 hover:text-purple-500 transition-colors"
                        title="Editar aula"
                      >
                        <i className="fas fa-pen"></i>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteLesson(module.id, lesson.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Excluir aula"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  {activeLessonId === lesson.id && activeLesson && (
                    <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-950/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          value={activeLesson.title}
                          onChange={e => setActiveLesson({ ...activeLesson, title: e.target.value })}
                          placeholder="Titulo"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                        <input
                          value={activeLesson.video_url || ''}
                          onChange={e => setActiveLesson({ ...activeLesson, video_url: e.target.value })}
                          placeholder="URL do video"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                        <input
                          value={activeLesson.audio_url || ''}
                          onChange={e => setActiveLesson({ ...activeLesson, audio_url: e.target.value })}
                          placeholder="URL do audio (opcional)"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                        <input
                          value={activeLesson.image_url || ''}
                          onChange={e => setActiveLesson({ ...activeLesson, image_url: e.target.value })}
                          placeholder="URL da imagem (opcional)"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                        <input
                          value={activeLesson.position ?? 0}
                          onChange={e => setActiveLesson({ ...activeLesson, position: Number(e.target.value) })}
                          type="number"
                          min={0}
                          placeholder="Posicao"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                        <input
                          value={activeLesson.duration_seconds ?? 0}
                          onChange={e => setActiveLesson({ ...activeLesson, duration_seconds: Number(e.target.value) })}
                          type="number"
                          min={0}
                          placeholder="Duracao (s)"
                          className="w-full bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                        />
                      </div>

                      {/* Botão para abrir editor de conteúdo */}
                      <button
                        onClick={() => onOpenContentEditor?.(activeLesson)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-4 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 mb-3"
                      >
                        <i className="fas fa-pen-to-square text-lg"></i>
                        <div className="text-left flex-1">
                          <div>Editar Conteúdo da Aula</div>
                          <div className="text-xs font-normal opacity-80">
                            {activeLesson.content
                              ? `${activeLesson.content.length} caracteres • Clique para editar`
                              : 'Adicionar texto de apoio à aula'}
                          </div>
                        </div>
                        <i className="fas fa-arrow-right"></i>
                      </button>

                      <div className="flex justify-end">
                        <button
                          disabled={busy}
                          onClick={handleSaveActiveLesson}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                        >
                          Salvar aula
                        </button>
                      </div>

                      <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Materiais da aula</h5>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {(lessonResources[lesson.id]?.length || 0).toString()}
                          </span>
                        </div>

                        {/* Formulário de Upload de Recursos */}
                        <ResourceUploadForm
                          onSubmit={async (data) => {
                            await adminService.createLessonResource(lesson.id, {
                              title: data.title,
                              resourceType: data.resourceType,
                              url: data.url,
                              position: newResourcePosition
                            });
                            await refreshLessonResources(lesson.id);
                          }}
                          isLoading={busy}
                        />

                        <div className="space-y-2">
                          {(lessonResources[lesson.id] || []).map(resource => {
                            const isEditing = editingResourceId === resource.id;

                            return (
                              <div
                                key={resource.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200"
                              >
                                <div className="min-w-0 flex-1">
                                  {isEditing ? (
                                    <input
                                      value={editingResourceTitle}
                                      onChange={e => setEditingResourceTitle(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          handleUpdateResource(resource.id, lesson.id);
                                        } else if (e.key === 'Escape') {
                                          setEditingResourceId(null);
                                          setEditingResourceTitle('');
                                        }
                                      }}
                                      autoFocus
                                      className="w-full bg-white dark:bg-[#0a0e14] border border-indigo-300 dark:border-indigo-700 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                                      placeholder="Nome do material"
                                    />
                                  ) : (
                                    <p className="font-semibold truncate">{resource.title}</p>
                                  )}
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                    {resource.resource_type} • Posicao: {resource.position ?? 0}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">URL: {resource.url}</p>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateResource(resource.id, lesson.id)}
                                        disabled={busy}
                                        className="p-2 text-green-500 hover:text-green-600 disabled:opacity-50 transition-colors"
                                        title="Salvar"
                                      >
                                        <i className="fas fa-check"></i>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingResourceId(null);
                                          setEditingResourceTitle('');
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Cancelar"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingResourceId(resource.id);
                                          setEditingResourceTitle(resource.title);
                                        }}
                                        className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                                        title="Editar nome"
                                      >
                                        <i className="fas fa-pen"></i>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteResource(lesson.id, resource.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Excluir material"
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {(lessonResources[lesson.id] || []).length === 0 && (
                            <div className="text-[12px] text-slate-400 text-center py-2">Nenhum material adicionado.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {lessons.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Nenhuma aula para este modulo.</div>}
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderModuleList = (course: CourseRecord) => {
    const modules = getModules(course.id);
    const isExpanded = expandedCourseId === course.id;

    // Modo Grade
    if (moduleViewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(m => (
            <div key={m.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-black text-slate-800 dark:text-white truncate">{m.title}</h5>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Posição: {m.position ?? 0}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingModule({ ...m })}
                    className="p-1.5 text-slate-400 hover:text-cyan-500 transition-colors"
                    title="Editar">
                    <i className="fas fa-pen text-xs"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteModule(m.course_id, m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Excluir">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setExpandedModuleId(expandedModuleId === m.id ? '' : m.id);
                  if (!getLessons(m.id).length) refreshLessons(m.id);
                }}
                className="w-full bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 px-3 py-2 rounded-lg text-xs font-bold transition-all">
                <i className="fas fa-layer-group mr-2"></i>
                {expandedModuleId === m.id ? 'Ocultar Aulas' : 'Ver Aulas'}
              </button>
            </div>
          ))}
          {modules.length === 0 && <div className="col-span-full p-6 text-center text-sm text-slate-400">{isExpanded ? 'Nenhum modulo' : ''}</div>}
        </div>
      );
    }

    // Modo Minimalista
    if (moduleViewMode === 'minimal') {
      return (
        <div className="space-y-2">
          {modules.map(m => (
            <div
              key={m.id}
              onClick={() => {
                setExpandedModuleId(expandedModuleId === m.id ? '' : m.id);
                if (!getLessons(m.id).length) refreshLessons(m.id);
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${expandedModuleId === m.id
                ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModuleId === m.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                  <i className="fas fa-layer-group text-xs"></i>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{m.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditingModule({ ...m })} className="p-1.5 text-slate-400 hover:text-cyan-500 transition" title="Editar">
                  <i className="fas fa-pen text-xs"></i>
                </button>
                <button onClick={() => handleDeleteModule(m.course_id, m.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition" title="Excluir">
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          ))}
          {modules.length === 0 && <div className="p-6 text-center text-sm text-slate-400">{isExpanded ? 'Nenhum modulo' : ''}</div>}
        </div>
      );
    }

    // Modo Lista (padrão/atual)
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {modules.map(m => (
          <div key={m.id} className="p-3">
            {renderLessonList(m)}
          </div>
        ))}
        {modules.length === 0 && <div className="p-6 text-center text-sm text-slate-400">{isExpanded ? 'Nenhum modulo' : ''}</div>}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-transparent min-h-full transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Admin / <span className="text-slate-800 dark:text-white">Gestao de Conteudo</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciamento de Conteudo</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Crie e organize cursos, modulos e aulas.</p>
        </div>
        <div className="text-xs font-bold text-slate-400">{busy ? 'Sincronizando...' : 'Supabase conectado'}</div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          <span className="font-bold">Erro:</span> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <span className="text-3xl font-black text-slate-800 dark:text-white">{stat.value}</span>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${stat.color}`}>
              <i className={stat.icon}></i>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200/60 dark:border-indigo-500/20 rounded-3xl p-6 text-sm text-slate-700 dark:text-slate-200">
        <p className="font-black text-slate-800 dark:text-white mb-2">Como criar conteudo</p>
        <p className="text-slate-600 dark:text-slate-300">
          1) Crie um curso &gt; 2) Clique no card para abrir modulos &gt; 3) Crie modulo &gt; 4) Abra o modulo para criar aulas.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Cursos</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Cada card expande modulos e aulas.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{courses.length}</span>
            <button
              disabled={busy}
              onClick={() => setIsCreateCourseModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Criar curso
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {courses.map(course => {
            const isExpanded = expandedCourseId === course.id;
            const modules = getModules(course.id);
            return (
              <div key={course.id}>
                <div
                  className={`p-5 flex items-start justify-between gap-4 cursor-pointer transition ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  onClick={() => {
                    const next = isExpanded ? '' : course.id;
                    setExpandedCourseId(next);
                    setExpandedModuleId('');
                    if (!modules.length) refreshModules(course.id);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">{course.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">
                      {course.description || 'Sem descricao'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">ID: {course.id}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingCourse({ ...course });
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                      title="Editar curso"
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir curso"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 bg-slate-50/70 dark:bg-slate-950/20">
                    <div className="pt-5">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Modulos</h4>
                        <div className="flex items-center gap-3">
                          <ViewModeToggle current={moduleViewMode} onChange={toggleModuleViewMode} label="Visualização" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{modules.length}</span>
                          <button
                            disabled={busy}
                            onClick={() => setActiveCourseIdForModuleCreation(course.id)}
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all active:scale-[0.98] flex items-center gap-2"
                          >
                            <i className="fas fa-plus"></i> Criar modulo
                          </button>
                        </div>
                      </div>

                      {renderModuleList(course)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {courses.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum curso criado ainda.</div>}
        </div>
      </div>

      {(editingCourse || editingModule || editingLesson) && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-800 dark:text-white">Editar</h4>
              <button
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => {
                  setEditingCourse(null);
                  setEditingModule(null);
                  setEditingLesson(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingCourse && (
                <>
                  <input
                    value={editingCourse.title}
                    onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingCourse.image_url || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, image_url: e.target.value })}
                    placeholder="URL da Imagem de Capa"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingCourse.description || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    placeholder="Descricao"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                </>
              )}

              {editingModule && (
                <>
                  <input
                    value={editingModule.title}
                    onChange={e => setEditingModule({ ...editingModule, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingModule.position ?? 0}
                    onChange={e => setEditingModule({ ...editingModule, position: Number(e.target.value) })}
                    type="number"
                    min={0}
                    placeholder="Posicao"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                </>
              )}

              {editingLesson && (
                <>
                  <input
                    value={editingLesson.title}
                    onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    placeholder="Titulo"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <input
                    value={editingLesson.video_url || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                    placeholder="URL do video"
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                  />
                  <textarea
                    value={editingLesson.content || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, content: e.target.value })}
                    placeholder="Texto da aula"
                    rows={5}
                    className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none resize-y"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editingLesson.duration_seconds ?? 0}
                      onChange={e => setEditingLesson({ ...editingLesson, duration_seconds: Number(e.target.value) })}
                      type="number"
                      min={0}
                      placeholder="Duracao (s)"
                      className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                    />
                    <input
                      value={editingLesson.position ?? 0}
                      onChange={e => setEditingLesson({ ...editingLesson, position: Number(e.target.value) })}
                      type="number"
                      min={0}
                      placeholder="Posicao"
                      className="w-full bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 text-sm outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setEditingModule(null);
                  setEditingLesson(null);
                }}
                className="px-4 py-3 rounded-xl font-black text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (editingCourse) handleUpdateCourse();
                  if (editingModule) handleUpdateModule();
                  if (editingLesson) handleUpdateLesson();
                }}
                className="px-4 py-3 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onConfirm={handleCreateCourse}
        isLoading={busy}
      />
      <CreateModuleModal
        isOpen={!!activeCourseIdForModuleCreation}
        onClose={() => setActiveCourseIdForModuleCreation(null)}
        onConfirm={async (title, position) => {
          if (activeCourseIdForModuleCreation) {
            await handleCreateModule(activeCourseIdForModuleCreation, title, position);
          }
        }}
        isLoading={busy}
        nextPosition={activeCourseIdForModuleCreation ? (modulesByCourse[activeCourseIdForModuleCreation]?.length || 0) + 1 : 1}
      />
      <CreateLessonModal
        isOpen={!!activeModuleIdForLessonCreation}
        onClose={() => setActiveModuleIdForLessonCreation(null)}
        onConfirm={async (data) => {
          if (activeModuleIdForLessonCreation) {
            await handleCreateLesson(activeModuleIdForLessonCreation, data);
          }
        }}
        isLoading={busy}
        nextPosition={activeModuleIdForLessonCreation ? (lessonsByModule[activeModuleIdForLessonCreation]?.length || 0) + 1 : 1}
      />
    </div>
  );
};

export default AdminContentManagement;


