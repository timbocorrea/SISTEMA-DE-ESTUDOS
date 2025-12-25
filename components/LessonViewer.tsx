
import React, { useState, useEffect, useRef } from 'react';
import { Course, Lesson, User, UserProgress } from '../domain/entities';
import VideoPlayer from './VideoPlayer';
import LessonMaterialsSidebar from './LessonMaterialsSidebar';
import GeminiBuddy from './GeminiBuddy';

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
    sidebarTab: 'materials' | 'buddy';
    setSidebarTab: (tab: 'materials' | 'buddy') => void;
    userProgress?: UserProgress[];
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
    userProgress = []
}) => {
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [lastAccessedId, setLastAccessedId] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState<number>(0);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // Velocidade de reprodução
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
        audio.playbackRate = playbackSpeed;

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
        <div className="max-w-[1800px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9 space-y-6">
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
                <div className={`p-8 rounded-3xl border shadow-sm transition-colors ${contentTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
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
                        <div className="flex items-center gap-3">
                            {/* Controle de Velocidade - Apenas para blocos de áudio */}
                            {lesson.contentBlocks && lesson.contentBlocks.length > 0 && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${contentTheme === 'dark'
                                    ? 'bg-slate-800 border-slate-700'
                                    : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <i className={`fas fa-tachometer-alt text-xs ${contentTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}></i>
                                    <select
                                        value={playbackSpeed}
                                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                                        className={`bg-transparent text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                                        title="Velocidade de reprodução"
                                    >
                                        <option value={0.5}>0.5x</option>
                                        <option value={0.75}>0.75x</option>
                                        <option value={1.0}>Normal</option>
                                        <option value={1.25}>1.25x</option>
                                        <option value={1.5}>1.5x</option>
                                        <option value={1.75}>1.75x</option>
                                        <option value={2.0}>2.0x</option>
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={() => setContentTheme(contentTheme === 'light' ? 'dark' : 'light')}
                                className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md ${contentTheme === 'dark'
                                    ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700 hover:text-yellow-300'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                            >
                                <i className={`fas ${contentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                                <span>{contentTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Rendering Logic: If has blocks, render blocks. Else render rich text. */}
                    {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
                        <div>
                            {lesson.contentBlocks.map((block, index) => (
                                <div
                                    key={block.id}
                                    ref={el => { blockRefs.current[block.id] = el; }}
                                    className={`relative p-4 rounded-2xl border transition-all duration-500 group cursor-pointer mb-${(block as any).spacing ?? 2} ${activeBlockId === block.id
                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/10 audio-block-active'
                                        : lastAccessedId === block.id
                                            ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700'
                                            : 'border-transparent'
                                        }`}
                                    onClick={() => playBlock(index)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <div
                                                className={`leading-relaxed transition-colors font-medium ${activeBlockId === block.id
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
                            ))}
                        </div>
                    ) : (
                        <div
                            className={`leading-relaxed lesson-content-view ${contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                            style={{ fontSize: '15px', lineHeight: '1.8' }}
                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                        />
                    )}
                </div>
            </div>

            <div className="lg:col-span-3 space-y-6 sticky top-8 h-fit self-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 flex">
                    <button
                        onClick={() => setSidebarTab('materials')}
                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'materials'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                            }`}
                    >
                        Materiais
                    </button>
                    <button
                        onClick={() => setSidebarTab('buddy')}
                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${sidebarTab === 'buddy'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                            }`}
                    >
                        Buddy AI
                    </button>
                </div>

                {sidebarTab === 'materials' ? (
                    <LessonMaterialsSidebar lesson={lesson} />
                ) : (
                    <GeminiBuddy currentContext={`${course.title} - ${lesson.title}`} />
                )}
            </div>
        </div>
    );
};

export default LessonViewer;
