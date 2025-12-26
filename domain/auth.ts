export interface IUserSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'INSTRUCTOR';
    xp?: number;
    level?: number;
  };
  token: string;
  sessionId: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: IUserSession;
}
