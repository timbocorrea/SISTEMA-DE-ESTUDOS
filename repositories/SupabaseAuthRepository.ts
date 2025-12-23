import { IAuthRepository } from './IAuthRepository';
import { AuthResponse, IUserSession } from '../domain/auth';
import { DomainError } from '../domain/errors';
import { createSupabaseClient } from '../services/supabaseClient';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'STUDENT' | 'INSTRUCTOR' | null;
  xp_total: number | null;
  current_level: number | null;
  achievements: unknown[] | null;
};

export class SupabaseAuthRepository implements IAuthRepository {
  private client = createSupabaseClient();

  private buildSession(
    userId: string,
    email: string,
    name: string,
    role: 'STUDENT' | 'INSTRUCTOR',
    token: string,
    xp?: number | null,
    level?: number | null
  ): IUserSession {
    return {
      user: {
        id: userId,
        name,
        email,
        role,
        xp: xp ?? undefined,
        level: level ?? undefined
      },
      token
    };
  }

  private async upsertProfile(userId: string, email: string, name?: string): Promise<ProfileRow> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          name: name || email,
          role: 'STUDENT',
          xp_total: 0,
          current_level: 1,
          achievements: [],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select('id, name, email, role, xp_total, current_level, achievements')
      .single();

    if (error || !data) {
      throw new DomainError(`Erro ao sincronizar perfil: ${error?.message || 'perfil não encontrado'}`);
    }

    return data as ProfileRow;
  }

  private async fetchProfile(userId: string, email: string, name?: string): Promise<ProfileRow> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, xp_total, current_level, achievements')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new DomainError(`Erro ao buscar perfil: ${error.message}`);
    }

    if (!data) {
      return this.upsertProfile(userId, email, name);
    }

    return data as ProfileRow;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data?.session || !data.user) {
      return { success: false, message: error?.message || 'Credenciais inválidas.' };
    }

    const profile = await this.fetchProfile(data.user.id, data.user.email || email, data.user.user_metadata?.name);

    return {
      success: true,
      data: this.buildSession(
        data.user.id,
        profile.email || email,
        profile.name || data.user.email || email,
        profile.role || 'STUDENT',
        data.session.access_token,
        profile.xp_total,
        profile.current_level
      )
    };
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

    let { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo }
    });

    if (error && emailRedirectTo) {
      const message = error.message.toLowerCase();
      if (message.includes('redirect') || message.includes('not allowed')) {
        ({ data, error } = await this.client.auth.signUp({
          email,
          password,
          options: { data: { name } }
        }));
      }
    }

    if (error || !data?.user) {
      return { success: false, message: error?.message || 'Não foi possível criar sua conta.' };
    }

    if (!data.session) {
      return {
        success: false,
        message: 'Cadastro realizado. Confirme seu email para ativar a conta e depois faça login.'
      };
    }

    const profile = await this.upsertProfile(data.user.id, email, name);

    return {
      success: true,
      data: this.buildSession(
        data.user.id,
        profile.email || email,
        profile.name || name || email,
        profile.role || 'STUDENT',
        data.session.access_token,
        profile.xp_total,
        profile.current_level
      )
    };
  }

  async getCurrentSession(): Promise<IUserSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data?.session || !data.session.user) return null;

    const supabaseUser = data.session.user;
    const profile = await this.fetchProfile(
      supabaseUser.id,
      supabaseUser.email || '',
      supabaseUser.user_metadata?.name
    );

    return this.buildSession(
      supabaseUser.id,
      profile.email || supabaseUser.email || '',
      profile.name || supabaseUser.email || '',
      profile.role || 'STUDENT',
      data.session.access_token,
      profile.xp_total,
      profile.current_level
    );
  }

  async logout(): Promise<void> {
    await this.client.auth.signOut();
  }
}
