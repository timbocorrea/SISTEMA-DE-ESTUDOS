import { IAuthRepository } from './IAuthRepository';
import { AuthResponse, IUserSession } from '../domain/auth';
import { DomainError } from '../domain/errors';
import { createSupabaseClient } from '../services/supabaseClient';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'STUDENT' | 'INSTRUCTOR' | null;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  xp_total: number | null;
  current_level: number | null;
  achievements: unknown[] | null;
  last_access_at: string | null;
};

export class SupabaseAuthRepository implements IAuthRepository {
  public client = createSupabaseClient();

  private buildSession(
    userId: string,
    email: string,
    name: string,
    role: 'STUDENT' | 'INSTRUCTOR',
    token: string,
    sessionId: string,
    xp?: number | null,
    level?: number | null,
    lastAccessAt?: string | null,
    approvalStatus?: 'pending' | 'approved' | 'rejected' | null
  ): IUserSession {
    return {
      user: {
        id: userId,
        name,
        email,
        role,
        approvalStatus: approvalStatus ?? undefined,
        xp: xp ?? undefined,
        level: level ?? undefined,
        lastAccess: lastAccessAt ? new Date(lastAccessAt) : null
      },
      token,
      sessionId
    };
  }

  private async upsertProfile(userId: string, email: string, name?: string): Promise<ProfileRow & { last_session_id: string | null }> {
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
      .select('id, name, email, role, approval_status, xp_total, current_level, achievements, last_session_id, last_access_at')
      .single();

    if (error || !data) {
      throw new DomainError(`Erro ao sincronizar perfil: ${error?.message || 'perfil não encontrado'}`);
    }

    return data as ProfileRow & { last_session_id: string | null };
  }

  private async fetchProfile(userId: string, email: string, name?: string): Promise<ProfileRow & { last_session_id: string | null }> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, email, role, approval_status, xp_total, current_level, achievements, last_session_id, last_access_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new DomainError(`Erro ao buscar perfil: ${error.message}`);
    }

    if (!data) {
      return this.upsertProfile(userId, email, name);
    }

    return data as ProfileRow & { last_session_id: string | null };
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data?.session || !data.user) {
      return { success: false, message: error?.message || 'Credenciais inválidas.' };
    }

    const sessionId = this.generateSessionId();

    // Atualizar last_session_id no login
    await this.client
      .from('profiles')
      .update({ last_session_id: sessionId })
      .eq('id', data.user.id);

    const profile = await this.fetchProfile(data.user.id, data.user.email || email, data.user.user_metadata?.name);

    // Atualizar last_access_at apenas após capturar o antigo no fetchProfile
    await this.client
      .from('profiles')
      .update({ last_access_at: new Date().toISOString() })
      .eq('id', data.user.id);

    return {
      success: true,
      data: this.buildSession(
        data.user.id,
        profile.email || email,
        profile.name || data.user.email || email,
        profile.role || 'STUDENT',
        data.session.access_token,
        sessionId,
        profile.xp_total,
        profile.current_level,
        profile.last_access_at,
        profile.approval_status
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

    const sessionId = this.generateSessionId();
    const profile = await this.upsertProfile(data.user.id, email, name);

    // Atualizar no registro também se logar automático
    await this.client
      .from('profiles')
      .update({ last_session_id: sessionId })
      .eq('id', data.user.id);

    // Atualizar last_access_at
    await this.client
      .from('profiles')
      .update({ last_access_at: new Date().toISOString() })
      .eq('id', data.user.id);

    return {
      success: true,
      data: this.buildSession(
        data.user.id,
        profile.email || email,
        profile.name || name || email,
        profile.role || 'STUDENT',
        data.session.access_token,
        sessionId,
        profile.xp_total,
        profile.current_level,
        profile.last_access_at,
        profile.approval_status
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

    // No getCurrentSession, não geramos novo ID, usamos o que está no perfil ou assumimos o local
    // (A lógica de validação Realtime no App.tsx cuidará da expulsão se o ID mudar)
    return this.buildSession(
      supabaseUser.id,
      profile.email || supabaseUser.email || '',
      profile.name || supabaseUser.email || '',
      profile.role || 'STUDENT',
      data.session.access_token,
      profile.last_session_id || '', // Se for a primeira vez após migração, pode estar vazio
      profile.xp_total,
      profile.current_level,
      profile.last_access_at,
      profile.approval_status
    );
  }

  async signInWithGoogle(): Promise<AuthResponse> {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    console.log('🔵 [AUTH] Iniciando login com Google. RedirectTo:', redirectTo);

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      return { success: false, message: error.message || 'Erro ao iniciar login com Google.' };
    }

    // O OAuth redireciona, então não temos sessão imediata aqui
    // A resposta de sucesso apenas indica que o redirect foi iniciado
    return { success: true, message: 'Redirecionando para Google...' };
  }

  async handleOAuthCallback(): Promise<AuthResponse> {
    // Após o redirect do OAuth, o Supabase processa automaticamente o hash
    const { data, error } = await this.client.auth.getSession();

    if (error || !data?.session || !data.session.user) {
      return { success: false, message: error?.message || 'Erro ao processar login com Google.' };
    }

    const supabaseUser = data.session.user;
    const sessionId = this.generateSessionId();

    // Criar/atualizar perfil do usuário OAuth
    const profile = await this.upsertProfile(
      supabaseUser.id,
      supabaseUser.email || '',
      supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email
    );

    // Atualizar last_session_id e last_access_at
    await this.client
      .from('profiles')
      .update({
        last_session_id: sessionId,
        last_access_at: new Date().toISOString()
      })
      .eq('id', supabaseUser.id);

    return {
      success: true,
      data: this.buildSession(
        supabaseUser.id,
        profile.email || supabaseUser.email || '',
        profile.name || supabaseUser.user_metadata?.full_name || supabaseUser.email || '',
        profile.role || 'STUDENT',
        data.session.access_token,
        sessionId,
        profile.xp_total,
        profile.current_level,
        profile.last_access_at,
        profile.approval_status
      )
    };
  }

  async logout(): Promise<void> {
    const { data: { user } } = await this.client.auth.getUser();
    if (user) {
      // Limpar session id no logout (opcional, mas bom para consistência)
      await this.client
        .from('profiles')
        .update({ last_session_id: null })
        .eq('id', user.id);
    }
    await this.client.auth.signOut();
  }

  async completePasswordReset(newPassword: string): Promise<void> {
    const { error } = await this.client.rpc('complete_password_reset', {
      new_password: newPassword
    });

    if (error) throw new DomainError(`Erro ao atualizar senha: ${error.message}`);
  }
}
