import { useRef, useState, useEffect, useCallback } from 'react';
import { useLessonStore } from '../stores/useLessonStore';
import { Lesson } from '../domain/entities';
import { activityMonitor } from '../services/ActivityMonitor';

interface UseAudioPlayerProps {
    lesson: Lesson;
    onTrackAction?: (action: string) => void;
    onProgressUpdate?: (watchedSeconds: number, lastBlockId?: string) => Promise<void>;
    onAudioListened?: (blockId: string) => void;
    onPlay?: () => void;
}

export const useAudioPlayer = ({ lesson, onTrackAction, onProgressUpdate, onAudioListened, onPlay }: UseAudioPlayerProps) => {
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

    // 📈 Cumulative audio listening time tracking
    const totalListenedRef = useRef<number>(lesson.watchedSeconds || 0);
    const blockStartTimeRef = useRef<number>(0); // currentTime when block started
    const lastReportedRef = useRef<number>(0); // Last reported progress (throttle)
    const completedBlocksRef = useRef<Set<number>>(new Set());

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

    // Helper to find the next block with audio
    const findNextAudioBlockIndex = (startIndex: number): number => {
        if (!blocks) return -1;
        for (let i = startIndex + 1; i < blocks.length; i++) {
            if (blocks[i].audioUrl && typeof blocks[i].audioUrl === 'string' && blocks[i].audioUrl.trim() !== '') {
                return i;
            }
        }
        return -1;
    };

    // Prefetch next audio to reduce transition delay
    const prefetchNextAudio = (currentIndex: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || !audioEnabledRef.current) return;

        const nextIndex = findNextAudioBlockIndex(currentIndex);

        if (nextIndex !== -1) {
            // Cleanup old prefetch
            if (nextAudioRef.current) {
                nextAudioRef.current = null;
            }

            // Prefetch next audio
            const nextAudio = new Audio(convertDropboxUrl(blocks[nextIndex].audioUrl!));
            nextAudio.preload = 'auto';
            nextAudio.playbackRate = playbackSpeedRef.current;
            nextAudio.load(); // Force browser to start buffering immediately
            nextAudioRef.current = nextAudio;
        }
    };

    const playBlock = useCallback((index: number, forcePlay = false) => {
        // ... (existing helper function inside playBlock remains same until nextAudioRef check)

        // ... (inside audio.onended)
        setAudioProgress(0);

        // Auto-advance logic with skip capability
        const nextIndex = findNextAudioBlockIndex(index);

        if (nextIndex !== -1 && audioEnabledRef.current) {
            // Immediate transition to next block with audio
            console.log(`➡️ Auto-advancing to block ${nextIndex} (skipping ${nextIndex - index - 1} empty blocks)`);
            playBlock(nextIndex, true);
        } else {
            console.log(`⏹️ Playback finished - All audio complete!`);

            // 📈 Final progress report: mark lesson duration reached
            if (onProgressUpdate) {
                const finalSeconds = Math.max(totalListenedRef.current, lesson.durationSeconds);
                onProgressUpdate(Math.round(finalSeconds), block.id);
            }

            setIsPlaying(false);
            activityMonitor.setMediaPlaying(false);
            setActiveBlockId(null);
        }
    };

    // Handle errors
    audio.onerror = (e) => {
        console.error("❌ Audio playback error for block", index, {
            blockId: block.id,
            audioUrl: block.audioUrl,
            error: e,
            audioReadyState: audio.readyState,
            audioNetworkState: audio.networkState,
            audioError: audio.error
        });
        setIsPlaying(false);
        activityMonitor.setMediaPlaying(false);
    };

    audio.play().then(() => {
        console.log(`✅ Audio playing successfully for block ${index}`);
        activityMonitor.setMediaPlaying(true);

        // GAPLESS OPTIMIZATION: Prefetch next audio IMMEDIATELY after start
        // This gives the maximum amount of time for the next track to buffer
        if (!nextAudioRef.current) {
            prefetchNextAudio(index);
        }
    }).catch(err => {
        console.error("❌ Audio playback failed for block", index, {
            blockId: block.id,
            audioUrl: block.audioUrl,
            error: err,
            errorMessage: err.message,
            errorName: err.name
        });
        setIsPlaying(false);
        activityMonitor.setMediaPlaying(false);
    });

    // Track action
    const blockPreview = block.text.replace(/<[^>]*>/g, '').substring(0, 50);
    onTrackAction?.(`Ativou áudio no bloco: "${blockPreview}..."`);
}, [lesson, activeBlockId, onTrackAction, onProgressUpdate, setAudioEnabled, setActiveBlockId, setIsPlaying, onPlay]);

const pauseAudio = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
        activityMonitor.setMediaPlaying(false);
    }
}, [setIsPlaying]);

const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
        activityMonitor.setMediaPlaying(true);
        onPlay?.();
    } else {
        audioRef.current.pause();
        setIsPlaying(false);
        activityMonitor.setMediaPlaying(false);
    }
}, [setIsPlaying, onPlay]);

const seek = useCallback((percentage: number) => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
        const newTime = (audioRef.current.duration * percentage) / 100;
        audioRef.current.currentTime = newTime;
        setAudioProgress(percentage);
    }
}, []);

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
    pauseAudio,
    seek
};
};
