import { create } from 'zustand';

interface LessonStore {
    // Video/Audio State
    currentTime: number;
    isPlaying: boolean;
    currentAudioIndex: number | null;

    // Content State
    activeBlockId: string | null;
    fontSize: number;
    contentTheme: 'light' | 'dark';

    // UI State
    isCinemaMode: boolean;

    // Actions
    setCurrentTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentAudioIndex: (index: number | null) => void;
    setActiveBlockId: (id: string | null) => void;
    setFontSize: (size: number) => void;
    setContentTheme: (theme: 'light' | 'dark') => void;
    toggleCinemaMode: () => void;
    resetLessonState: () => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
    // Initial State
    currentTime: 0,
    isPlaying: false,
    currentAudioIndex: null,
    activeBlockId: null,
    fontSize: 16,
    contentTheme: 'light',
    isCinemaMode: false,

    // Actions
    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setCurrentAudioIndex: (index) => set({ currentAudioIndex: index }),
    setActiveBlockId: (id) => set({ activeBlockId: id }),
    setFontSize: (size) => set({ fontSize: Math.max(12, Math.min(24, size)) }), // Clamp between 12-24
    setContentTheme: (theme) => set({ contentTheme: theme }),
    toggleCinemaMode: () => set((state) => ({ isCinemaMode: !state.isCinemaMode })),
    resetLessonState: () => set({
        currentTime: 0,
        isPlaying: false,
        currentAudioIndex: null,
        activeBlockId: null,
        fontSize: 16,
        isCinemaMode: false,
    }),
}));
