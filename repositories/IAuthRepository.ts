import { AuthResponse, IUserSession } from '../domain/auth';

export interface IAuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
  register(name: string, email: string, password: string): Promise<AuthResponse>;
  getCurrentSession(): Promise<IUserSession | null>;
  logout(): Promise<void>;
}
