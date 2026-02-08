// Fixed syntax
import React, { useState, useEffect, useRef } from 'react';
import { ShimmerButton } from './ui/shimmer-button';
import { Course, Lesson, User, UserProgress } from '../domain/entities';
import VideoPlayer from './VideoPlayer';
import LessonMaterialsSidebar from './LessonMaterialsSidebar';
import BuddyContextModal from './BuddyContextModal';
// import GeminiBuddy from './GeminiBuddy'; // Removed: Uses global now
import NotesPanelPrototype from './NotesPanelPrototype';
import QuizModal from './QuizModal';
import QuizResultsModal from './QuizResultsModal';
import { QuizAttemptResult } from '../domain/quiz-entities';
import { createSupabaseClient } from '../services/supabaseClient';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';

import { LessonNotesRepository } from '../repositories/LessonNotesRepository';
import { useLessonStore } from '../stores/useLessonStore';
import ContentReader from './lesson/ContentReader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useLessonQuiz } from '../hooks/useLessonQuiz';
import { useLessonNavigation } from '../hooks/useLessonNavigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface LessonViewerProps {
    course: Course;
    lesson: Lesson;
    user: User;
    onLessonSelect: (lesson: Lesson) => void;
    onProgressUpdate: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    onBackToLessons: () => void;
    onBackToModules: () => void;
    sidebarTab: 'materials' | 'notes';
    setSidebarTab: (tab: 'materials' | 'notes') => void;
    userProgress?: UserProgress[];
    onTrackAction?: (action: string) => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({
    course,
    lesson,
    user,
    onLessonSelect,
    onProgressUpdate,
    onBackToLessons,
    onBackToModules,
    sidebarTab,
    setSidebarTab,
    userProgress = [],
    onTrackAction
}) => {
    // Global state from Zustand store
    const {
        activeBlockId,
        setActiveBlockId,
        fontSize,
        setFontSize,
        isCinemaMode,
        toggleCinemaMode,
        playbackSpeed,
        setPlaybackSpeed,
        audioEnabled,
        setAudioEnabled,
        contentTheme,
        setContentTheme
    } = useLessonStore();

    // Custom Hooks
    // Audio Player hook moved down to access handleProgressUpdateInternal

    // Local state (kept here as they're specific to this component instance)
    const [lastAccessedId, setLastAccessedId] = useState<string | null>(null);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const optionsMenuRef = useRef<HTMLDivElement | null>(null);

    // Image Viewer Modal State
    const [showImageViewerModal, setShowImageViewerModal] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, text: string } | null>(null);
    const [showBuddyModal, setShowBuddyModal] = useState(false);
    const [buddyContext, setBuddyContext] = useState('');

    // Notes Panel Trigger (to pass text)
    const [noteDraft, setNoteDraft] = useState<string>('');

    // Video switcher state
    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

    // Quiz State - Managed by custom hook
    const {
        quiz,
        showQuizModal,
        quizResult,
        isSubmittingQuiz,
        quizMode,
        showPracticeConfigModal,
        practiceQuestionCount,
        setQuiz,
        setShowQuizModal,
        setQuizResult,
        setIsSubmittingQuiz,
        setQuizMode,
        setShowPracticeConfigModal,
        setPracticeQuestionCount,
        handleStartQuiz,
        handleStartPracticeQuiz,
        handleQuizSubmit
    } = useLessonQuiz({ lesson, course, user, onTrackAction });

    // Mobile Navigation State - Managed by custom hook
    const {
        activeMobileTab,
        focusedNoteId,
        handleOpenDrawer,
        handleCloseDrawer,
        setFocusedNoteId
    } = useLessonNavigation();

    // Monitorar quiz para atualizar estado do objeto Lesson
    useEffect(() => {
        if (quiz) {
            lesson.setHasQuiz(true);

            // Verificar se já passou (opcional, já que o hook poderia prover isso)
            const checkCompletion = async () => {
                const { createSupabaseClient } = await import('../services/supabaseClient');
                const { SupabaseCourseRepository } = await import('../repositories/SupabaseCourseRepository');
                const supabase = createSupabaseClient();
                const courseRepo = new SupabaseCourseRepository(supabase);
                const attempt = await courseRepo.getLatestQuizAttempt(user.id, quiz.id);
                if (attempt?.passed) {
                    lesson.setQuizPassed(true);
                }
            };
            checkCompletion();
        }
    }, [quiz, lesson, user.id]);

    // Handle Resources Display

    /**
     * Intercepta a atualização de progresso para verificar se precisa abrir o quiz
     */
    const handleProgressUpdateInternal = async (watchedSeconds: number, lastBlockId?: string) => {
        const duration = lesson.durationSeconds || 1;
        const progressPercent = (watchedSeconds / duration) * 100;
        const isCompletingNow = progressPercent >= 90;

        if (isCompletingNow && quiz && !lesson.quizPassed) {
            await onProgressUpdate(watchedSeconds, lastBlockId);

            if (!showQuizModal && !quizResult) {
                handleStartQuiz();
            }
        } else {
            await onProgressUpdate(watchedSeconds, lastBlockId);
        }
    };

    const {
        isPlaying,
        progress,
        playBlock,
        toggleAudio,
        seek
    } = useAudioPlayer({
        lesson,
        onTrackAction,
        onProgressUpdate: handleProgressUpdateInternal
    });

    const lessonProgress = userProgress.find(p => p.lessonId === lesson.id);

    const contentScrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial Resume Logic (Scroll and Focus)
    useEffect(() => {
        if (lessonProgress?.lastAccessedBlockId) {
            const blockId = lessonProgress.lastAccessedBlockId;
            setLastAccessedId(blockId);

            setTimeout(() => {
                const element = blockRefs.current[blockId];
                const container = contentScrollContainerRef.current;

                if (element && container) {
                    // Calcular posição centralizada no container
                    const containerHeight = container.clientHeight;
                    const elementTop = element.offsetTop;
                    const elementHeight = element.offsetHeight;

                    const targetScroll = elementTop - (containerHeight / 2) + (elementHeight / 2);

                    container.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }, 500);
        }
    }, [lesson.id]);

    // Auto-scroll to active block
    useEffect(() => {
        if (activeBlockId) {
            const element = blockRefs.current[activeBlockId];
            const container = contentScrollContainerRef.current;

            if (element && container) {
                // Verificar se o elemento já está visível no container
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                const isVisible = (
                    elementRect.top >= containerRect.top &&
                    elementRect.bottom <= containerRect.bottom
                );

                if (!isVisible) {
                    // Calcular scroll relativo ao container
                    // element.offsetTop é relativo ao pai posicionado (o container deve ser relative/absolute)
                    const containerHeight = container.clientHeight;
                    const elementTop = element.offsetTop;
                    const elementHeight = element.offsetHeight;

                    const targetScroll = elementTop - (containerHeight / 2) + (elementHeight / 2);

                    container.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [activeBlockId]);

    // State for highlights
    const [highlights, setHighlights] = useState<{ id: string; text: string; color: 'yellow' | 'green' | 'blue' | 'pink'; onClick: () => void }[]>([]);

    // Fetch and prepare highlights
    useEffect(() => {
        let isMounted = true;

        const loadHighlights = async () => {
            if (!user.id || !lesson.id) return;

            try {
                const dbNotes = await LessonNotesRepository.loadNotes(user.id, lesson.id);
                if (!isMounted) return;

                const formattedHighlights = dbNotes
                    .filter(note => note.has_highlight && note.highlighted_text)
                    .map(note => ({
                        id: note.id,
                        text: note.highlighted_text!,
                        color: note.highlight_color as 'yellow' | 'green' | 'blue' | 'pink',
                        onClick: () => {
                            setFocusedNoteId(note.id);
                            setSidebarTab('notes');
                            handleOpenDrawer('notes');
                        }
                    }));

                setHighlights(formattedHighlights);
            } catch (err) {
                console.error("Error loading highlights:", err);
            }
        };

        loadHighlights();

        return () => { isMounted = false; };
    }, [lesson.id, user.id]);

    // Fechar menu de opções ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
        };

        if (isOptionsMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOptionsMenuOpen]);

    // Setup global function for opening image modal
    useEffect(() => {
        (window as any).openImageModal = (imageUrl: string) => {
            console.log('🖼️ openImageModal chamada com URL:', imageUrl);
            setViewerImageUrl(imageUrl);
            setShowImageViewerModal(true);
        };

        return () => {
            delete (window as any).openImageModal;
        };
    }, []);



    // Helper to render Quiz Status Card (Reused for Desktop and Mobile)
    const renderQuizStatusCard = () => {
        if (!quiz) return null;

        const quizAvailable = quiz.isManuallyReleased || lesson.calculateProgressPercentage() >= 90;

        return (
            <div className={`rounded-2xl border overflow-hidden transition-all ${quizAvailable
                ? 'bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-green-900/40 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900 border-slate-700'
                }`}>
                <div className={`p-4 border-b flex items-center gap-3 ${quizAvailable
                    ? 'bg-emerald-800/30 border-emerald-700/30'
                    : 'bg-slate-800 border-slate-700'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quizAvailable
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-500'
                        }`}>
                        <i className={`fas ${quizAvailable ? 'fa-graduation-cap' : 'fa-lock'} text-xl`}></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-100">Quiz da Aula</h3>
                        <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">
                            {quizAvailable ? 'Disponível' : 'Bloqueado'}
                        </p>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {/* Dual-Mode Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Practice Mode Button */}
                        <button
                            onClick={() => setShowPracticeConfigModal(true)}
                            className="rounded-xl p-4 transition-all bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-2 border-blue-500/30 hover:border-blue-400/50 hover:from-blue-600/30 hover:to-indigo-600/30"
                            title="Modo Prática - Sem XP"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                                    <i className="fas fa-dumbbell text-lg text-blue-400"></i>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-sm text-slate-100">Prática</p>
                                    <p className="text-[9px] text-blue-300 font-semibold uppercase tracking-wider">Sem XP</p>
                                </div>
                            </div>
                        </button>

                        {/* Evaluation Mode Button */}
                        <button
                            onClick={quizAvailable ? handleStartQuiz : undefined}
                            disabled={!quizAvailable}
                            className={`rounded-xl p-4 transition-all ${quizAvailable
                                ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-2 border-emerald-500/40 hover:border-emerald-400/60 hover:from-emerald-600/40 hover:to-teal-600/40 cursor-pointer'
                                : 'bg-slate-800/50 border-2 border-slate-700/50 cursor-not-allowed opacity-60'
                                }`}
                            title={quizAvailable ? "Modo Avaliativo - Ganhe XP" : "Complete 90% da aula para desbloquear"}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${quizAvailable
                                    ? 'bg-emerald-500/20 border border-emerald-400/30'
                                    : 'bg-slate-700/50 border border-slate-600'
                                    }`}>
                                    <i className={`fas ${quizAvailable ? 'fa-trophy' : 'fa-lock'} text-lg ${quizAvailable ? 'text-emerald-400' : 'text-slate-500'}`}></i>
                                </div>
                                <div className="text-center">
                                    <p className={`font-bold text-sm ${quizAvailable ? 'text-slate-100' : 'text-slate-400'}`}>Avaliativo</p>
                                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${quizAvailable ? 'text-emerald-300' : 'text-slate-500'}`}>
                                        {quizAvailable ? 'Ganhe XP' : 'Bloqueado'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Quiz Info */}
                    <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400 font-semibold">{quiz.title}</span>
                            <span className="text-slate-300 font-bold">{quiz.questions.length || quiz.questionsCount || 0} questões</span>
                        </div>
                        {quizAvailable && (
                            <p className="text-[10px] text-slate-500">Nota de aprovação: {quiz.passingScore}%</p>
                        )}
                    </div>

                    {!quizAvailable && (
                        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                <span className="font-bold uppercase tracking-wider">Progresso</span>
                                <span className="font-bold text-slate-300">
                                    {lesson.calculateProgressPercentage()}% / 90%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                    style={{ width: `${Math.min(lesson.calculateProgressPercentage(), 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                {90 - lesson.calculateProgressPercentage() > 0
                                    ? `Faltam ${(90 - lesson.calculateProgressPercentage()).toFixed(0)}% para desbloquear`
                                    : 'Quiz liberado!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Determine which video URL to use
    const hasMultipleVideos = lesson.videoUrls && lesson.videoUrls.length > 1;
    const currentVideoUrl = (lesson.videoUrls && lesson.videoUrls.length > 0)
        ? lesson.videoUrls[activeVideoIndex]?.url
        : lesson.videoUrl;

    // Loading State (Partial Content)
    if (lesson.isLoaded === false) {
        return (
            <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-8 space-y-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="flex justify-between">
                        <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                </div>
                {/* Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-9 space-y-8">
                        <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
                        <div className="space-y-4">
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-6 space-y-6">
            {/* Header: Título + Voltar (Alinhados) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{lesson.title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {course.title}
                        </p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-2.5 h-2.5 rounded-full ${lesson.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'
                                    }`}
                            ></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {lesson.isCompleted ? 'Concluída' : 'Em andamento'}
                            </span>
                        </div>

                        {/* Back Button */}
                        <ShimmerButton
                            onClick={onBackToLessons}
                            className="h-10 px-6 shadow-lg transition-all hover:scale-105 active:scale-95"
                            background="radial-gradient(ellipse 80% 80% at 50% -20%,rgba(79,70,229,0.3),rgba(15,23,42,1))"
                            shimmerColor="#818cf8"
                            shimmerSize="0.1em"
                            borderRadius="12px"
                        >
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                                <i className="fas fa-arrow-left"></i> Voltar às aulas
                            </span>
                        </ShimmerButton>
                    </div>
                </div>
            </div>

            {/* Layout 3 Colunas: Lista Vídeos | Player | Sidebar */}
            {/* Layout Principal: 2 Colunas (Conteúdo Esquerda | Sidebar Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Coluna Esquerda: Vídeo + Conteúdo (75% normal, 100% cinema mode) */}
                <motion.div
                    layoutId={`course-card-${course.id}`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`space-y-8 ${isCinemaMode ? 'lg:col-span-12' : 'lg:col-span-9'}`}
                >

                    {/* Seção de Vídeo (Condicional) */}
                    {/* Seção de Vídeo (Condicional) */}
                    {(lesson.videoUrl || (lesson.videoUrls && lesson.videoUrls.length > 0)) && (
                        <div className="space-y-6">
                            {/* Player */}
                            <div className="w-full">
                                <VideoPlayer
                                    lesson={lesson}
                                    videoUrl={currentVideoUrl}
                                    onProgress={handleProgressUpdateInternal}
                                    onPlay={() => onTrackAction?.(`Reproduziu vídeo: ${currentVideoUrl || lesson.title}`)}
                                />
                            </div>

                            {/* Cinema Mode Toggle */}
                            <div className="flex justify-end">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        toggleCinemaMode();
                                        onTrackAction?.(isCinemaMode ? 'Desativou Modo Cinema' : 'Ativou Modo Cinema');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-sm font-medium"
                                    title={isCinemaMode ? 'Sair do Modo Cinema' : 'Ativar Modo Cinema'}
                                >
                                    <i className={`fas ${isCinemaMode ? 'fa-compress' : 'fa-expand'}`}></i>
                                    <span className="hidden sm:inline">{isCinemaMode ? 'Sair do Cinema' : 'Modo Cinema'}</span>
                                </motion.button>
                            </div>

                            {/* Carrossel de Vídeos */}
                            {hasMultipleVideos && (
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <i className="fas fa-film text-indigo-500 text-sm"></i>
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Playlist da Aula</h3>
                                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-auto bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                            {activeVideoIndex + 1} / {lesson.videoUrls!.length}
                                        </span>
                                    </div>

                                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent snap-x">
                                        {lesson.videoUrls!.map((video, index) => (
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                key={index}
                                                onClick={() => {
                                                    setActiveVideoIndex(index);
                                                    onTrackAction?.(`Trocou para vídeo: ${video.title}`);
                                                }}
                                                className={`min-w-[160px] w-[160px] md:min-w-[200px] md:w-[200px] flex-shrink-0 group relative rounded-xl overflow-hidden aspect-video border-2 transition-all snap-start text-left ${activeVideoIndex === index
                                                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/30'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-600'
                                                    }`}
                                            >
                                                {/* Thumbnail Placeholder or Image */}
                                                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                                    {video.imageUrl ? (
                                                        <>
                                                            <img
                                                                src={video.imageUrl}
                                                                alt={video.title}
                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                                            />
                                                            <i className={`fas ${activeVideoIndex === index ? 'fa-play-circle text-indigo-500' : 'fa-play text-white'} text-3xl absolute shadow-xl`}></i>
                                                        </>
                                                    ) : (
                                                        <i className={`fas ${activeVideoIndex === index ? 'fa-play-circle text-indigo-500' : 'fa-play text-white/30'} text-3xl group-hover:text-white transition-colors`}></i>
                                                    )}
                                                </div>

                                                {/* Overlay Status */}
                                                <div className="absolute top-2 left-2">
                                                    {activeVideoIndex === index && (
                                                        <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-sm animate-pulse">
                                                            Reproduzindo
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Overlay Title */}
                                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                                    <p className="text-white text-xs font-bold line-clamp-2 drop-shadow-md">{video.title}</p>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conteúdo da Matéria (Texto Rico OU Blocos de Áudio) */}
                    <div className={`rounded-3xl border shadow-sm transition-colors flex flex-col h-[calc(100vh-140px)] ${contentTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className={`flex-shrink-0 flex items-center justify-between p-4 md:p-6 border-b ${contentTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contentTheme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                                    <i className={`fas fa-book-open ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                                </div>
                                <div>
                                    <h3 className={`text-lg font-black ${contentTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Conteúdo da Aula</h3>
                                    <p className={`text-xs ${contentTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {lesson.contentBlocks?.length > 0 ? 'Leitura em Blocos com Áudio' : 'Material de apoio e orientações'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Leitura por Áudio */}
                                {lesson.contentBlocks && lesson.contentBlocks.length > 0 && (
                                    <button
                                        onClick={() => setAudioEnabled(!audioEnabled)}
                                        className={`h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase shadow-sm border ${audioEnabled
                                            ? (contentTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-600 border-indigo-500 text-white')
                                            : (contentTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200')
                                            }`}
                                        title={audioEnabled ? 'Desativar Leitura por Áudio' : 'Ativar Leitura por Áudio'}
                                    >
                                        <i className={`fas ${audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-[10px]`}></i>
                                        <span className="hidden sm:inline">Leitura por Áudio</span>
                                    </button>
                                )}

                                {/* Theme Toggle */}
                                <button
                                    onClick={() => setContentTheme(contentTheme === 'light' ? 'dark' : 'light')}
                                    className={`h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase shadow-sm border ${contentTheme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    title={contentTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                                >
                                    <i className={`fas ${contentTheme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[10px]`}></i>
                                    <span className="hidden sm:inline">{contentTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                                </button>

                                <div className="relative" ref={optionsMenuRef}>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                                        className={`h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 border transition-all duration-300 text-[10px] uppercase tracking-wider shadow-sm hover:shadow-md ${isOptionsMenuOpen
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : (contentTheme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                            }`}
                                    >
                                        <i className={`fas fa-cog text-[10px] transition-transform duration-500 ${isOptionsMenuOpen ? 'rotate-90' : ''}`}></i>
                                        <span className="hidden sm:inline">Opções</span>
                                    </motion.button>

                                    {/* Dropdown Menu */}
                                    {isOptionsMenuOpen && (
                                        <div className={`absolute right-0 mt-3 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${contentTheme === 'dark'
                                            ? 'bg-slate-900 border-slate-800'
                                            : 'bg-white border-slate-100'
                                            }`}>
                                            <div className="p-3 space-y-2">
                                                <p className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${contentTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Ajustes do Leitor</p>

                                                {/* Velocidade */}
                                                <div className={`flex flex-col gap-2 p-3 rounded-xl ${contentTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas fa-tachometer-alt text-xs ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Velocidade</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {[0.5, 1.0, 1.5, 2.0].map(speed => (
                                                            <button
                                                                key={speed}
                                                                onClick={() => setPlaybackSpeed(speed)}
                                                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${playbackSpeed === speed
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : (contentTheme === 'dark' ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-white text-slate-500 hover:bg-indigo-50 border border-slate-100')
                                                                    }`}
                                                            >
                                                                {speed === 1.0 ? '1x' : `${speed}x`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tamanho da Fonte */}
                                                <div className={`flex flex-col gap-2 p-3 rounded-xl ${contentTheme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas fa-text-height text-xs ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}></i>
                                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Tamanho da Fonte</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <button
                                                            onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                                                            disabled={fontSize <= 80}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contentTheme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100 disabled:opacity-30'}`}
                                                        >
                                                            <i className="fas fa-minus"></i>
                                                        </button>
                                                        <span className={`text-xs font-bold px-3 ${contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            {fontSize}%
                                                        </span>
                                                        <button
                                                            onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                                                            disabled={fontSize >= 200}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contentTheme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100 disabled:opacity-30'}`}
                                                        >
                                                            <i className="fas fa-plus"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Content area - Inner Scroll */}
                        <div
                            ref={contentScrollContainerRef}
                            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 p-0 md:p-6 relative"
                            onContextMenu={(e) => {
                                const selection = window.getSelection();
                                const text = selection?.toString().trim();

                                // Se houver texto selecionado, previne menu padrao e mostra o nosso
                                if (text && text.length > 0) {
                                    e.preventDefault();

                                    // Calcular posicao para nao sair da tela
                                    let x = e.clientX;
                                    let y = e.clientY;

                                    setContextMenu({ x, y, text });
                                }
                            }}
                            onClick={() => setContextMenu(null)} // Fecha ao clicar fora
                        >
                            <ContentReader
                                lesson={lesson}
                                highlights={highlights}
                                onBlockClick={(blockId, index) => {
                                    playBlock(index);
                                }}
                                onTrackAction={onTrackAction}
                                currentProgress={progress}
                                blockRefs={blockRefs}
                                onSeek={seek}
                            />

                            {/* Context Menu Overlay */}
                            {contextMenu && (
                                <div
                                    className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 flex flex-col min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
                                    style={{ top: contextMenu.y, left: contextMenu.x }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            setBuddyContext(contextMenu.text);
                                            setShowBuddyModal(true);
                                            setContextMenu(null);
                                            onTrackAction?.('Usou Menu Contexto: Perguntar para IA');
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <i className="fas fa-robot text-xs"></i>
                                        </div>
                                        <span className="font-semibold">Perguntar para IA</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Copia para clipboard e abre notas
                                            navigator.clipboard.writeText(contextMenu.text);
                                            setNoteDraft(contextMenu.text); // Passa para o NotesPanel via prop se implementado, ou apenas abre
                                            setSidebarTab('notes');
                                            handleOpenDrawer('notes');
                                            setContextMenu(null);
                                            toast.success('Texto copiado! Cole na sua nota.');
                                            onTrackAction?.('Usou Menu Contexto: Adicionar Nota');
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                                            <i className="fas fa-sticky-note text-xs"></i>
                                        </div>
                                        <span className="font-semibold">Criar Nota com Seleção</span>
                                    </button>

                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(contextMenu.text);
                                            setContextMenu(null);
                                            toast.success('Copiado para área de transferência');
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 transition-colors"
                                    >
                                        <i className="fas fa-copy w-6 text-center"></i>
                                        Copiar Texto
                                    </button>
                                </div>
                            )}

                            {/* Buddy Context Modal */}
                            <BuddyContextModal
                                isOpen={showBuddyModal}
                                onClose={() => setShowBuddyModal(false)}
                                initialContext={buddyContext}
                                userName={user?.name}
                                onAddToNote={(text) => {
                                    setNoteDraft(text);
                                    setSidebarTab('notes');
                                    handleOpenDrawer('notes');
                                    setShowBuddyModal(false);
                                }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Coluna Direita: Sidebar (Materials/Notes/Quiz) - Hidden on Mobile and in Cinema Mode */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className={`lg:col-span-3 ${isCinemaMode ? 'hidden' : 'hidden lg:block'}`}
                >
                    <div className="sticky top-4 space-y-6 max-h-[calc(100vh_-_6rem)] overflow-y-auto pr-2 scrollbar-thin">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setSidebarTab('materials');
                                    onTrackAction?.('Acessou os Materiais da aula');
                                }}
                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'materials'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                    }`}
                            >
                                Materiais
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setSidebarTab('notes');
                                    onTrackAction?.('Acessou Minhas Notas');
                                }}
                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'notes'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                    }`}
                            >
                                Minhas Notas
                            </motion.button>
                        </div>

                        {sidebarTab === 'materials' ? (
                            <LessonMaterialsSidebar lesson={lesson} onTrackAction={onTrackAction} />
                        ) : (
                            <NotesPanelPrototype
                                userId={user.id}
                                lessonId={lesson.id}
                                refreshTrigger={activeBlockId}
                            />
                        )}

                        {/* Seção de Quiz */}
                        {renderQuizStatusCard()}
                    </div>
                </motion.div>
            </div>


            {/* Conteúdo da Matéria (Texto Rico OU Blocos de Áudio) */}


            {/* Mobile Footer Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-slate-100 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="grid grid-cols-3 h-16">
                    <button
                        onClick={() => handleOpenDrawer('materials')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'materials'
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-folder-open text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Materiais</span>
                    </button>

                    <button
                        onClick={() => handleOpenDrawer('notes')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'notes'
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-sticky-note text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Notas</span>
                    </button>

                    <button
                        onClick={() => handleOpenDrawer('quiz')}
                        className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeMobileTab === 'quiz'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        <i className="fas fa-graduation-cap text-lg"></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Quiz</span>
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {
                activeMobileTab && (
                    <div className="lg:hidden fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                            onClick={handleCloseDrawer}
                        ></div>

                        {/* Drawer Content */}
                        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 mb-16 sm:mb-0">
                            {/* Handle / Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <div className="w-10"></div> {/* Spacer */}
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                <button
                                    onClick={handleCloseDrawer}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                                {activeMobileTab === 'materials' && (
                                    <LessonMaterialsSidebar lesson={lesson} onTrackAction={onTrackAction} />
                                )}

                                {activeMobileTab === 'notes' && (
                                    <NotesPanelPrototype
                                        userId={user.id}
                                        lessonId={lesson.id}
                                        refreshTrigger={activeBlockId}
                                        onNoteSelect={handleCloseDrawer}
                                        focusedNoteId={focusedNoteId}
                                    />
                                )}

                                {activeMobileTab === 'quiz' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white">Quiz da Aula</h3>
                                        {renderQuizStatusCard()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Espaçamento extra no fundo apenas no mobile para o menu fixo */}
            <div className="h-20 lg:hidden"></div>

            {/* Practice Configuration Modal */}
            {showPracticeConfigModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                        <i className="fas fa-dumbbell text-2xl text-blue-500"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Modo Prática</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Configure seu treino</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPracticeConfigModal(false)}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Info Alert */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                                <div className="flex gap-3">
                                    <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                        <p className="font-bold">Este modo NÃO concede XP nem afeta seu ranking.</p>
                                        <p className="text-blue-600 dark:text-blue-400">Use para treinar e testar seus conhecimentos!</p>
                                    </div>
                                </div>
                            </div>

                            {/* Question Quantity Selector */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Quantas questões você quer praticar?
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[5, 10, 15, 20, 25, 30].map(count => (
                                        <button
                                            key={count}
                                            onClick={() => setPracticeQuestionCount(count)}
                                            className={`p-4 rounded-xl font-bold text-sm transition-all ${practiceQuestionCount === count
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStartPracticeQuiz}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <i className="fas fa-play"></i>
                                    <span>Iniciar Prática ({practiceQuestionCount} questões)</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {
                showQuizModal && quiz && (
                    <QuizModal
                        quiz={quiz}
                        isOpen={showQuizModal}
                        onClose={() => setShowQuizModal(false)}
                        onSubmit={handleQuizSubmit}
                        isSubmitting={isSubmittingQuiz}
                    />
                )
            }

            {/* Modal de Resultado */}
            {
                quizResult && quiz && (
                    <QuizResultsModal
                        result={quizResult}
                        passingScore={quiz.passingScore}
                        isOpen={!!quizResult}
                        onClose={() => setQuizResult(null)}
                        quizMode={quizMode}
                        onRetry={() => {
                            setQuizResult(null);
                            if (quizMode === 'practice') {
                                setShowPracticeConfigModal(true);
                            } else {
                                handleStartQuiz();
                            }
                        }}
                    />
                )
            }

            {/* Image Viewer Modal */}
            {showImageViewerModal && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowImageViewerModal(false)}
                >
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowImageViewerModal(false)}
                            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/20"
                            title="Fechar"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>

                        {/* Image */}
                        <img
                            src={viewerImageUrl}
                            alt="Visualização"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Image Info */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                            <p className="text-xs text-white/80 font-medium">
                                Clique fora da imagem para fechar
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default LessonViewer;
