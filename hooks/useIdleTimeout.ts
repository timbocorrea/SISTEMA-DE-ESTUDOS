import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutProps {
    onIdle: () => void;
    timeout?: number; // milliseconds, default 10 minutes
}

/**
 * Hook to detect user inactivity and trigger a callback.
 * Used to disconnect idle sessions and save resources (Supabase Egress).
 */
export const useIdleTimeout = ({ onIdle, timeout = 10 * 60 * 1000 }: UseIdleTimeoutProps) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
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
            // Simple throttle: verify if we really need to reset. 
            // Since resetTimer is cheap (clear/set timeout), we can just call it.
            // For high-frequency events like mousemove/scroll, could throttle if needed,
            // but standard JS engines handle clear/set timeout efficiently enough for this purpose.
            resetTimer();
        };

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);
};
