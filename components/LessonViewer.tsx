// Fixed syntax
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShimmerButton } from './ui/shimmer-button';
import { Course, Lesson, User, UserProgress } from '../domain/entities';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import SlideViewer from './SlideViewer';
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
    onBlockRead?: (blockId: string) => void;
    onVideoWatched?: (videoUrl: string) => void;
    onAudioListened?: (blockId: string) => void;
    onBackToLessons: () => void;
    onBackToModules: () => void;
    sidebarTab: 'materials' | 'notes';
    setSidebarTab: (tab: 'materials' | 'notes') => void;
    userProgress?: UserProgress[];
    onTrackAction?: (action: string) => void;
    onToggleSidebar?: () => void;
}

const LessonViewer: React.FC<LessonViewerProps> = ({
    course,
    lesson,
    user,
    onLessonSelect,
    onProgressUpdate,
    onBlockRead,
    onVideoWatched,
    onAudioListened,
    onBackToLessons,
    onBackToModules,
    sidebarTab,
    setSidebarTab,
    userProgress = [],
    onTrackAction,
    onToggleSidebar
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
    const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const optionsMenuRef = useRef<HTMLDivElement | null>(null);
    const speedMenuRef = useRef<HTMLDivElement | null>(null);

    // Image Viewer Modal State
    const [showImageViewerModal, setShowImageViewerModal] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, text: string } | null>(null);
    const [showBuddyModal, setShowBuddyModal] = useState(false);
    const [buddyContext, setBuddyContext] = useState('');

    // Notes Panel Trigger (to pass text)
    const [noteDraft, setNoteDraft] = useState<string>('');
    const [noteDraftWithRange, setNoteDraftWithRange] = useState<{ text: string, range: Range } | null>(null);

    // Video switcher state
    const activeVideoRef = useRef<VideoPlayerRef>(null);
    const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

    // Materials/Notes panel state (overlay on desktop)
    const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);

    // Audio playback state (persists across panel open/close)
    const [isAudioActive, setIsAudioActive] = useState(false);
    const [audioTitle, setAudioTitle] = useState<string | undefined>();
    const handleAudioStateChange = useCallback((playing: boolean, title?: string) => {
        setIsAudioActive(playing);
        setAudioTitle(title);
    }, []);

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
     * Intercepta a atualizacao de progresso para verificar se precisa abrir o quiz
     */
    const handleProgressUpdateInternal = useCallback(async (watchedSeconds: number, lastBlockId?: string) => {
        // Check combined progress from the lesson entity
        const progressPercent = lesson.calculateProgressPercentage();
        const isCompletingNow = progressPercent >= 90;

        if (isCompletingNow && quiz && !lesson.quizPassed) {
            await onProgressUpdate(watchedSeconds, lastBlockId);

            if (!showQuizModal && !quizResult) {
                handleStartQuiz();
            }
        } else {
            await onProgressUpdate(watchedSeconds, lastBlockId);
        }
    }, [lesson, quiz, showQuizModal, quizResult, onProgressUpdate]);

    // --- IntersectionObserver for Text Reading Detection ---
    useEffect(() => {
        if (!lesson.contentBlocks || lesson.contentBlocks.length === 0) return;
        if (!onBlockRead) return;

        const blockTimers = new Map<string, NodeJS.Timeout>();
        const alreadyRead = new Set(lesson.textBlocksRead);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const blockId = (entry.target as HTMLElement).dataset.blockId;
                    if (!blockId || alreadyRead.has(blockId)) return;

                    if (entry.isIntersecting) {
                        // Block is >50% visible — start 3-second timer
                        if (!blockTimers.has(blockId)) {
                            const timer = setTimeout(() => {
                                alreadyRead.add(blockId);
                                onBlockRead(blockId);
                                blockTimers.delete(blockId);
                            }, 3000);
                            blockTimers.set(blockId, timer);
                        }
                    } else {
                        // Block scrolled out — cancel timer
                        const timer = blockTimers.get(blockId);
                        if (timer) {
                            clearTimeout(timer);
                            blockTimers.delete(blockId);
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe all block elements after a small delay for refs to be populated
        const observeTimer = setTimeout(() => {
            const refs = blockRefs.current;
            Object.values(refs).forEach((el) => {
                if (el) observer.observe(el);
            });
        }, 500);

        return () => {
            clearTimeout(observeTimer);
            observer.disconnect();
            blockTimers.forEach((timer) => clearTimeout(timer));
            blockTimers.clear();
        };
    }, [lesson.id, lesson.contentBlocks.length, onBlockRead]);

    const {
        isPlaying,
        progress,
        playBlock,
        toggleAudio,
        pauseAudio,
        seek
    } = useAudioPlayer({
        lesson,
        onTrackAction,
        onProgressUpdate: handleProgressUpdateInternal,
        onAudioListened,
        onPlay: () => {
            activeVideoRef.current?.pause();
        }
    });

    const handleBlockClick = useCallback((_blockId: string, index: number) => {
        playBlock(index);
    }, [playBlock]);

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
    // Auto-scroll to active block
    useEffect(() => {
        if (activeBlockId) {
            const element = blockRefs.current[activeBlockId];
            const container = contentScrollContainerRef.current;

            if (element && container) {
                // Use setTimeout to ensure UI has settled
                setTimeout(() => {
                    // Use getBoundingClientRect for robust calculation relative to viewport
                    // This avoids issues with zoom, offsetParent, and prevents window scrolling (unlike scrollIntoView)
                    const containerRect = container.getBoundingClientRect();
                    const elementRect = element.getBoundingClientRect();

                    // Calculate the relative position of the element inside the visible container area
                    const relativeTop = elementRect.top - containerRect.top;
                    const elementHeight = elementRect.height;
                    const containerHeight = containerRect.height;

                    // Calculate desired scroll position to center the element
                    // container.scrollTop is the current scroll. We add relativeTop to get to element, then subtract half container to center.
                    const targetScrollTop = container.scrollTop + relativeTop - (containerHeight / 2) + (elementHeight / 2);

                    container.scrollTo({
                        top: targetScrollTop,
                        behavior: 'smooth'
                    });
                }, 100);
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

                const formattedHighlights: any[] = [];

                dbNotes.forEach(note => {
                    // Add primary highlight
                    if (note.has_highlight && note.highlighted_text) {
                        formattedHighlights.push({
                            id: note.id,
                            text: note.highlighted_text,
                            color: note.highlight_color as 'yellow' | 'green' | 'blue' | 'pink',
                            onClick: () => {
                                setFocusedNoteId(note.id);
                                setSidebarTab('notes');
                                handleOpenDrawer('notes');
                            }
                        });
                    }

                    // Add extra highlights (from unifications)
                    if (note.extra_highlights && Array.isArray(note.extra_highlights)) {
                        note.extra_highlights.forEach((extra: any) => {
                            if (extra.text) {
                                formattedHighlights.push({
                                    id: note.id, // Linked to the same note ID
                                    text: extra.text,
                                    color: extra.color || 'yellow',
                                    onClick: () => {
                                        setFocusedNoteId(note.id);
                                        setSidebarTab('notes');
                                        handleOpenDrawer('notes');
                                    }
                                });
                            }
                        });
                    }
                });

                setHighlights(formattedHighlights);
            } catch (err) {
                console.error("Error loading highlights:", err);
            }
        };

        loadHighlights();

        return () => { isMounted = false; };
    }, [lesson.id, user.id]);

    const handleNotesChange = (updatedNotesData: any[]) => {
        const formattedHighlights: any[] = [];

        updatedNotesData.forEach(note => {
            // Add primary highlight
            if (note.hasHighlight && note.highlightedText) {
                formattedHighlights.push({
                    id: note.id,
                    text: note.highlightedText,
                    color: note.highlightColor as 'yellow' | 'green' | 'blue' | 'pink',
                    onClick: () => {
                        setFocusedNoteId(note.id);
                        setSidebarTab('notes');
                        handleOpenDrawer('notes');
                    }
                });
            }

            // Add extra highlights
            if (note.extraHighlights && Array.isArray(note.extraHighlights)) {
                note.extraHighlights.forEach((extra: any) => {
                    if (extra.text) {
                        formattedHighlights.push({
                            id: note.id,
                            text: extra.text,
                            color: extra.color || 'yellow',
                            onClick: () => {
                                setFocusedNoteId(note.id);
                                setSidebarTab('notes');
                                handleOpenDrawer('notes');
                            }
                        });
                    }
                });
            }
        });

        setHighlights(formattedHighlights);
    };

    // Fechar menu de opções ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
            }
            if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
                setIsSpeedMenuOpen(false);
            }
        };

        if (isOptionsMenuOpen || isSpeedMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOptionsMenuOpen, isSpeedMenuOpen]);

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



    const renderQuizStatusCard = () => {
        if (!quiz) return null;

        const quizAvailable = quiz.isManuallyReleased || lesson.isCompleted || lesson.calculateProgressPercentage() >= 90;

        return (

            <div className={`rounded-3xl border overflow-hidden transition-all duration-300 shadow-sm ${quizAvailable
                ? 'bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-green-50/50 dark:from-emerald-900/40 dark:via-teal-900/30 dark:to-green-900/40 border-emerald-500/20 dark:border-emerald-500/30 shadow-emerald-500/5'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}>
                {/* Header Section */}
                <div className={`p-4 border-b flex items-center gap-4 ${quizAvailable
                    ? 'bg-emerald-500/5 dark:bg-emerald-800/30 border-emerald-500/10 dark:border-emerald-700/30'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${quizAvailable
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                        }`}>
                        <i className={`fas ${quizAvailable ? 'fa-graduation-cap' : 'fa-lock'} text-xl`}></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">Quiz da Aula</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`flex h-2 w-2 rounded-full ${quizAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${quizAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {quizAvailable ? 'Disponível' : 'Bloqueado'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Dual-Mode Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Practice Mode Button */}
                        <button
                            onClick={() => setShowPracticeConfigModal(true)}
                            className="group relative rounded-2xl p-4 transition-all duration-300 bg-white dark:bg-blue-600/10 border-2 border-blue-500/20 dark:border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-600/20 shadow-sm hover:shadow-md"
                            title="Modo Prática - Sem XP"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-400/20 dark:border-blue-400/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                    <i className="fas fa-dumbbell text-xl text-blue-600 dark:text-blue-400"></i>
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-sm text-slate-800 dark:text-slate-100 mb-0.5">Prática</p>
                                    <p className="text-[9px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-widest opacity-80">Sem XP</p>
                                </div>
                            </div>
                        </button>

                        {/* Evaluation Mode Button */}
                        <button
                            onClick={quizAvailable ? handleStartQuiz : undefined}
                            disabled={!quizAvailable}
                            className={`group relative rounded-2xl p-4 transition-all duration-300 ${quizAvailable
                                ? 'bg-white dark:bg-emerald-600/10 border-2 border-emerald-500/20 dark:border-emerald-500/40 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-600/20 shadow-sm hover:shadow-md cursor-pointer'
                                : 'bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700/50 cursor-not-allowed grayscale'
                                }`}
                            title={quizAvailable ? "Modo Avaliativo - Ganhe XP" : "Complete 90% da aula para desbloquear"}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 ${quizAvailable
                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/20 dark:border-emerald-400/30 group-hover:scale-110'
                                    : 'bg-slate-200 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600'
                                    }`}>
                                    <i className={`fas ${quizAvailable ? 'fa-trophy' : 'fa-lock'} text-xl ${quizAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}></i>
                                </div>
                                <div className="text-center">
                                    <p className={`font-black text-sm mb-0.5 ${quizAvailable ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>Avaliativo</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest opacity-80 ${quizAvailable ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {quizAvailable ? 'Ganhe XP' : 'Bloqueado'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Quiz Info */}
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Título do Questionário</p>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate">{quiz.title}</span>
                        </div>
                        <div className="text-right flex-shrink-0 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{quiz.questions.length || quiz.questionsCount || 0}</p>
                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">Questões</p>
                        </div>
                    </div>

                    {quizAvailable && (
                        <div className="flex items-center gap-2 px-1">
                            <i className="fas fa-circle-check text-emerald-500 text-[10px]"></i>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Nota mínima para aprovação: <span className="text-indigo-600 dark:text-indigo-400">{quiz.passingScore}%</span></p>
                        </div>
                    )}

                    {!quizAvailable && (
                        <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100/50 dark:border-slate-700">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                                <span>Progresso Requerido</span>
                                <span className="text-indigo-600 dark:text-indigo-300">
                                    {lesson.calculateProgressPercentage()}% / 90%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
                                    style={{ width: `${Math.min(lesson.calculateProgressPercentage(), 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-3 text-center font-medium italic">
                                {90 - lesson.calculateProgressPercentage() > 0
                                    ? `Assista mais ${(90 - lesson.calculateProgressPercentage()).toFixed(0)}% do conteúdo para liberar o teste.`
                                    : 'Recarregue a página para liberar o quiz!'}
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

    // Determine if current active item is a slide presentation
    const activePlaylistItem = (lesson.videoUrls && lesson.videoUrls.length > 0) ? lesson.videoUrls[activeVideoIndex] : null;
    const isSlideActive = activePlaylistItem?.type === 'slides' && ((activePlaylistItem?.slides && activePlaylistItem.slides.length > 0) || !!activePlaylistItem?.fileUrl);

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
                {/* Content Skeleton: Flex 2 Colunas (40% Vídeo | 60% Texto) */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Coluna Esquerda: Vídeo (40%) */}
                    <div className="lg:w-[40%] shrink-0 space-y-3">
                        <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                    {/* Coluna Direita: Texto (60%) */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-11/12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                        <div className="space-y-3 mt-4">
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
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-6 space-y-4">
            {/* Header: Título + Botões de Navegação */}
            <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Hamburger + Title */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Hamburger - opens sidebar overlay (desktop) */}
                        <button
                            onClick={onToggleSidebar}
                            className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                            title="Menu de Navegação"
                        >
                            <i className="fas fa-bars text-sm"></i>
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-sm md:text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight truncate">{lesson.title}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                                {course.title}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Status Indicator */}
                        <div className="hidden md:flex items-center gap-2">
                            <div
                                className={`w-2 h-2 rounded-full ${lesson.isCompleted ? 'bg-green-500' : 'bg-indigo-500 animate-pulse'
                                    }`}
                            ></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {lesson.isCompleted ? 'Concluída' : 'Em andamento'}
                            </span>
                        </div>

                        {/* Materials/Notes Button (desktop) */}
                        <button
                            onClick={() => {
                                setIsMaterialsPanelOpen(true);
                                onTrackAction?.('Abriu Materiais/Notas');
                            }}
                            className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                            title="Materiais e Notas"
                        >
                            <i className="fas fa-book-reader text-xs"></i>
                            <span>Materiais</span>
                        </button>

                        {/* Back Button */}
                        <ShimmerButton
                            onClick={onBackToLessons}
                            className="h-9 px-4 shadow-lg transition-all hover:scale-105 active:scale-95"
                            background="radial-gradient(ellipse 80% 80% at 50% -20%,rgba(79,70,229,0.3),rgba(15,23,42,1))"
                            shimmerColor="#818cf8"
                            shimmerSize="0.1em"
                            borderRadius="12px"
                        >
                            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white">
                                <i className="fas fa-arrow-left"></i> <span className="hidden sm:inline">Voltar</span>
                            </span>
                        </ShimmerButton>
                        <a
                            href="/courses"
                            className="h-9 px-4 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all hover:scale-105 active:scale-95"
                            title="Ir para o Dashboard"
                        >
                            <i className="fas fa-home text-sm"></i>
                            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Home</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Layout Principal: Flex 2 Colunas (Vídeo 40% | Texto 60%) em Desktop */}
            <div className={`flex flex-col ${!isCinemaMode && (lesson.videoUrl || (lesson.videoUrls && lesson.videoUrls.length > 0)) ? 'lg:flex-row' : ''} gap-4 relative`}>

                {/* Coluna Esquerda: Vídeo + Playlist (40% desktop, 100% mobile, hidden cinema mode) */}
                {(lesson.videoUrl || (lesson.videoUrls && lesson.videoUrls.length > 0)) && !isCinemaMode && (
                    <div className="lg:w-[40%] shrink-0 space-y-3">
                        <div className="lg:sticky lg:top-4 space-y-3">
                            {/* Player or SlideViewer */}
                            <div className="w-full">
                                {isSlideActive ? (
                                    <SlideViewer
                                        title={activePlaylistItem!.title || 'Apresentação'}
                                        slides={activePlaylistItem!.slides}
                                        fileUrl={activePlaylistItem!.fileUrl}
                                        fileType={activePlaylistItem!.fileType}
                                    />
                                ) : (
                                    <VideoPlayer
                                        ref={activeVideoRef}
                                        lesson={lesson}
                                        videoUrl={currentVideoUrl}
                                        onProgress={handleProgressUpdateInternal}
                                        onPlay={() => {
                                            pauseAudio();
                                            onTrackAction?.(`Reproduziu vídeo: ${currentVideoUrl || lesson.title}`);
                                        }}
                                    />
                                )}
                            </div>

                            {/* Cinema Mode Toggle */}
                            <div className="flex justify-end">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        toggleCinemaMode();
                                        onTrackAction?.(isCinemaMode ? 'Desativou Modo Cinema' : 'Ativou Modo Cinema');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-medium"
                                    title={isCinemaMode ? 'Sair do Modo Cinema' : 'Ativar Modo Cinema'}
                                >
                                    <i className={`fas ${isCinemaMode ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                                    <span className="hidden sm:inline">{isCinemaMode ? 'Sair do Cinema' : 'Modo Cinema'}</span>
                                </motion.button>
                            </div>

                            {/* Playlist Vertical de Vídeos */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
                                    <i className="fas fa-film text-indigo-500 text-xs"></i>
                                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Playlist</h3>
                                    {lesson.videoUrls && lesson.videoUrls.length > 1 && (
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-auto bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {activeVideoIndex + 1} / {lesson.videoUrls.length}
                                        </span>
                                    )}
                                </div>

                                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {(lesson.videoUrls && lesson.videoUrls.length > 0 ? lesson.videoUrls : [{ url: lesson.videoUrl, title: lesson.title }]).map((video: any, index: number) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setActiveVideoIndex(index);
                                                onTrackAction?.(`Trocou para vídeo: ${video.title}`);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 text-left transition-all border-b last:border-b-0 ${activeVideoIndex === index
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-16 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 relative">
                                                {video.imageUrl ? (
                                                    <img src={video.imageUrl} alt={video.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <i className={`fas ${video.type === 'slides' ? 'fa-images text-amber-400' : 'fa-play'} text-xs ${activeVideoIndex === index ? (video.type === 'slides' ? 'text-amber-400' : 'text-indigo-400') : (video.type === 'slides' ? 'text-amber-500/50' : 'text-white/30')}`}></i>
                                                    </div>
                                                )}
                                                {activeVideoIndex === index && (
                                                    <div className={`absolute inset-0 ${video.type === 'slides' ? 'bg-amber-500/20' : 'bg-indigo-600/20'} flex items-center justify-center`}>
                                                        <i className={`fas ${video.type === 'slides' ? 'fa-images' : 'fa-volume-up'} text-white text-xs animate-pulse`}></i>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-semibold truncate ${activeVideoIndex === index ? (video.type === 'slides' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400') : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {video.title || (video.type === 'slides' ? `Slides ${index + 1}` : `Vídeo ${index + 1}`)}
                                                </p>
                                                {activeVideoIndex === index && (
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${video.type === 'slides' ? 'text-amber-500' : 'text-indigo-500'}`}>
                                                        {video.type === 'slides' ? 'Apresentação' : 'Reproduzindo'}
                                                    </span>
                                                )}
                                                {video.type === 'slides' && activeVideoIndex !== index && (
                                                    <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider">Slides</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cinema Mode: Vídeo fullwidth */}
                {(lesson.videoUrl || (lesson.videoUrls && lesson.videoUrls.length > 0)) && isCinemaMode && (
                    <div className="w-full space-y-3">
                        <VideoPlayer
                            ref={activeVideoRef}
                            lesson={lesson}
                            videoUrl={currentVideoUrl}
                            onProgress={handleProgressUpdateInternal}
                            onPlay={() => {
                                pauseAudio();
                                onTrackAction?.(`Reproduziu vídeo: ${currentVideoUrl || lesson.title}`);
                            }}
                        />
                        <div className="flex justify-end">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    toggleCinemaMode();
                                    onTrackAction?.('Desativou Modo Cinema');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 text-xs font-medium"
                                title="Sair do Modo Cinema"
                            >
                                <i className="fas fa-compress text-xs"></i>
                                <span className="hidden sm:inline">Sair do Cinema</span>
                            </motion.button>
                        </div>
                    </div>
                )}

                {/* Coluna Central: Conteúdo da Aula (65% desktop, 100% mobile) */}
                <div className={`flex-1 min-w-0 ${isCinemaMode ? 'hidden' : ''}`}>

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

                                {/* Speed Control Standalone */}
                                <div className="relative" ref={speedMenuRef}>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                                        className={`h-9 px-2 sm:px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 border transition-all duration-300 text-[10px] uppercase tracking-wider shadow-sm hover:shadow-md ${isSpeedMenuOpen
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : (contentTheme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                                            }`}
                                    >
                                        <i className={`fas fa-tachometer-alt text-[10px] ${isSpeedMenuOpen ? 'text-white' : (contentTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600')}`}></i>
                                        <span className="font-bold">{playbackSpeed === 1.0 ? '1x' : `${playbackSpeed}x`}</span>
                                    </motion.button>

                                    {/* Speed Dropdown Menu */}
                                    {isSpeedMenuOpen && (
                                        <div className={`absolute right-0 mt-3 w-40 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${contentTheme === 'dark'
                                            ? 'bg-slate-900 border-slate-800'
                                            : 'bg-white border-slate-100'
                                            }`}>
                                            <div className="p-2 space-y-1">
                                                <p className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest ${contentTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Velocidade</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5].map(speed => (
                                                        <button
                                                            key={speed}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPlaybackSpeed(speed);
                                                                setIsSpeedMenuOpen(false);
                                                            }}
                                                            className={`py-2 text-[10px] font-bold rounded-lg transition-all ${playbackSpeed === speed
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : (contentTheme === 'dark'
                                                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                                    : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100')
                                                                }`}
                                                        >
                                                            {speed === 1.0 ? '1x' : `${speed}x`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                onBlockClick={handleBlockClick}
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
                                            // Captura selecao e passa para o NotesPanel
                                            const selection = window.getSelection();
                                            if (selection && selection.rangeCount > 0) {
                                                const range = selection.getRangeAt(0).cloneRange();
                                                setNoteDraftWithRange({ text: contextMenu.text, range });
                                            } else {
                                                setNoteDraft(contextMenu.text);
                                            }

                                            setSidebarTab('notes');
                                            handleOpenDrawer('notes');
                                            setContextMenu(null);
                                            onTrackAction?.('Usou Menu Contexto: Criar Nota com Seleção');
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
                </div>

                {/* Floating Mini Audio Player (when panel closed + audio playing) */}
                {!isMaterialsPanelOpen && isAudioActive && (
                    <button
                        onClick={() => {
                            setSidebarTab('materials');
                            setIsMaterialsPanelOpen(true);
                        }}
                        className="hidden lg:flex fixed right-4 bottom-6 z-[55] items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 animate-in slide-in-from-right duration-300"
                        title="Abrir player de áudio"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <i className="fas fa-music text-sm animate-pulse"></i>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Reproduzindo</p>
                            <p className="text-xs font-bold truncate max-w-[150px]">{audioTitle || 'Áudio'}</p>
                        </div>
                    </button>
                )}

                {/* Overlay: Painel Materiais/Notas/Quiz (Desktop Only) - Always mounted for audio persistence */}
                <>
                    {/* Backdrop */}
                    {isMaterialsPanelOpen && (
                        <div
                            className="hidden lg:block fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
                            onClick={() => setIsMaterialsPanelOpen(false)}
                        />
                    )}
                    {/* Panel - always mounted but visually hidden when closed */}
                    <div
                        className={`hidden fixed right-0 top-0 bottom-0 w-[380px] z-[65] flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ${isMaterialsPanelOpen ? 'lg:flex translate-x-0' : 'lg:flex lg:translate-x-full lg:pointer-events-none lg:invisible'}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex flex-1">
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
                            <button
                                onClick={() => setIsMaterialsPanelOpen(false)}
                                className="ml-3 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
                            {sidebarTab === 'materials' ? (
                                <LessonMaterialsSidebar lesson={lesson} onTrackAction={onTrackAction} onAudioStateChange={handleAudioStateChange} />
                            ) : (
                                <NotesPanelPrototype
                                    userId={user.id}
                                    lessonId={lesson.id}
                                    refreshTrigger={activeBlockId}
                                    onNotesChange={handleNotesChange}
                                    externalDraft={noteDraftWithRange}
                                />
                            )}
                            {renderQuizStatusCard()}
                        </div>
                    </div>
                </>
            </div>


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
                                        onNotesChange={handleNotesChange}
                                        externalDraft={noteDraftWithRange}
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
