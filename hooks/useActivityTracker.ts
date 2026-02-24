import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { auditService } from '../services/AuditService';
import { activityMonitor } from '../services/ActivityMonitor';

export const useActivityTracker = (resourceTitle?: string) => {
    const location = useLocation();
    const startTimeRef = useRef<number>(Date.now());
    const lastActivityRef = useRef<number>(Date.now());
    const activeTimeAccumulatorRef = useRef<number>(0);
    const idleTimeAccumulatorRef = useRef<number>(0);
    const pathRef = useRef<string>(location.pathname);
    const resourceTitleRef = useRef<string | undefined>(resourceTitle);

    // Sync resourceTitleRef with prop
    useEffect(() => {
        if (resourceTitle) {
            resourceTitleRef.current = resourceTitle;
        }
    }, [resourceTitle]);

    // Config
    const IDLE_THRESHOLD_MS = 10000; // 10 seconds of no input = idle
    const TRACKING_INTERVAL_MS = 1000; // Check every second

    // Logic extracted to ref for accessibility in event listeners
    const commitLogRef = useRef<() => void>(() => { });
    const passiveTimeAccumulatorRef = useRef<number>(0);

    // Sync with ActivityMonitor
    useEffect(() => {
        // When UI confirms presence, reset passive timer
        activityMonitor.onPresenceConfirmed(() => {
            passiveTimeAccumulatorRef.current = 0;
            lastActivityRef.current = Date.now(); // Also reset activity
        });
    }, []);

    useEffect(() => {
        // Function to commit the log for the PREVIOUS page
        const commitLog = () => {
            const endTime = Date.now();
            const totalDuration = (endTime - startTimeRef.current) / 1000;

            // Should minimal check to avoid empty logs (e.g. instant redirects)
            if (totalDuration < 1) return;

            const activeSeconds = activeTimeAccumulatorRef.current;
            // Idle is whatever remains (or explicitly tracked)
            // Using logic: Total = Active + Idle. 
            // Note: Our active accumulator is rough, let's refine.
            const idleSeconds = Math.max(0, totalDuration - activeSeconds);

            const score = totalDuration > 0
                ? Math.min(100, Math.round((activeSeconds / totalDuration) * 100))
                : 0;

            let pageName = pathRef.current;
            if (pageName === '/') pageName = 'Dashboard';
            else if (pageName.includes('/courses')) pageName = 'Cursos';
            else if (pageName.includes('/lesson')) pageName = 'Aula';

            auditService.logSession({
                path: pathRef.current,
                pageTitle: pageName,
                resourceTitle: resourceTitleRef.current,
                durationSeconds: totalDuration,
                activeSeconds: activeSeconds,
                idleSeconds: idleSeconds,
                activityScore: score,
                details: []
            });
        };

        commitLogRef.current = commitLog;

        // If path changed, commit previous and reset
        if (pathRef.current !== location.pathname) {
            commitLogRef.current();

            // Reset for new page
            startTimeRef.current = Date.now();
            lastActivityRef.current = Date.now();
            activeTimeAccumulatorRef.current = 0;
            idleTimeAccumulatorRef.current = 0;
            passiveTimeAccumulatorRef.current = 0;
            pathRef.current = location.pathname;
            resourceTitleRef.current = resourceTitle; // Reset to current prop for new path
        }
    }, [location.pathname, resourceTitle]);

    useEffect(() => {
        const handleUnload = () => {
            if (commitLogRef.current) {
                commitLogRef.current();
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);

    // Independent Tracking Loop & Event Listeners
    useEffect(() => {
        const handleUserActivity = () => {
            lastActivityRef.current = Date.now();
            passiveTimeAccumulatorRef.current = 0; // Reset passive timer on interaction
        };

        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);
        window.addEventListener('click', handleUserActivity);

        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const stepSeconds = TRACKING_INTERVAL_MS / 1000;

            const isMediaPlaying = activityMonitor.isMediaPlaying;

            if (timeSinceLastActivity < IDLE_THRESHOLD_MS) {
                // User is actively interacting
                activeTimeAccumulatorRef.current += stepSeconds;
            } else if (isMediaPlaying) {
                // User is idle but media is playing (Passive Consumption)
                activeTimeAccumulatorRef.current += stepSeconds;
                passiveTimeAccumulatorRef.current += stepSeconds;

                if (passiveTimeAccumulatorRef.current >= 300) {
                    activityMonitor.triggerPresenceCheck();
                }
            } else {
                // Really Idle
                idleTimeAccumulatorRef.current += stepSeconds;
            }
        }, TRACKING_INTERVAL_MS);

        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            clearInterval(intervalId);
        };
    }, []); // Run once on mount
};
