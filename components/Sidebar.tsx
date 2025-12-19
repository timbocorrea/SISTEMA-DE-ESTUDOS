
import React from 'react';
import { IUserSession } from '../domain/auth';
import { User } from '../domain/entities';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  // Passamos o objeto User real para manter a barra sincronizada
}

// Nota: Para manter o contrato simples, vamos assumir que o App.tsx gerencia o User
// Se o User não for passado, simulamos ou buscamos do contexto no futuro.
// Por agora, vou adicionar suporte a receber o currentUser opcionalmente.
const Sidebar: React.FC<SidebarProps & { user?: User | null }> = ({ session, activeView, onViewChange, onLogout, theme, onToggleTheme, user }) => {
  const isAdmin = session.user.role === 'INSTRUCTOR';

  // Usa o nível e XP reais se disponíveis, senão valores mock
  const level = user?.level || 3;
  const xp = user?.xp || 2450;
  const xpInLevel = xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large' },
    { id: 'courses', label: 'Meus Cursos', icon: 'fas fa-graduation-cap' },
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy' },
  ];

  return (
    <aside className="w-64 h-full bg-[#f8fafc] dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-colors">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 rotate-3">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div>
          <h1 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight tracking-tighter uppercase">StudySystem</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Case Study ADS</p>
        </div>
      </div>

      {/* User Gamification Card Dinâmico */}
      <div className="mx-2 mb-8 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-[12px] font-black text-white border-2 border-white dark:border-slate-700 shadow-md">
            {level}
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 leading-none uppercase tracking-tight">Nível {level}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{1000 - xpInLevel} XP para o Lvl {level + 1}</p>
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-700" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 opacity-50">Menu Principal</p>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold tracking-tight ${
              activeView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <i className={`${item.icon} w-5`}></i>
            {item.label}
          </button>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 mb-4 opacity-50">Administração</p>
            <button
              onClick={() => onViewChange('content')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold tracking-tight mb-1 ${
                activeView === 'content' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <i className="fas fa-file-alt w-5"></i>
              Gestão de Conteúdo
            </button>
            <button
              onClick={() => onViewChange('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold tracking-tight ${
                activeView === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <i className="fas fa-users w-5"></i>
              Controle de Usuários
            </button>
          </>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold"
        >
          <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'} w-5`}></i>
          {theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all text-sm font-bold"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          Encerrar Sessão
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
