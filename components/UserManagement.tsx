import React, { useEffect, useMemo, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { ProfileRecord } from '../domain/admin';

type Props = {
  adminService: AdminService;
};

const UserManagement: React.FC<Props> = ({ adminService }) => {
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string>('');

  const loadUsers = async () => {
    setError('');
    const list = await adminService.listProfiles();
    setUsers(list);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadUsers();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [adminService]);

  const stats = useMemo(() => {
    const instructors = users.filter(u => u.role === 'INSTRUCTOR').length;
    const students = users.filter(u => u.role === 'STUDENT').length;
    return { instructors, students, total: users.length };
  }, [users]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
  }, [users, filter]);

  const updateRole = async (profileId: string, role: 'STUDENT' | 'INSTRUCTOR') => {
    try {
      setBusyId(profileId);
      await adminService.updateProfileRole(profileId, role);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Administração / <span className="text-slate-800 dark:text-white">Controle de Usuários</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gestão de Usuários</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Monitore perfis e permissões.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-96">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Buscar por nome ou email…"
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
            />
          </div>
          <button
            onClick={() => loadUsers().catch(e => setError((e as Error).message))}
            className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <i className="fas fa-sync-alt mr-2"></i> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          <span className="font-bold">Erro:</span> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-black text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Instrutores</p>
          <p className="text-3xl font-black text-cyan-500">{stats.instructors}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estudantes</p>
          <p className="text-3xl font-black text-green-500">{stats.students}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Nível</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">XP Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-600/10">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700 dark:text-slate-200">{u.name || '—'}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                          u.role === 'INSTRUCTOR'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {u.role === 'INSTRUCTOR' ? 'Admin' : 'Student'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-md">
                        LVL {u.current_level ?? 1}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-slate-600 dark:text-slate-200">
                        {(u.xp_total ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          disabled={busyId === u.id}
                          onClick={() => updateRole(u.id, u.role === 'INSTRUCTOR' ? 'STUDENT' : 'INSTRUCTOR')}
                          className={`px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                            u.role === 'INSTRUCTOR'
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                              : 'bg-cyan-600 text-white hover:bg-cyan-500'
                          }`}
                          title="Alternar role"
                        >
                          {busyId === u.id ? (
                            <i className="fas fa-circle-notch animate-spin"></i>
                          ) : u.role === 'INSTRUCTOR' ? (
                            'Remover Admin'
                          ) : (
                            'Tornar Admin'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        Se der erro de permissão, crie policies RLS para INSTRUCTOR ler/atualizar `profiles`.
      </div>
    </div>
  );
};

export default UserManagement;

