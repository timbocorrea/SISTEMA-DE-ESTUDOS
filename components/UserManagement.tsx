
import React from 'react';

const UserManagement: React.FC = () => {
  const users = [
    { id: '1', name: 'João Silva', email: 'joao@ads.edu.br', role: 'Estudante', level: 5, xp: 12500, progress: 85 },
    { id: '2', name: 'Maria Santos', email: 'maria@ads.edu.br', role: 'Estudante', level: 3, xp: 4200, progress: 40 },
    { id: '3', name: 'Lucas Oliveira', email: 'lucas@ads.edu.br', role: 'Estudante', level: 8, xp: 29000, progress: 95 },
    { id: '4', name: 'Ana Costa', email: 'ana@ads.edu.br', role: 'Estudante', level: 1, xp: 850, progress: 10 },
    { id: '5', name: 'Carlos Ferreira', email: 'carlos@ads.edu.br', role: 'Estudante', level: 4, xp: 7800, progress: 62 },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
          Administração / <span className="text-slate-800 dark:text-white">Controle de Usuários</span>
        </div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gestão de Alunos</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Monitore o engajamento e a progressão dos estudantes da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Alunos</p>
          <p className="text-3xl font-black text-indigo-600">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Média de Nível</p>
          <p className="text-3xl font-black text-cyan-500">4.2</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Engajamento Semanal</p>
          <p className="text-3xl font-black text-green-500">+24%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estudante</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Nível</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">XP Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progresso do Curso</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" alt={u.name} />
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-md">
                      LVL {u.level}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{u.xp.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-full max-w-[120px] space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-slate-400">
                        <span>{u.progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${u.progress}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button className="text-slate-400 hover:text-indigo-500 transition-colors p-2">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
