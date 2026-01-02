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
            setIsPlaying(false);
        }
    }, [audioEnabled, setActiveBlockId, setIsPlaying]);

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

        // Cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null; // Ensure cleanup
        }

        setActiveBlockId(block.id);
        setAudioProgress(0);
        setIsPlaying(true);

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
            setIsPlaying(false);
            // Auto-advance
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl && audioEnabled) {
                playBlock(nextIndex);
            } else {
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
