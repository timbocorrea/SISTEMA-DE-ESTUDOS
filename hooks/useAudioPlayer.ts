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
            nextAudio.load(); // Force browser to start buffering immediately
            nextAudioRef.current = nextAudio;
        }
    };

    const playBlock = useCallback((index: number, forcePlay = false) => {
        // Auto-enable audio if manually clicking a block
        if (!audioEnabledRef.current) {
            setAudioEnabled(true);
        }

        const blocks = lesson.contentBlocks;
        if (!blocks || index < 0 || index >= blocks.length) return;

        const block = blocks[index];

        // Validate audio URL
        if (!block.audioUrl) {
            console.warn(`⚠️ Block ${index} (${block.id}) has no audioUrl`);
            setActiveBlockId(null);
            setIsPlaying(false);
            return;
        }

        // Check if audioUrl is valid
        if (typeof block.audioUrl !== 'string' || block.audioUrl.trim() === '') {
            console.error(`❌ Block ${index} (${block.id}) has invalid audioUrl:`, block.audioUrl);
            setActiveBlockId(null);
            setIsPlaying(false);
            return;
        }

        console.log(`🎵 Attempting to play audio for block ${index}:`, {
            blockId: block.id,
            audioUrl: block.audioUrl,
            urlLength: block.audioUrl.length,
            urlPreview: block.audioUrl.substring(0, 100)
        });

        // Convert Dropbox temporary URLs to direct download links
        const convertDropboxUrl = (url: string): string => {
            // Check if it's a Dropbox URL
            if (url.includes('dropboxusercontent.com') || url.includes('dropbox.com')) {
                console.log('🔄 Converting Dropbox URL to direct download link...');

                // If it's already a dl.dropboxusercontent.com link, it might be temporary
                // Try to convert to a more stable format
                if (url.includes('dl.dropboxusercontent.com')) {
                    // These URLs are temporary and expire quickly
                    console.warn('⚠️ Detected temporary Dropbox URL. This may expire soon.');
                    // Return as-is for now, but log the warning
                    return url;
                }

                // If it's a regular dropbox.com/s/ link, convert to direct download
                if (url.includes('dropbox.com/s/')) {
                    const directUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('?dl=0', '')
                        .replace('?dl=1', '');
                    console.log('✅ Converted to direct download URL:', directUrl);
                    return directUrl;
                }
            }
            return url;
        };

        const audioUrl = convertDropboxUrl(block.audioUrl);
        console.log('🎵 Final audio URL:', audioUrl);

        // Toggle pause if clicking the active block
        if (!forcePlay && activeBlockId === block.id && audioRef.current) {
            // Check actual audio state instead of potentially stale React state
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
                activityMonitor.setMediaPlaying(false);
                onTrackAction?.(`Pausou o áudio no bloco de texto`);
            } else {
                audioRef.current.play().then(() => {
                    onPlay?.();
                }).catch(e => console.error(e));
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

        // Reset block start time for this new block
        blockStartTimeRef.current = 0;

        let audio: HTMLAudioElement;

        // OPTIMIZATION: Reuse prefetched audio if available
        if (nextAudioRef.current && nextAudioRef.current.src === audioUrl) {
            console.log(`✅ Using prefetched audio [${index}]`);
            audio = nextAudioRef.current;
            nextAudioRef.current = null; // Clear prefetch
        } else {
            audio = new Audio(audioUrl);  // Use converted URL
            audio.preload = 'auto';
            audio.load(); // Force browser to start buffering
        }

        audioRef.current = audio;

        // Apply playback speed
        audio.playbackRate = playbackSpeedRef.current;

        // Update progress and trigger prefetch + cumulative tracking
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                setAudioProgress(progress);

                // 📈 Track cumulative listening time
                const listenedInBlock = audio.currentTime - blockStartTimeRef.current;
                if (listenedInBlock > 0) {
                    const previousBlocks = Array.from(completedBlocksRef.current).reduce((sum, bIdx) => {
                        return sum; // Already counted in totalListenedRef
                    }, 0);

                    const currentTotal = totalListenedRef.current + listenedInBlock;

                    // Report progress every 5 seconds to avoid spam
                    if (onProgressUpdate && currentTotal - lastReportedRef.current >= 5) {
                        lastReportedRef.current = currentTotal;
                        onProgressUpdate(Math.round(currentTotal), block.id);
                    }
                }

                // Prefetch next audio when current reaches 30% (Fallback if immediate prefetch failed)
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

            // 📈 Accumulate completed block duration
            if (!completedBlocksRef.current.has(index)) {
                completedBlocksRef.current.add(index);
                totalListenedRef.current += audio.duration;
                blockStartTimeRef.current = 0;

                // Report progress for completed block
                if (onProgressUpdate) {
                    onProgressUpdate(Math.round(totalListenedRef.current), block.id);
                }

                // Mark audio block as listened for dynamic progress
                if (onAudioListened) {
                    onAudioListened(block.id);
                }
            }

            setAudioProgress(0);
            // Auto-advance IMMEDIATELY without setting isPlaying to false
            const nextIndex = index + 1;
            if (nextIndex < blocks.length && blocks[nextIndex].audioUrl && audioEnabledRef.current) {
                // Immediate transition to next block
                console.log(`➡️ Auto-advancing to block ${nextIndex}`);
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
