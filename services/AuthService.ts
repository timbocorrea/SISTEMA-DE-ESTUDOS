
import { IAuthRepository } from '../repositories/IAuthRepository';
import { AuthResponse, IUserSession } from '../domain/auth';

export class AuthService {
  constructor(private authRepo: IAuthRepository) {}

  async login(email: string, pass: string): Promise<AuthResponse> {
    const res = await this.authRepo.login(email, pass);
    if (res.success && res.data) {
      localStorage.setItem('study_system_session', JSON.stringify(res.data));
    }
    return res;
  }

  async register(name: string, email: string, pass: string): Promise<AuthResponse> {
    const res = await this.authRepo.register(name, email, pass);
    if (res.success && res.data) {
      localStorage.setItem('study_system_session', JSON.stringify(res.data));
    }
    return res;
  }

  logout(): void {
    localStorage.removeItem('study_system_session');
  }

  getCurrentSession(): IUserSession | null {
    const session = localStorage.getItem('study_system_session');
    return session ? JSON.parse(session) : null;
  }
}
