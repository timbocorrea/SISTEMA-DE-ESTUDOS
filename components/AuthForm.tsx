import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthService } from '../services/AuthService';
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from '../domain/schemas/authSchema';

interface AuthFormProps {
  authService: AuthService;
  onSuccess: () => void | Promise<void>;
}

const AuthForm: React.FC<AuthFormProps> = ({ authService, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form com validação dinâmica baseada no tipo (login ou signup)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData | SignupFormData>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    mode: 'onBlur' // Valida quando perde o foco
  });

  // Troca entre login e signup
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    reset(); // Limpa o formulário
  };

  const onSubmit = async (data: LoginFormData | SignupFormData) => {
    setLoading(true);
    setError('');

    try {
      const res = isLogin
        ? await authService.login(data.email, (data as LoginFormData).password)
        : await authService.register(
          (data as SignupFormData).name,
          data.email,
          (data as SignupFormData).password
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
          <p className="text-slate-400 mt-2">Plataforma Acadêmica de ADS</p>
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
                  {...register('name' as any)}
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
                placeholder="exemplo@ads.edu.br"
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
                  {...register('confirmPassword' as any)}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
