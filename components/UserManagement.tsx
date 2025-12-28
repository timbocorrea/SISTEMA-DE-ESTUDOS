import React, { useEffect, useMemo, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { ProfileRecord } from '../domain/admin';
import { createSupabaseClient } from '../services/supabaseClient';
import ApproveUserModal from './ApproveUserModal';
import RejectUserModal from './RejectUserModal';
import UserDetailsModal from './UserDetailsModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

type Props = {
  adminService: AdminService;
  currentAdminId?: string;
};

const UserManagement: React.FC<Props> = ({ adminService, currentAdminId = '' }) => {
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string>('');
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: 'STUDENT' | 'INSTRUCTOR'; apiKey: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Approval system state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingUser, setApprovingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [viewingUser, setViewingUser] = useState<ProfileRecord | null>(null);
  const [adminId, setAdminId] = useState<string>(currentAdminId);

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const loadUsers = async () => {
    setError('');
    let list: ProfileRecord[];

    if (activeTab === 'pending') {
      list = await adminService.fetchPendingUsers();
    } else if (activeTab === 'approved') {
      list = await adminService.fetchApprovedUsers();
    } else if (activeTab === 'rejected') {
      list = await adminService.fetchRejectedUsers();
    } else {
      list = await adminService.listProfiles();
    }

    setUsers(list);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadUsers();

        if (!adminId) {
          const profiles = await adminService.listProfiles();
          const instructor = profiles.find(p => p.role === 'INSTRUCTOR');
          if (instructor) setAdminId(instructor.id);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [adminService, activeTab]);

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

  const handleEditClick = (user: ProfileRecord) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      apiKey: user.gemini_api_key || ''
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSaving(true);
      await adminService.updateProfile(editingUser.id, {
        role: editingUser.role,
        geminiApiKey: editingUser.apiKey?.trim() || null
      });
      setEditingUser(null);
      await loadUsers();
    } catch (e) {
      alert(`Erro ao salvar: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveClick = (user: ProfileRecord) => {
    setApprovingUser({
      id: user.id,
      name: user.name || '',
      email: user.email
    });
  };

  const handleRejectClick = (user: ProfileRecord) => {
    setRejectingUser({
      id: user.id,
      name: user.name || '',
      email: user.email
    });
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedUserIds([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filtered.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map(u => u.id));
    }
  };

  const handleBulkBlock = async () => {
    setBulkActionLoading(true);
    try {
      const currentUserId = (await createSupabaseClient().auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      for (const userId of selectedUserIds) {
        await adminService.rejectUser(userId, currentUserId, 'Bloqueado em lote pelo administrador');
      }

      await loadUsers();
      setSelectedUserIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao bloquear usuários');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setBulkActionLoading(true);
    try {
      const currentUserId = (await createSupabaseClient().auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      for (const userId of selectedUserIds) {
        await adminService.approveUser(userId, currentUserId);
      }

      await loadUsers();
      setSelectedUserIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao aprovar usuários');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);
      setError('');

      const errors: string[] = [];

      for (const userId of selectedUserIds) {
        try {
          await adminService.deleteProfile(userId);
        } catch (e) {
          const errorMsg = (e as Error).message;
          errors.push(`Erro ao deletar usuário ${userId}: ${errorMsg}`);
          console.error('Erro detalhado:', e);
        }
      }

      if (errors.length > 0) {
        setError(`Alguns usuários não puderam ser deletados:\n${errors.join('\n')}`);
      }

      setSelectedUserIds([]);
      setIsSelectMode(false);
      setShowDeleteConfirmation(false);
      await loadUsers();
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(`Erro ao processar exclusão em lote: ${errorMsg}`);
      console.error('Erro completo:', e);
    } finally {
      setBulkActionLoading(false);
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

        <div className="flex flex-wrap items-center gap-3">
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

      {/* Tabs e Botão de Seleção na mesma linha */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        {/* Tabs para filtrar usuários */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
              }`}
          >
            <i className="fas fa-users mr-2"></i>
            Todos
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-amber-300'
              }`}
          >
            <i className="fas fa-clock mr-2"></i>
            Pendentes
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'approved'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-green-300'
              }`}
          >
            <i className="fas fa-check-circle mr-2"></i>
            Aprovados
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'rejected'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-red-300'
              }`}
          >
            <i className="fas fa-ban mr-2"></i>
            Rejeitados
          </button>
        </div>

        {/* Botão de Seleção e Ações em Lote */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectMode}
            className={`px-4 py-3 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 whitespace-nowrap ${isSelectMode
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
          >
            <i className="fas fa-check-square mr-2"></i>
            {isSelectMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>

          {/* Barra de ferramentas de seleção */}
          {isSelectMode && selectedUserIds.length > 0 && (() => {
            // Verificar se todos os selecionados estão bloqueados
            const selectedUsers = filtered.filter(u => selectedUserIds.includes(u.id));
            const allBlocked = selectedUsers.every(u => (u as any).approval_status === 'rejected');
            const someBlocked = selectedUsers.some(u => (u as any).approval_status === 'rejected');

            return (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {selectedUserIds.length} selecionado(s)
                </span>
                <div className="h-4 w-px bg-indigo-300 dark:bg-indigo-700"></div>

                {/* Mostrar Aprovar se todos estão bloqueados, Bloquear caso contrário */}
                {allBlocked ? (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fas fa-check"></i>
                    Aprovar
                  </button>
                ) : (
                  <button
                    onClick={handleBulkBlock}
                    disabled={bulkActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <i className="fas fa-ban"></i>
                    Bloquear
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <i className="fas fa-trash"></i>
                  Excluir
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {isSelectMode && (
                  <th className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                    />
                  </th>
                )}
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
                  <td colSpan={isSelectMode ? 6 : 5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isSelectMode ? 6 : 5} className="px-6 py-8 text-center text-sm text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map(u => {
                  const isBlocked = (u as any).approval_status === 'rejected';
                  return (
                    <tr
                      key={u.id}
                      className={`transition-all group ${isSelectMode ? '' : 'cursor-pointer'
                        } ${selectedUserIds.includes(u.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        } ${isBlocked
                          ? 'bg-red-100 dark:bg-red-950/40 border-l-4 border-red-500 hover:bg-red-200 dark:hover:bg-red-950/60'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      onClick={() => !isSelectMode && setViewingUser(u)}
                    >
                      {isSelectMode && (
                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                          />
                        </td>
                      )}
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
                        <div className="flex flex-col gap-2 items-center">
                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${u.role === 'INSTRUCTOR'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                              }`}
                          >
                            {u.role === 'INSTRUCTOR' ? 'Admin' : 'Student'}
                          </span>

                          {/* Status de Aprovação */}
                          {(() => {
                            const status = (u as any).approval_status || 'approved';
                            if (status === 'pending') {
                              return (
                                <span className="text-[10px] font-black px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                  <i className="fas fa-clock mr-1"></i>Pendente
                                </span>
                              );
                            } else if (status === 'rejected') {
                              return (
                                <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 uppercase tracking-widest">
                                  <i className="fas fa-ban mr-1"></i>Bloqueado
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
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
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          {/* Botões de aprovação/rejeição para usuários pendentes */}
                          {activeTab === 'pending' && !isSelectMode && (
                            <>
                              <button
                                onClick={() => handleApproveClick(u)}
                                className="px-3 py-2 rounded-xl bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors"
                                title="Aprovar Usuário"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => handleRejectClick(u)}
                                className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 transition-colors"
                                title="Rejeitar Usuário"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}

                          {/* Botão de configuração para todos */}
                          {!isSelectMode && (
                            <button
                              onClick={() => handleEditClick(u)}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Configurar Usuário"
                            >
                              <i className="fas fa-cog"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        Se der erro de permissão, crie policies RLS para INSTRUCTOR ler/atualizar `profiles`.
      </div>

      {/* Modal de Aprovação */}
      {approvingUser && (
        <ApproveUserModal
          user={approvingUser}
          adminId={adminId}
          adminService={adminService}
          onClose={() => setApprovingUser(null)}
          onSuccess={() => {
            setApprovingUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Modal de Visualização Detalhada */}
      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          adminService={adminService}
          onClose={() => setViewingUser(null)}
          onRefresh={() => {
            setViewingUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Modal de Rejeição */}
      {rejectingUser && (
        <RejectUserModal
          user={rejectingUser}
          adminId={adminId}
          adminService={adminService}
          onClose={() => setRejectingUser(null)}
          onSuccess={() => {
            setRejectingUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirmation && (
        <DeleteConfirmationModal
          userCount={selectedUserIds.length}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {/* Modal de Edição */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Gerenciar Usuário</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{editingUser.name || 'Sem nome'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    Tipo de Acesso
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingUser) {
                          setEditingUser({
                            id: editingUser.id,
                            name: editingUser.name,
                            email: editingUser.email,
                            apiKey: editingUser.apiKey,
                            role: 'STUDENT'
                          });
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-all ${editingUser.role === 'STUDENT'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400'
                        }`}
                    >
                      <i className="fas fa-user-graduate mr-2"></i> Estudante
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingUser) {
                          setEditingUser({
                            id: editingUser.id,
                            name: editingUser.name,
                            email: editingUser.email,
                            apiKey: editingUser.apiKey,
                            role: 'INSTRUCTOR'
                          });
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-all ${editingUser.role === 'INSTRUCTOR'
                        ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400'
                        }`}
                    >
                      <i className="fas fa-chalkboard-teacher mr-2"></i> Admin / Instrutor
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                    AI API Key (Google / OpenAI / Z.ai / Groq)
                  </label>
                  <div className="relative">
                    <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                      type="text"
                      value={editingUser.apiKey}
                      onChange={e => {
                        if (editingUser) {
                          setEditingUser({
                            id: editingUser.id,
                            name: editingUser.name,
                            email: editingUser.email,
                            role: editingUser.role,
                            apiKey: e.target.value
                          });
                        }
                      }}
                      placeholder="AIza... | sk... | gsk... | id.secret"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Suporte: Google Gemini, OpenAI, Zhipu AI e Groq (Grátis: Llama 3).
                  </p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving && <i className="fas fa-circle-notch animate-spin"></i>}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
