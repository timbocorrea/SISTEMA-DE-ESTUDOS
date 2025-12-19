
import { AuthResponse } from '../domain/auth';

export interface IAuthRepository {
  login(email: string, password: string): Promise<AuthResponse>;
  register(name: string, email: string, password: string): Promise<AuthResponse>;
}
