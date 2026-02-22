import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../domain/entities';
import { IUserSession } from '../domain/auth';
import { AuthService } from '../services/AuthService';
import { SupabaseAuthRepository } from '../repositories/SupabaseAuthRepository';
import { CourseService } from '../services/CourseService';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository';
import { createSupabaseClient } from '../services/supabaseClient';
import { useBuddyStore } from '../stores/useBuddyStore';

interface AuthContextType {
    session: IUserSession | null;
    user: User | null;
    isLoading: boolean;
    login: () => void; // Trigger for login UI or logic if needed, usually handled by AuthForm
    logout: () => Promise<void>;
    authService: AuthService;
    refreshSession: () => Promise<void>;
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

    const refreshSession = async () => {
        try {
            // Se estivermos no callback do Dropbox, ignoramos a restauração de sessão do Supabase
            // para evitar conflito de leitura do token no hash da URL.
            if (window.location.pathname === '/oauth/dropbox') {
                console.log('Skipping Supabase session restore on Dropbox callback route');
                setIsLoading(false);
                return;
            }

            const activeSession = await authService.restoreSession();
            if (activeSession) {
                setSession(activeSession);
                const profile = await courseService.fetchUserProfile(activeSession.user.id);
                setUser(profile);
            }
            // Se activeSession é null mas temos sessão em memória, NÃO fazemos logout
            // (pode ser um erro transitório de rede — o usuário continua editando)
        } catch (err) {
            console.error('Failed to restore session', err);
            const message = (err as Error).message || '';
            const name = (err as Error).name || '';

            // Apenas logout forçado para erros PERMANENTES (ex: usuário deletado do banco)
            if (name === 'NotFoundError' || message.includes('User not found')) {
                console.warn('Usuário não encontrado no banco. Logout forçado.');
                await logout();
            } else {
                // Para erros transitórios (token expirado, rede instável),
                // apenas logamos o erro — NÃO fazemos logout para evitar perder edições
                console.warn('Erro transitório na sessão — mantendo sessão ativa:', message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshSession();
    }, []);

    const logout = async () => {
        if (session?.user?.id) {
            useBuddyStore.getState().clearUserSession(session.user.id);
        }
        await authService.logout();
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoading, login: () => { }, logout, authService, refreshSession }}>
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
