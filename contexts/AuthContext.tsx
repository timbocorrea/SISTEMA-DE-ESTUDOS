import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../domain/entities';
import { IUserSession } from '../domain/auth';
import { AuthService } from '../services/AuthService';
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository';
import { CourseService } from '../services/CourseService';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { createSupabaseClient } from '../services/supabaseClient';

interface AuthContextType {
    session: IUserSession | null;
    user: User | null;
    isLoading: boolean;
    login: () => void; // Trigger for login UI or logic if needed, usually handled by AuthForm
    logout: () => Promise<void>;
    authService: AuthService;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<IUserSession | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Services
    // NOTE: In a real app, these commonly come from a DI container or are instantiated outside
    const authService = new AuthService(new SupabaseAuthRepository());
    const courseService = new CourseService(new SupabaseCourseRepository(createSupabaseClient()));

    useEffect(() => {
        const loadSession = async () => {
            try {
                const activeSession = await authService.restoreSession();
                if (activeSession) {
                    setSession(activeSession);
                    const profile = await courseService.fetchUserProfile(activeSession.user.id);
                    setUser(profile);
                }
            } catch (err) {
                console.error('Failed to restore session', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, []);

    const logout = async () => {
        await authService.logout();
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoading, login: () => { }, logout, authService }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
