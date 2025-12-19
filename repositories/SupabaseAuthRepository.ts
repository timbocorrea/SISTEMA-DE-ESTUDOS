
import { IAuthRepository } from './IAuthRepository';
import { AuthResponse } from '../domain/auth';

export class SupabaseAuthRepository implements IAuthRepository {
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log(`[Supabase Auth] Attempting login for ${email}`);
    // Simula atraso de rede
    await new Promise(resolve => setTimeout(resolve, 800));

    // Fluxo de teste de erro
    if (email.includes('error')) {
      return { success: false, message: 'Credenciais inválidas.' };
    }

    // Lógica para diferenciar Admin de Aluno para fins de teste
    const isAdmin = email.toLowerCase() === 'admin@ads.edu.br';

    return {
      success: true,
      data: {
        user: { 
          id: isAdmin ? 'usr-admin' : 'usr-student', 
          name: isAdmin ? 'Admin Panel' : 'Estudante ADS', 
          email, 
          role: isAdmin ? 'INSTRUCTOR' : 'STUDENT' 
        },
        token: 'mock-jwt-token-' + Math.random().toString(36).substring(7)
      }
    };
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    console.log(`[Supabase Auth] Registering user ${name}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      data: {
        user: { id: 'usr-' + Math.random().toString(36).substring(7), name, email, role: 'STUDENT' },
        token: 'mock-jwt-token-new'
      }
    };
  }
}
