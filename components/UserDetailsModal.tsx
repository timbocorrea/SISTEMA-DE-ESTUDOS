import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { ProfileRecord, CourseRecord } from '../domain/admin';
import { AdminStudentHistory } from './AdminStudentHistory';

interface UserDetailsModalProps {
    user: ProfileRecord;
    adminService: AdminService;
    onClose: () => void;
    onRefresh: () => void;
    onApprove: (user: ProfileRecord) => void;
    onReject: (user: ProfileRecord) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, adminService, onClose, onRefresh, onApprove, onReject }) => {
    const [assignedCourses, setAssignedCourses] = useState<CourseRecord[]>([]);
    const [allCourses, setAllCourses] = useState<CourseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditingCourses, setIsEditingCourses] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUserCourses();
    }, [user.id]);

    const loadUserCourses = async () => {
        try {
            setLoading(true);
            setError('');

            const assignedIds = await adminService.getUserCourseAssignments(user.id);
            setSelectedCourseIds(assignedIds);

            const courses = await adminService.listCourses();
            setAllCourses(courses);

            const assigned = courses.filter(c => assignedIds.includes(c.id));
            setAssignedCourses(assigned);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourses = async () => {
        try {
            setSaving(true);
            setError('');

            const profiles = await adminService.listProfiles();
            const admin = profiles.find(p => p.role === 'INSTRUCTOR');
            if (!admin) throw new Error('Nenhum administrador encontrado');

            await adminService.assignCoursesToUser(user.id, selectedCourseIds, admin.id);

            setIsEditingCourses(false);
            await loadUserCourses();
            onRefresh();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = () => {
        const status = (user as any).approval_status || 'approved';

        if (status === 'pending') {
            return <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">⏳ Pendente</span>;
        } else if (status === 'approved') {
            return <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">✓ Aprovado</span>;
        } else if (status === 'rejected') {
            return <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold">✕ Rejeitado</span>;
        }
        return null;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-modal-title"
        >
            <div className="bg-[#0a0e14]/95 backdrop-blur-xl w-full max-w-4xl shadow-2xl overflow-hidden border border-white/10 max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 md:p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl font-black shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">{user.name || 'Sem nome'}</h3>
                                <p className="text-sm text-slate-400">{user.email}</p>
                                <div className="mt-2">{getStatusBadge()}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-2 backdrop-blur-md">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Grid de Informações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nível de Acesso */}
                        <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Nível de Acesso
                            </p>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg text-sm font-black border ${user.role === 'INSTRUCTOR'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                    }`}>
                                    {user.role === 'INSTRUCTOR' ? '👨‍🏫 Administrador' : '👨‍🎓 Estudante'}
                                </span>
                            </div>
                        </div>

                        {/* XP e Nível */}
                        <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Progresso
                            </p>
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-2xl font-black text-indigo-400">LVL {user.current_level || 1}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300">
                                        <span className="font-bold text-white">{(user.xp_total || 0).toLocaleString()}</span> XP
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Último Acesso */}
                        <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                <i className="fas fa-clock mr-1"></i> Último Acesso
                            </p>
                            <p className="text-sm font-bold text-slate-200">
                                {formatDate((user as any).updated_at)}
                            </p>
                        </div>

                        {/* Data de Aprovação */}
                        <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                <i className="fas fa-check-circle mr-1"></i> Data de Aprovação
                            </p>
                            <p className="text-sm font-bold text-slate-200">
                                {formatDate((user as any).approved_at)}
                            </p>
                        </div>
                    </div>

                    {/* Cursos Atribuídos */}
                    <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                            <h4 className="font-black text-white flex items-center gap-2">
                                <i className="fas fa-graduation-cap text-indigo-400"></i>
                                Cursos Atribuídos ({assignedCourses.length})
                            </h4>
                            {!isEditingCourses && (
                                <button
                                    onClick={() => setIsEditingCourses(true)}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center gap-2 border border-indigo-400/20"
                                >
                                    <i className="fas fa-edit"></i>
                                    Editar Cursos
                                </button>
                            )}
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8 text-slate-500">
                                    <i className="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                                    <p className="text-sm">Carregando cursos...</p>
                                </div>
                            ) : isEditingCourses ? (
                                // Modo de edição
                                <div className="space-y-3">
                                    {allCourses.map(course => (
                                        <label
                                            key={course.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedCourseIds.includes(course.id)
                                                ? 'border-indigo-500/50 bg-indigo-500/10'
                                                : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-indigo-500/30'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedCourseIds.includes(course.id)
                                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                                : 'border-white/20 bg-black/40'
                                                }`}>
                                                {selectedCourseIds.includes(course.id) && <i className="fas fa-check text-xs"></i>}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedCourseIds.includes(course.id)}
                                                onChange={() => toggleCourse(course.id)}
                                                className="hidden"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{course.title}</p>
                                                {course.description && (
                                                    <p className="text-xs text-slate-400">{course.description}</p>
                                                )}
                                            </div>
                                            {selectedCourseIds.includes(course.id) && (
                                                <i className="fas fa-check-circle text-indigo-400"></i>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            ) : assignedCourses.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <i className="fas fa-inbox text-3xl mb-2"></i>
                                    <p className="text-sm">Nenhum curso atribuído</p>
                                </div>
                            ) : (
                                // Modo de visualização
                                <div className="space-y-2">
                                    {assignedCourses.map(course => (
                                        <div
                                            key={course.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
                                        >
                                            <i className="fas fa-book text-indigo-400"></i>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{course.title}</p>
                                                {course.description && (
                                                    <p className="text-xs text-slate-400">{course.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botões de ação quando editando */}
                        {isEditingCourses && (
                            <div className="p-4 border-t border-white/5 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsEditingCourses(false);
                                        loadUserCourses();
                                    }}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveCourses}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-indigo-400/20"
                                >
                                    {saving && <i className="fas fa-circle-notch animate-spin"></i>}
                                    <i className="fas fa-save"></i>
                                    Salvar Alterações
                                </button>
                            </div>
                        )}
                    </div>


                    {/* Histórico de Progressão */}
                    <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5">
                            <h4 className="font-black text-white flex items-center gap-2">
                                <i className="fas fa-history text-indigo-400"></i>
                                Histórico de Progressão
                            </h4>
                        </div>
                        <div className="p-4">
                            <AdminStudentHistory userId={user.id} adminService={adminService} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="flex gap-2">
                        {(user as any).approval_status === 'approved' && (
                            <button
                                onClick={() => onReject(user)}
                                className="px-5 py-3 min-h-[44px] rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <i className="fas fa-ban"></i>
                                Bloquear
                            </button>
                        )}
                        {((user as any).approval_status === 'rejected' || (user as any).approval_status === 'pending') && (
                            <button
                                onClick={() => onApprove(user)}
                                className="px-5 py-3 min-h-[44px] rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <i className="fas fa-check-circle"></i>
                                {(user as any).approval_status === 'pending' ? 'Aprovar' : 'Desbloquear'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-sm transition-colors active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div >
    );
};

export default UserDetailsModal;
