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
        audioEnabled
    } = useLessonStore();

    const [audioProgress, setAudioProgress] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playbackSpeedRef = useRef<number>(playbackSpeed);

    // Sync ref with store for callbacks
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed;
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Handle audioEnabled toggle
    useEffect(() => {
        if (!audioEnabled && audioRef.current) {
            audioRef.current.pause();
            setActiveBlockId(null);
            setAudioProgress(0);
        }
    }, [audioEnabled, setActiveBlockId]);

    const playBlock = (index: number) => {
        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];
        if (!block.audioUrl) {
            setActiveBlockId(null);
            return;
        }

        // Toggle pause if clicking the active block
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

        // Notify progress update (Resume point)
        if (onProgressUpdate) {
            onProgressUpdate(lesson.watchedSeconds, block.id);
        }

        const audio = new Audio(block.audioUrl);
        audioRef.current = audio;

        // Apply playback speed
        audio.playbackRate = playbackSpeedRef.current;

        // Update progress
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                setAudioProgress(progress);
            }
        };

        // Handle end of track
        audio.onended = () => {
            setAudioProgress(0);
            // Auto-advance
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl && audioEnabled) {
                playBlock(nextIndex);
            } else {
                setActiveBlockId(null);
            }
        };

        audio.play().catch(err => console.error("Audio playback failed", err));

        // Track action
        const blockPreview = block.text.replace(/<[^>]*>/g, '').substring(0, 50);
        onTrackAction?.(`Ativou áudio no bloco: "${blockPreview}..."`);
    };

    const seekTo = (percentage: number) => {
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
        };
    }, []);

    return {
        audioProgress,
        audioRef, // Exposed for direct access if needed (e.g., duration)
        playBlock,
        seekTo
    };
};
