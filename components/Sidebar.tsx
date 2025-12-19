
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large' },
    { id: 'courses', label: 'Cursos', icon: 'fas fa-graduation-cap' },
    { id: 'calendar', label: 'Calendário', icon: 'fas fa-calendar-alt' },
  ];

  const adminItems = [
    { id: 'content', label: 'Conteúdo', icon: 'fas fa-file-alt' },
    { id: 'users', label: 'Usuários', icon: 'fas fa-users' },
  ];

  const bottomItems = [
    { id: 'profile', label: 'Perfil', icon: 'fas fa-user' },
    { id: 'settings', label: 'Configurações', icon: 'fas fa-cog' },
  ];

  return (
    <aside className="w-64 h-full bg-[#f8fafc] dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-colors">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-[#0e7490] rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-900/20">
          <i className="fas fa-graduation-cap"></i>
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">StudyWeb</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tighter">Plataforma Acadêmica</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Principal</p>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
              activeView === item.id 
                ? 'bg-[#0084ff15] text-[#0084ff]' 
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
            {adminItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
                  activeView === item.id 
                    ? 'bg-[#0084ff15] text-[#0084ff]' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <i className={`${item.icon} w-5`}></i>
                {item.label}
              </button>
            ))}
          </>
        )}

        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-2">Pessoal</p>
        {bottomItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold ${
              activeView === item.id 
                ? 'bg-[#0084ff15] text-[#0084ff]' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <i className={`${item.icon} w-5`}></i>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 space-y-2 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
        >
          <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'} w-5`}></i>
          Tema {theme === 'light' ? 'Escuro' : 'Claro'}
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all text-sm font-semibold"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
