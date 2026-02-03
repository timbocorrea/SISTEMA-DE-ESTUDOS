import { useRef, useState, useEffect } from 'react';
import { useLessonStore } from '../stores/useLessonStore';
import { Lesson } from '../domain/entities';

interface UseAudioPlayerProps {
    lesson: Lesson;
    onTrackAction?: (action: string) => void;
    onProgressUpdate?: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
}

export const useAudioPlayer = ({ lesson, onTrackAction, onProgressUpdate }: UseAudioPlayerProps) => {
    const {
        activeBlockId,
        setActiveBlockId,
        playbackSpeed,
        audioEnabled,
        isPlaying,
        setIsPlaying
    } = useLessonStore();

    const [audioProgress, setAudioProgress] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const nextAudioRef = useRef<HTMLAudioElement | null>(null); // Prefetch next audio
    const playbackSpeedRef = useRef<number>(playbackSpeed);

    const audioEnabledRef = useRef(audioEnabled);

    // Sync ref with store for callbacks
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed;
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Sync audioEnabled ref
    useEffect(() => {
        audioEnabledRef.current = audioEnabled;
    }, [audioEnabled]);

    // Handle audioEnabled toggle
    useEffect(() => {
        if (!audioEnabled && audioRef.current) {
            audioRef.current.pause();
            setActiveBlockId(null);
            setAudioProgress(0);
            setIsPlaying(false);
            // Cleanup prefetched audio
            if (nextAudioRef.current) {
                nextAudioRef.current = null;
            }
        }
    }, [audioEnabled, setActiveBlockId, setIsPlaying]);

    // Prefetch next audio to reduce transition delay
    const prefetchNextAudio = (currentIndex: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || !audioEnabledRef.current) return;

        const nextIndex = currentIndex + 1;
        if (nextIndex < blocks.length && blocks[nextIndex].audioUrl) {
            // Cleanup old prefetch
            if (nextAudioRef.current) {
                nextAudioRef.current = null;
            }

            // Prefetch next audio
            const nextAudio = new Audio(blocks[nextIndex].audioUrl);
            nextAudio.preload = 'auto';
            nextAudio.playbackRate = playbackSpeedRef.current;
            nextAudioRef.current = nextAudio;

            console.log(`🔊 Prefetching next audio [${nextIndex}]`);
        }
    };

    const playBlock = (index: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];
        if (!block.audioUrl) {
            setActiveBlockId(null);
            setIsPlaying(false);
            return;
        }

        // Toggle pause if clicking the active block
        if (activeBlockId === block.id && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
                onTrackAction?.(`Pausou o áudio no bloco de texto`);
            } else {
                audioRef.current.play().catch(e => console.error(e));
                setIsPlaying(true);
                onTrackAction?.(`Retomou o áudio no bloco de texto`);
            }
            return;
        }

        // Cleanup previous audio quickly
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null; // Remove old handlers
            audioRef.current.ontimeupdate = null;
            audioRef.current.onerror = null;
        }

        setActiveBlockId(block.id);
        setAudioProgress(0);
        setIsPlaying(true);

        // Notify progress update (Resume point)
        if (onProgressUpdate) {
            onProgressUpdate(lesson.watchedSeconds, block.id);
        }

        let audio: HTMLAudioElement;

        // OPTIMIZATION: Reuse prefetched audio if available
        if (nextAudioRef.current && nextAudioRef.current.src === block.audioUrl) {
            console.log(`✅ Using prefetched audio [${index}]`);
            audio = nextAudioRef.current;
            nextAudioRef.current = null; // Clear prefetch
        } else {
            audio = new Audio(block.audioUrl);
            audio.preload = 'auto';
        }

        audioRef.current = audio;

        // Apply playback speed
        audio.playbackRate = playbackSpeedRef.current;

        // Update progress and trigger prefetch
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                setAudioProgress(progress);

                // Prefetch next audio when current reaches 30%
                if (progress >= 30 && !nextAudioRef.current) {
                    prefetchNextAudio(index);
                }
            }
        };

        // Handle end of track - OPTIMIZED for fast transition
        audio.onended = () => {
            setAudioProgress(0);
            // Auto-advance IMMEDIATELY without setting isPlaying to false
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl && audioEnabledRef.current) {
                // Immediate transition to next block
                playBlock(nextIndex);
            } else {
                setIsPlaying(false);
                setActiveBlockId(null);
            }
        };

        // Handle errors
        audio.onerror = (e) => {
            console.error("Audio playback error", e);
            setIsPlaying(false);
        };

        audio.play().catch(err => {
            console.error("Audio playback failed", err);
            setIsPlaying(false);
        });

        // Track action
        const blockPreview = block.text.replace(/<[^>]*>/g, '').substring(0, 50);
        onTrackAction?.(`Ativou áudio no bloco: "${blockPreview}..."`);
    };

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().catch(console.error);
                setIsPlaying(true);
            }
        } else if (activeBlockId) {
            // If activeBlockId is set but no audioRef (edge case?), try to play it?
            // Usually audioRef exists if activeBlockId is set by this hook.
            // If not, we might need to find the index and playBlock.
            // For now, simple toggle of existing audio.
        }
    };

    const seek = (percentage: number) => {
        if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            const newTime = (audioRef.current.duration * percentage) / 100;
            audioRef.current.currentTime = newTime;
            setAudioProgress(percentage);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (nextAudioRef.current) {
                nextAudioRef.current = null;
            }
            setIsPlaying(false);
        };
    }, [setIsPlaying]);

    return {
        isPlaying,
        progress: audioProgress,
        playBlock,
        toggleAudio,
        seek,
        audioRef // Keep exposing ref just in case
    };
};
