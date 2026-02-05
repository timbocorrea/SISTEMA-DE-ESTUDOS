import { useRef, useState, useEffect } from 'react';
import { useLessonStore } from '../stores/useLessonStore';
import { Lesson } from '../domain/entities';
import { activityMonitor } from '../services/ActivityMonitor';

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
        setAudioEnabled,
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
        // Auto-enable audio if manually clicking a block
        if (!audioEnabled) {
            setAudioEnabled(true);
        }

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
            // Check actual audio state instead of potentially stale React state
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                onTrackAction?.(`Pausou o áudio no bloco de texto`);
            } else {
                audioRef.current.play().catch(e => console.error(e));
                setIsPlaying(true);
                activityMonitor.setMediaPlaying(true);
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
            console.log(`🎵 Audio ended for block ${index}`);

            // Prevent immediate re-trigger by checking if audio actually played
            if (audio.currentTime < 0.5 && audio.duration > 1) {
                console.warn(`⚠️ Audio ended too quickly (${audio.currentTime}s), skipping auto-advance`);
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                setActiveBlockId(null);
                return;
            }

            setAudioProgress(0);
            // Auto-advance IMMEDIATELY without setting isPlaying to false
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl && audioEnabledRef.current) {
                // Immediate transition to next block
                console.log(`➡️ Auto-advancing to block ${nextIndex}`);
                playBlock(nextIndex);
            } else {
                console.log(`⏹️ Playback finished`);
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                setActiveBlockId(null);
            }
        };

        // Handle errors
        audio.onerror = (e) => {
            console.error("Audio playback error", e);
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
        };

        audio.play().then(() => {
            activityMonitor.setMediaPlaying(true);
        }).catch(err => {
            console.error("Audio playback failed", err);
            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
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
                activityMonitor.setMediaPlaying(false);
            } else {
                audioRef.current.play().catch(console.error);
                setIsPlaying(true);
                activityMonitor.setMediaPlaying(true);
            }
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
            activityMonitor.setMediaPlaying(false);
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
