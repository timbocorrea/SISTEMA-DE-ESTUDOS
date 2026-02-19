import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutProps {
    onIdle: () => void;
    timeout?: number; // milliseconds, default 10 minutes
}

/**
 * Checks if any <audio> or <video> element on the page is currently playing.
 */
const isMediaPlaying = (): boolean => {
    const audioElements = document.querySelectorAll('audio');
    const videoElements = document.querySelectorAll('video');

    for (const el of audioElements) {
        if (!el.paused && !el.ended && el.currentTime > 0) return true;
    }
    for (const el of videoElements) {
        if (!el.paused && !el.ended && el.currentTime > 0) return true;
    }
    return false;
};

/**
 * Hook to detect user inactivity and trigger a callback.
 * Used to disconnect idle sessions and save resources (Supabase Egress).
 *
 * Considers audio/video playback as active usage — will NOT
 * trigger idle timeout while media is playing.
 */
export const useIdleTimeout = ({ onIdle, timeout = 10 * 60 * 1000 }: UseIdleTimeoutProps) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaCheckRef = useRef<NodeJS.Timeout | null>(null);
    const onIdleRef = useRef(onIdle);

    // Keep callback ref updated to avoid re-binding listeners
    useEffect(() => {
        onIdleRef.current = onIdle;
    }, [onIdle]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            // Before triggering idle: double-check if media is playing
            if (isMediaPlaying()) {
                console.log('🎵 Media is playing — skipping idle timeout, resetting timer.');
                resetTimer();
                return;
            }
            console.log('💤 User is idle. Triggering timeout callback.');
            onIdleRef.current();
        }, timeout);
    }, [timeout]);

    useEffect(() => {
        // Initial timer start
        resetTimer();

        // Events to listen for
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Periodic check: if media is playing, reset the timer proactively
        // This covers the case where a user starts audio and does nothing else
        mediaCheckRef.current = setInterval(() => {
            if (isMediaPlaying()) {
                resetTimer();
            }
        }, 30_000); // check every 30 seconds

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (mediaCheckRef.current) {
                clearInterval(mediaCheckRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);
};
