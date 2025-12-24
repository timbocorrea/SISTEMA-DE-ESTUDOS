
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

    const playBlock = (index: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];
        if (!block.audioUrl) {
            setActiveBlockId(null);
            return;
        }

        // Cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        setActiveBlockId(block.id);

        // Save progress (Resume point)
        onProgressUpdate(lesson.watchedSeconds, block.id);

        const audio = new Audio(block.audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
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

                    {/* Rendering Logic: If has blocks, render blocks. Else render rich text. */}
                    {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
                        <div className="space-y-4">
                            {lesson.contentBlocks.map((block, index) => (
                                <div
                                    key={block.id}
                                    ref={el => { blockRefs.current[block.id] = el; }}
                                    className={`relative p-6 rounded-2xl border transition-all duration-500 group cursor-pointer ${activeBlockId === block.id
                                        ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                        : lastAccessedId === block.id
                                            ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700'
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/40'
                                        }`}
                                    onClick={() => playBlock(index)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${activeBlockId === block.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600'
                                            }`}>
                                            <i className={`fas ${activeBlockId === block.id ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`leading-relaxed transition-colors ${activeBlockId === block.id
                                                ? 'text-indigo-900 dark:text-indigo-100 font-medium'
                                                : contentTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                                                }`}>
                                                {block.text}
                                            </p>
                                        </div>
                                        {block.audioUrl && (
                                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-2 opacity-50">
                                                Áudio disponível
                                            </div>
                                        )}
                                    </div>

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
