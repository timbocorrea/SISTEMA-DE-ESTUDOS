import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    action?: {
        label: string;
        courseId: string;
        lessonId: string;
    };
    image?: string | null;
}

export interface ChatThread {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
}

interface BuddyState {
    threadsByUser: Record<string, ChatThread[]>;
    activeThreadIdByUser: Record<string, string | null>;
    welcomeShownByUser: Record<string, boolean>;
    isLoading: boolean;
    isOpen: boolean;

    // Actions
    addMessage: (userId: string, message: ChatMessage, forcedTitle?: string) => void;
    setLoading: (loading: boolean) => void;
    setIsOpen: (isOpen: boolean) => void;
    clearHistory: (userId: string) => void;
    clearUserSession: (userId: string) => void;
    setWelcomeShown: (userId: string, shown: boolean) => void;

    // Thread Actions
    createNewThread: (userId: string, title?: string) => string;
    switchThread: (userId: string, threadId: string) => void;
    deleteThread: (userId: string, threadId: string) => void;
    updateThreadTitle: (userId: string, threadId: string, title: string) => void;
}

export const useBuddyStore = create<BuddyState>()(
    persist(
        (set, get) => ({
            threadsByUser: {},
            activeThreadIdByUser: {},
            welcomeShownByUser: {},
            isLoading: false,
            isOpen: false,

            addMessage: (userId, message, forcedTitle) => set((state) => {
                const threads = state.threadsByUser[userId] || [];
                let activeId = state.activeThreadIdByUser[userId];

                // If no active thread, create one
                if (!activeId) {
                    activeId = crypto.randomUUID();
                    const titleFromMessage = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
                    const newThread: ChatThread = {
                        id: activeId,
                        title: forcedTitle || titleFromMessage,
                        messages: [message],
                        createdAt: Date.now()
                    };
                    return {
                        activeThreadIdByUser: { ...state.activeThreadIdByUser, [userId]: activeId },
                        threadsByUser: { ...state.threadsByUser, [userId]: [newThread] }
                    };
                }

                const updatedThreads = threads.map(t => {
                    if (t.id === activeId) {
                        // Update title if it's the first user message OR if a forcedTitle is provided
                        let newTitle = t.title;
                        if (forcedTitle) {
                            newTitle = forcedTitle;
                        } else if (t.messages.length === 0 && message.role === 'user') {
                            newTitle = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
                        }
                        return { ...t, messages: [...t.messages, message], title: newTitle };
                    }
                    return t;
                });

                return {
                    threadsByUser: {
                        ...state.threadsByUser,
                        [userId]: updatedThreads
                    }
                };
            }),

            setLoading: (loading) => set({ isLoading: loading }),
            setIsOpen: (isOpen) => set({ isOpen }),

            clearHistory: (userId) => set((state) => {
                const activeId = state.activeThreadIdByUser[userId];
                if (!activeId) return state;

                const updatedThreads = (state.threadsByUser[userId] || []).map(t =>
                    t.id === activeId ? { ...t, messages: [] } : t
                );

                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: updatedThreads }
                };
            }),

            setWelcomeShown: (userId, shown) => set((state) => ({
                welcomeShownByUser: {
                    ...state.welcomeShownByUser,
                    [userId]: shown
                }
            })),

            createNewThread: (userId, title = 'Nova Conversa') => {
                const newId = crypto.randomUUID();
                const newThread: ChatThread = {
                    id: newId,
                    title,
                    messages: [],
                    createdAt: Date.now()
                };

                set((state) => ({
                    threadsByUser: {
                        ...state.threadsByUser,
                        [userId]: [newThread, ...(state.threadsByUser[userId] || [])]
                    },
                    activeThreadIdByUser: {
                        ...state.activeThreadIdByUser,
                        [userId]: newId
                    }
                }));
                return newId;
            },

            switchThread: (userId, threadId) => set((state) => ({
                activeThreadIdByUser: {
                    ...state.activeThreadIdByUser,
                    [userId]: threadId
                }
            })),

            deleteThread: (userId, threadId) => set((state) => {
                const threads = (state.threadsByUser[userId] || []).filter(t => t.id !== threadId);
                let activeId = state.activeThreadIdByUser[userId];

                if (activeId === threadId) {
                    activeId = threads.length > 0 ? threads[0].id : null;
                }

                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: threads },
                    activeThreadIdByUser: { ...state.activeThreadIdByUser, [userId]: activeId }
                };
            }),

            updateThreadTitle: (userId, threadId, title) => set((state) => {
                const updatedThreads = (state.threadsByUser[userId] || []).map(t =>
                    t.id === threadId ? { ...t, title } : t
                );
                return {
                    threadsByUser: { ...state.threadsByUser, [userId]: updatedThreads }
                };
            }),

            clearUserSession: (userId) => set((state) => ({
                threadsByUser: {
                    ...state.threadsByUser,
                    [userId]: []
                },
                activeThreadIdByUser: {
                    ...state.activeThreadIdByUser,
                    [userId]: null
                }
            }))
        }),
        {
            name: 'buddy-store-v3', // Incremented version for major structural change
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                threadsByUser: state.threadsByUser,
                welcomeShownByUser: state.welcomeShownByUser,
                activeThreadIdByUser: state.activeThreadIdByUser
            }),
        }
    )
);
