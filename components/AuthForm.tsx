import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthService } from '../services/AuthService';
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from '../domain/schemas/authSchema';
import { SupportDialog } from './SupportDialog';
import { AdminService } from '../services/AdminService';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';

interface AuthFormProps {
  authService: AuthService;
  onSuccess: () => void | Promise<void>;
}

const AuthForm: React.FC<AuthFormProps> = ({ authService, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Form com validação dinâmica baseada no tipo (login ou signup)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SignupFormData>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema) as any,
    mode: 'onBlur' // Valida quando perde o foco
  });

  // Troca entre login e signup
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    reset(); // Limpa o formulário
  };

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError('');

    try {
      const res = isLogin
        ? await authService.login(data.email, data.password)
        : await authService.register(
          data.name!,
          data.email,
          data.password
        );

      if (res.success) {
        await onSuccess();
      } else {
        setError(res.message || 'Ocorreu um erro.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050810] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/40 rotate-3">
            <i className="fas fa-graduation-cap text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">StudySystem</h1>
          <p className="text-slate-400 mt-2">Plataforma de Estudos</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-bold text-slate-100 mb-6">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nome Completo
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className={`w-full bg-slate-800/50 border ${errors.name ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition`}
                  placeholder="Seu nome"
                />
                {errors.name && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.name.message as string}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                E-mail Institucional
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full bg-slate-800/50 border ${errors.email ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition`}
                placeholder="exemplo@email.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.email.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`w-full bg-slate-800/50 border ${errors.password ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.password.message as string}
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={`w-full bg-slate-800/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.confirmPassword.message as string}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                isLogin ? 'Entrar no Sistema' : 'Finalizar Cadastro'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900/50 text-slate-400">ou</span>
              </div>
            </div>

            <button
              onClick={async () => {
                // Feature temporarily disabled
                // setLoading(true);
                // setError('');
                // try {
                //   const res = await authService.signInWithGoogle();
                //   if (!res.success) {
                //     setError(res.message || 'Erro ao iniciar login com Google.');
                //     setLoading(false);
                //   }
                //   // Se sucesso, a página será redirecionada para o Google
                // } catch (err) {
                //   setError('Erro de conexão com o servidor.');
                //   setLoading(false);
                // }
              }}
              disabled={true}
              className="mt-4 w-full bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed font-semibold py-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-3 opacity-70"
            >
              <svg className="w-5 h-5 grayscale opacity-50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Entrar com Google (Em breve)
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? 'Não tem uma conta?' : 'Já possui cadastro?'}
              <button
                onClick={toggleMode}
                className="ml-2 text-indigo-400 font-bold hover:text-indigo-300 transition"
              >
                {isLogin ? 'Criar agora' : 'Fazer login'}
              </button>
            </p>

            {/* Support Button */}
            <div className="mt-4">
              <button
                onClick={() => setIsSupportOpen(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <i className="fas fa-life-ring"></i>
                Dificuldade para acessar?
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Dialog - Public Access */}
      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={new AdminService(new SupabaseAdminRepository())}
      />
    </div>
  );
};

export default AuthForm;
