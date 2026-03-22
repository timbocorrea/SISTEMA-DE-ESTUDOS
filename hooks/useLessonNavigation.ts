import { useState, useEffect } from 'react';

interface UseLessonNavigationReturn {
    // State
    activeMobileTab: 'materials' | 'notes' | 'quiz' | 'forum' | null;
    focusedNoteId: string | null;

    // Actions
    handleOpenDrawer: (tab: 'materials' | 'notes' | 'quiz' | 'forum') => void;
    handleCloseDrawer: () => void;
    setFocusedNoteId: (id: string | null) => void;
}

export const useLessonNavigation = (): UseLessonNavigationReturn => {
    // State
    const [activeMobileTab, setActiveMobileTab] = useState<'materials' | 'notes' | 'quiz' | 'forum' | null>(null);
    const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);

    // History & Drawer Management
    useEffect(() => {
        const handlePopState = () => {
            if (activeMobileTab) {
                setActiveMobileTab(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeMobileTab]);

    const handleOpenDrawer = (tab: 'materials' | 'notes' | 'quiz' | 'forum') => {
        if (activeMobileTab === tab) {
            handleCloseDrawer();
        } else {
            if (!activeMobileTab) {
                window.history.pushState({ drawer: true }, '', window.location.href);
            }
            setActiveMobileTab(tab);
        }
    };

    const handleCloseDrawer = () => {
        if (activeMobileTab) {
            window.history.back();
        }
    };

    return {
        // State
        activeMobileTab,
        focusedNoteId,

        // Actions
        handleOpenDrawer,
        handleCloseDrawer,
        setFocusedNoteId
    };
};
