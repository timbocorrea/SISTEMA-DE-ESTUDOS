// Fixed syntax
import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson, User, UserProgress } from '../domain/entities';
import VideoPlayer from './VideoPlayer';
import LessonMaterialsSidebar from './LessonMaterialsSidebar';
// import GeminiBuddy from './GeminiBuddy'; // Removed: Uses global now
import NotesPanelPrototype from './NotesPanelPrototype';
import QuizModal from './QuizModal';
import QuizResultsModal from './QuizResultsModal';
import { Quiz, QuizAttemptResult } from '../domain/quiz-entities';
import { createSupabaseClient } from '../services/supabaseClient';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';

import { LessonNotesRepository } from '../repositories/LessonNotesRepository';
import { useLessonStore } from '../stores/useLessonStore';
import ContentReader from './lesson/ContentReader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
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
    contentTheme: 'light' | 'dark';
    setContentTheme: (theme: 'light' | 'dark') => void;
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
    contentTheme,
    setContentTheme,
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
        setAudioEnabled
    } = useLessonStore();

    // Custom Hooks
    const { audioProgress, playBlock, seekTo, audioRef } = useAudioPlayer({
        lesson,
        onTrackAction,
        onProgressUpdate: onProgressUpdate
    });

    // Local state (kept here as they're specific to this component instance)
    const [lastAccessedId, setLastAccessedId] = useState<string | null>(null);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const optionsMenuRef = useRef<HTMLDivElement | null>(null);

    // Video switcher state
    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

    // Quiz State
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

    // Mobile Navigation State
    const [activeMobileTab, setActiveMobileTab] = useState<'materials' | 'notes' | 'quiz' | null>(null);
    const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);

    // History & Drawer Management
    useEffect(() => {
        const handlePopState = () => {
            if (activeMobileTab) {
                setActiveMobileTab(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeMobileTab]);

    const handleOpenDrawer = (tab: 'materials' | 'notes' | 'quiz') => {
        if (activeMobileTab === tab) {
            handleCloseDrawer();
        } else {
            if (!activeMobileTab) {
                window.history.pushState({ drawer: true }, '', window.location.href);
            }
            setActiveMobileTab(tab);
        }
    };

    const handleCloseDrawer = () => {
        if (activeMobileTab) {
            window.history.back();
        }
    };

    // Carregar quiz quando aula mudar
    useEffect(() => {
        async function loadQuiz() {
            setQuiz(null);
            setQuizResult(null);
            setShowQuizModal(false);

            if (!lesson) return;

            try {
                const supabase = createSupabaseClient();
                const courseRepo = new SupabaseCourseRepository(supabase);

                console.log('🎯 [STUDENT] Carregando quiz para aula:', lesson.id);
                const lessonQuiz = await courseRepo.getQuizByLessonId(lesson.id);

                if (lessonQuiz) {
                    setQuiz(lessonQuiz);
                    lesson.setHasQuiz(true);

                    // Verificar se já passou
                    const attempt = await courseRepo.getLatestQuizAttempt(user.id, lessonQuiz.id);
                    if (attempt?.passed) {
                        lesson.setQuizPassed(true);
                    }
                }
            } catch (error) {
                console.error('❌ [STUDENT] Error loading quiz:', error);
            }
        }

        loadQuiz();
    }, [lesson.id, user.id]);

    const handleQuizSubmit = async (answers: Record<string, string>) => {
        if (!quiz) return;

        setIsSubmittingQuiz(true);
        try {
            const supabase = createSupabaseClient();
            const courseRepo = new SupabaseCourseRepository(supabase);

            const attempt = await courseRepo.submitQuizAttempt(
                user.id,
                quiz.id,
                answers
            );

            const totalPoints = quiz.getTotalPoints();
            const earnedPoints = Math.round((attempt.score / 100) * totalPoints);

            const resultWithScore = {
                score: attempt.score,
                passed: attempt.passed,
                answers: attempt.answers,
                earnedPoints,
                totalPoints
            };

            setShowQuizModal(false);
            setQuizResult(resultWithScore);

            if (attempt.passed) {
                lesson.setQuizPassed(true);
                await onProgressUpdate(lesson.watchedSeconds, activeBlockId || undefined);
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
            toast.error('Erro ao enviar quiz. Tente novamente.');
        } finally {
            setIsSubmittingQuiz(false);
        }
    };

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
                setShowQuizModal(true);
            }
        } else {
            await onProgressUpdate(watchedSeconds, lastBlockId);
        }
    };

    const lessonProgress = userProgress.find(p => p.lessonId === lesson.id);

    // Initial Resume Logic (Scroll and Focus)
    useEffect(() => {
        if (lessonProgress?.lastAccessedBlockId) {
            const blockId = lessonProgress.lastAccessedBlockId;
            setLastAccessedId(blockId);

            setTimeout(() => {
                const element = blockRefs.current[blockId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    }, [lesson.id]);

    // Auto-scroll to active block
    useEffect(() => {
        if (activeBlockId) {
            const element = blockRefs.current[activeBlockId];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // Seek Functionality
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const width = rect.width;

        if (width > 0) {
            const percentage = Math.max(0, Math.min(100, (offsetX / width) * 100));
            seekTo(percentage);
        }
    };

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

                <div className="p-4">
                    <button
                        onClick={quizAvailable ? () => {
                            setShowQuizModal(true);
                            onTrackAction?.('Abriu o Quiz da aula');
                        } : undefined}
                        disabled={!quizAvailable}
                        className={`w-full rounded-xl p-4 transition-all ${quizAvailable
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 cursor-pointer shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-800 cursor-not-allowed opacity-60'
                            }`}
                        title={quizAvailable ? `Iniciar: ${quiz.title}` : `Complete 90% da aula para desbloquear`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${quizAvailable
                                ? 'border-white/20 bg-white/10'
                                : 'border-slate-700 bg-slate-700/50'
                                }`}>
                                <i className={`fas ${quizAvailable ? 'fa-play' : 'fa-lock'} text-xl ${quizAvailable ? 'text-white' : 'text-slate-500'}`}></i>
                            </div>
                            <div className="flex-1 text-left">
                                <h4 className={`font-bold text-sm mb-1 ${quizAvailable ? 'text-white' : 'text-slate-400'}`}>
                                    {quiz.title}
                                </h4>
                                <p className={`text-xs ${quizAvailable ? 'text-emerald-200' : 'text-slate-500'}`}>
                                    {quiz.questions.length} {quiz.questions.length === 1 ? 'Pergunta' : 'Perguntas'}
                                </p>
                            </div>
                            {quizAvailable && (
                                <i className="fas fa-arrow-right text-white text-xl"></i>
                            )}
                        </div>
                    </button>

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

    return (
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-8 space-y-6">
            {/* Header: Voltar + Título */}
            <button
                onClick={onBackToLessons}
                className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider"
            >
                <i className="fas fa-arrow-left"></i> Voltar às aulas
            </button>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">{lesson.title}</h2>
                <div className="flex items-center justify-between">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {course.title}
                    </p>
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-3 h-3 rounded-full ${lesson.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'
                                }`}
                        ></div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            {lesson.isCompleted ? 'Aula Concluída' : 'Em progresso'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Layout 3 Colunas: Lista Vídeos | Player | Sidebar */}
            {/* Layout Principal: 2 Colunas (Conteúdo Esquerda | Sidebar Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Coluna Esquerda: Vídeo + Conteúdo (75% normal, 100% cinema mode) */}
                <motion.div
                    layoutId={`course-card-${course.id}`}
                    transition={{ duration: 0.5, type: "spring" }}
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
                                <button
                                    onClick={() => {
                                        toggleCinemaMode();
                                        onTrackAction?.(isCinemaMode ? 'Desativou Modo Cinema' : 'Ativou Modo Cinema');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-sm font-medium"
                                    title={isCinemaMode ? 'Sair do Modo Cinema' : 'Ativar Modo Cinema'}
                                >
                                    <i className={`fas ${isCinemaMode ? 'fa-compress' : 'fa-expand'}`}></i>
                                    <span className="hidden sm:inline">{isCinemaMode ? 'Sair do Cinema' : 'Modo Cinema'}</span>
                                </button>
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
                                            <button
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
                                            </button>
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
                            <div className="relative" ref={optionsMenuRef}>
                                <button
                                    onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                                    className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md ${isOptionsMenuOpen
                                        ? 'bg-indigo-600 border-indigo-500 text-white'
                                        : (contentTheme === 'dark'
                                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                        }`}
                                >
                                    <i className={`fas fa-cog transition-transform duration-500 ${isOptionsMenuOpen ? 'rotate-90' : ''}`}></i>
                                    <span>Opções</span>
                                </button>

                                {/* Dropdown Menu */}
                                {isOptionsMenuOpen && (
                                    <div className={`absolute right-0 mt-3 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${contentTheme === 'dark'
                                        ? 'bg-slate-900 border-slate-800'
                                        : 'bg-white border-slate-100'
                                        }`}>
                                        <div className="p-3 space-y-2">
                                            <p className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${contentTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Visualização e Áudio</p>

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
                                                        onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                                                        disabled={fontSize >= 150}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${contentTheme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30' : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-100 disabled:opacity-30'}`}
                                                    >
                                                        <i className="fas fa-plus"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Audio Toggle */}
                                            {lesson.contentBlocks && lesson.contentBlocks.length > 0 && (
                                                <button
                                                    onClick={() => setAudioEnabled(!audioEnabled)}
                                                    className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${audioEnabled
                                                        ? (contentTheme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600')
                                                        : (contentTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <i className={`fas ${audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                                                        <span className="text-xs font-bold uppercase tracking-wider">Leitura por Áudio</span>
                                                    </div>
                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${audioEnabled ? 'bg-green-500' : 'bg-slate-400'}`}>
                                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${audioEnabled ? 'right-1' : 'left-1'}`}></div>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Theme Toggle */}
                                            <button
                                                onClick={() => setContentTheme(contentTheme === 'light' ? 'dark' : 'light')}
                                                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${contentTheme === 'dark'
                                                    ? 'bg-indigo-900/20 text-indigo-400'
                                                    : 'bg-indigo-50 text-indigo-600'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <i className={`fas ${contentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                                                    <span className="text-xs font-bold uppercase tracking-wider">{contentTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content area - Inner Scroll */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 p-6">
                            <ContentReader
                                lesson={lesson}
                                highlights={highlights}
                                onBlockClick={(blockId, index) => audioEnabled && playBlock(index)}
                                onTrackAction={onTrackAction}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Coluna Direita: Sidebar (Materials/Notes/Quiz) - Hidden on Mobile and in Cinema Mode */}
                <div className={`lg:col-span-3 ${isCinemaMode ? 'hidden' : 'hidden lg:block'}`}>
                    <div className="sticky top-4 space-y-6 max-h-[calc(100vh_-_6rem)] overflow-y-auto pr-2 scrollbar-thin">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex">
                            <button
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
                            </button>
                            <button
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
                            </button>
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
                </div>
            </div >


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
                        onRetry={() => {
                            setQuizResult(null);
                            setShowQuizModal(true);
                        }}
                    />
                )
            }
        </div >
    );
};

export default LessonViewer;
