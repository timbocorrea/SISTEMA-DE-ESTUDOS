
import React from 'react';
import { IUserSession } from '../domain/auth';

interface SidebarProps {
  session: IUserSession;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ session, activeView, onViewChange, onLogout, theme, onToggleTheme }) => {
  const isAdmin = session.user.role === 'INSTRUCTOR';

  // In a real app, these values would come from a user state/hook
  const userGamification = {
    level: 3,
    xp: 2450
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large' },
    { id: 'courses', label: 'Meus Cursos', icon: 'fas fa-graduation-cap' },
    { id: 'achievements', label: 'Conquistas', icon: 'fas fa-trophy' },
  ];

  return (
    <aside className="w-64 h-full bg-[#f8fafc] dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-colors">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">StudySystem</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">Case Study ADS</p>
        </div>
      </div>

      {/* User Gamification Card */}
      <div className="mx-2 mb-8 p-4 bg-indigo-600/5 dark:bg-white/5 rounded-2xl border border-indigo-500/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white border-2 border-indigo-300">
            {userGamification.level}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">Nível {userGamification.level}</p>
            <p className="text-[10px] text-slate-400 font-medium">Próximo: {3000 - userGamification.xp} XP</p>
          </div>
        </div>
        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '45%' }}></div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Principal</p>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
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
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-2">Administração</p>
            <button
              onClick={() => onViewChange('content')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                activeView === 'content' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <i className="fas fa-file-alt w-5"></i>
              Gestão de Conteúdo
            </button>
          </>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
        >
          <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'} w-5`}></i>
          {theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all text-sm font-semibold"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          Encerrar Sessão
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
