export interface IUserSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'INSTRUCTOR';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    xp?: number;
    level?: number;
    lastAccess?: Date | null;
  };
  token: string;
  sessionId: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: IUserSession;
}
