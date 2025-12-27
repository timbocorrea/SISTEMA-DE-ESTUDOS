
import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson, User, UserProgress } from '../domain/entities';
import VideoPlayer from './VideoPlayer';
import LessonMaterialsSidebar from './LessonMaterialsSidebar';
// import GeminiBuddy from './GeminiBuddy'; // Removed: Uses global now
import NotesPanelPrototype from './NotesPanelPrototype';

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
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [lastAccessedId, setLastAccessedId] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState<number>(0);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // Velocidade de reprodução
    const [audioEnabled, setAudioEnabled] = useState<boolean>(true); // Controle para ativar/desativar áudio
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playbackSpeedRef = useRef<number>(playbackSpeed); // Ref para manter valor atualizado nos callbacks
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const optionsMenuRef = useRef<HTMLDivElement | null>(null);

    // Estado para o widget flutuante do Buddy AI
    // const [isBuddyOpen, setIsBuddyOpen] = useState(false); // Removed: Global Buddy used

    // Find progress for this lesson
    const lessonProgress = userProgress.find(p => p.lessonId === lesson.id);

    // Initial Resume Logic (Scroll and Focus)
    useEffect(() => {
        if (lessonProgress?.lastAccessedBlockId) {
            const blockId = lessonProgress.lastAccessedBlockId;
            setLastAccessedId(blockId);

            // Wait for DOM to be ready
            setTimeout(() => {
                const element = blockRefs.current[blockId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    }, [lesson.id]);

    // Update playback rate dynamically
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed; // Atualizar ref
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);



    const playBlock = (index: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];
        if (!block.audioUrl) {
            setActiveBlockId(null);
            return;
        }

        // Se clicar no bloco que está tocando, pausar
        if (activeBlockId === block.id && audioRef.current) {
            audioRef.current.pause();
            setActiveBlockId(null);
            setAudioProgress(0);
            onTrackAction?.(`Pausou o áudio no bloco de texto`);
            return;
        }

        // Cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        setActiveBlockId(block.id);
        setAudioProgress(0);

        // Save progress (Resume point)
        onProgressUpdate(lesson.watchedSeconds, block.id);

        const audio = new Audio(block.audioUrl);
        audioRef.current = audio;

        // Aplicar velocidade de reprodução
        audio.playbackRate = playbackSpeedRef.current;

        // Atualizar progresso do áudio
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                setAudioProgress(progress);
            }
        };

        audio.onended = () => {
            setAudioProgress(0);
            // Auto-advance
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl) {
                playBlock(nextIndex);
            } else {
                setActiveBlockId(null);
            }
        };

        audio.play().catch(err => console.error("Audio playback failed", err));

        // Track the interaction
        const blockPreview = block.text.replace(/<[^>]*>/g, '').substring(0, 50); // Strip HTML and get first 50 chars
        onTrackAction?.(`Ativou áudio no bloco: "${blockPreview}..."`);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

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
        if (!audioRef.current) return;
        e.stopPropagation();

        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const width = rect.width;

        if (width > 0) {
            const percentage = Math.max(0, Math.min(100, (offsetX / width) * 100));
            if (Number.isFinite(audioRef.current.duration)) {
                const newTime = (audioRef.current.duration * percentage) / 100;
                audioRef.current.currentTime = newTime;
                setAudioProgress(percentage);
            }
        }
    };

    return (
        <div className="w-full max-w-[1920px] mx-auto px-2 md:px-6 py-4 md:py-8 flex flex-col lg:flex-row gap-8">
            {/* Coluna Esquerda: Conteúdo da Aula */}
            <div className="flex-1 min-w-0 space-y-6">
                <button
                    onClick={onBackToLessons}
                    className="text-slate-500 dark:text-slate-400 text-sm font-black flex items-center gap-2 hover:text-indigo-500 transition uppercase tracking-wider"
                >
                    <i className="fas fa-arrow-left"></i> Voltar às aulas
                </button>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{lesson.title}</h2>
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

                {lesson.videoUrl && (
                    <VideoPlayer lesson={lesson} onProgress={onProgressUpdate} />
                )}

                {/* Conteúdo da Matéria (Texto Rico OU Blocos de Áudio) */}
                <div className={`p-4 md:p-8 rounded-3xl border shadow-sm transition-colors ${contentTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`flex items-center justify-between mb-6 pb-4 border-b ${contentTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
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

                    {/* Rendering Logic: If has blocks, render blocks. Else render rich text. */}
                    {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
                        <div>
                            {lesson.contentBlocks.map((block, index) => {
                                // Calcular o espaçamento usando a mesma lógica do editor
                                const spacing = block.spacing !== undefined ? block.spacing : 8;
                                const spacingClass = spacing === 0 ? 'mb-0' : spacing === 4 ? 'mb-4' : spacing === 8 ? 'mb-8' : spacing === 12 ? 'mb-12' : spacing === 16 ? 'mb-16' : spacing === 24 ? 'mb-24' : 'mb-8';

                                return (
                                    <div
                                        key={block.id}
                                        ref={el => { blockRefs.current[block.id] = el; }}
                                        className={`relative p-2 md:p-4 rounded-2xl border transition-all duration-500 group ${audioEnabled ? 'cursor-pointer' : 'cursor-text'} ${spacingClass} ${activeBlockId === block.id
                                            ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/10 audio-block-active'
                                            : lastAccessedId === block.id
                                                ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700'
                                                : 'border-transparent'
                                            }`}
                                        onClick={() => audioEnabled && playBlock(index)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <div
                                                    className={`leading-relaxed transition-colors font-medium break-words overflow-hidden lesson-block-content ${activeBlockId === block.id
                                                        ? (contentTheme === 'light' ? 'text-slate-900' : 'text-indigo-100') // Cor quando tocando (Ativo)
                                                        : (contentTheme === 'light' ? 'text-slate-700' : 'text-slate-300') // Cor normal (Inativo)
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: block.text }}
                                                />
                                            </div>
                                        </div>

                                        {/* Barra de Progresso do Áudio Interativa */}
                                        {activeBlockId === block.id && (
                                            <div
                                                className="mt-4 w-full cursor-pointer group py-2 select-none"
                                                onClick={handleSeek}
                                                title="Clique para alterar a posição"
                                            >
                                                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                                    <div
                                                        className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-75 ease-linear relative"
                                                        style={{ width: `${audioProgress}%` }}
                                                    >
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md translate-x-1/2 pointer-events-none"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Indicador de última posição */}
                                        {lastAccessedId === block.id && activeBlockId !== block.id && (
                                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            className={`leading-relaxed lesson-content-view break-words overflow-hidden ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                            style={{ fontSize: '15px', lineHeight: '1.8' }}
                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                        />
                    )}
                </div>
            </div>

            {/* Coluna Direita: Materials/Buddy/Notes */}
            <div className="w-full lg:w-[340px] flex-shrink-0">
                <div className="sticky top-8 space-y-6 h-fit self-start">
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
                        {/* Tutor IA Button Removed - Global Widget Active */}
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
                        <LessonMaterialsSidebar lesson={lesson} />
                    ) : (
                        <NotesPanelPrototype userId={user.id} lessonId={lesson.id} refreshTrigger={activeBlockId} />
                    )}

                </div>
            </div>
        </div>
    );
};

export default LessonViewer;
