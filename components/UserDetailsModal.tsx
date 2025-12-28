import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { ProfileRecord, CourseRecord } from '../domain/admin';

interface UserDetailsModalProps {
    user: ProfileRecord;
    adminService: AdminService;
    onClose: () => void;
    onRefresh: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, adminService, onClose, onRefresh }) => {
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

            // Buscar IDs dos cursos atribuídos
            const assignedIds = await adminService.getUserCourseAssignments(user.id);
            setSelectedCourseIds(assignedIds);

            // Buscar todos os cursos disponíveis
            const courses = await adminService.listCourses();
            setAllCourses(courses);

            // Filtrar apenas os cursos atribuídos
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

            // Buscar um admin ID
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
            return <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">⏳ Pendente</span>;
        } else if (status === 'approved') {
            return <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">✓ Aprovado</span>;
        } else if (status === 'rejected') {
            return <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">✕ Rejeitado</span>;
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{user.name || 'Sem nome'}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                                <div className="mt-2">{getStatusBadge()}</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Grid de Informações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nível de Acesso */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Nível de Acesso
                            </p>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg text-sm font-black ${user.role === 'INSTRUCTOR'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-indigo-600 text-white'
                                    }`}>
                                    {user.role === 'INSTRUCTOR' ? '👨‍🏫 Administrador' : '👨‍🎓 Estudante'}
                                </span>
                            </div>
                        </div>

                        {/* XP e Nível */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Progresso
                            </p>
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-2xl font-black text-indigo-600">LVL {user.current_level || 1}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        <span className="font-bold">{(user.xp_total || 0).toLocaleString()}</span> XP
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Último Acesso */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                <i className="fas fa-clock mr-1"></i> Último Acesso
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {formatDate((user as any).updated_at)}
                            </p>
                        </div>

                        {/* Data de Aprovação */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                <i className="fas fa-check-circle mr-1"></i> Data de Aprovação
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {formatDate((user as any).approved_at)}
                            </p>
                        </div>
                    </div>

                    {/* Cursos Atribuídos */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <i className="fas fa-graduation-cap text-indigo-600"></i>
                                Cursos Atribuídos ({assignedCourses.length})
                            </h4>
                            {!isEditingCourses && (
                                <button
                                    onClick={() => setIsEditingCourses(true)}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <i className="fas fa-edit"></i>
                                    Editar Cursos
                                </button>
                            )}
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8 text-slate-400">
                                    <i className="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                                    <p className="text-sm">Carregando cursos...</p>
                                </div>
                            ) : isEditingCourses ? (
                                // Modo de edição
                                <div className="space-y-3">
                                    {allCourses.map(course => (
                                        <label
                                            key={course.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCourseIds.includes(course.id)
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCourseIds.includes(course.id)}
                                                onChange={() => toggleCourse(course.id)}
                                                className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500/50"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{course.title}</p>
                                                {course.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{course.description}</p>
                                                )}
                                            </div>
                                            {selectedCourseIds.includes(course.id) && (
                                                <i className="fas fa-check-circle text-indigo-600 dark:text-indigo-400"></i>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            ) : assignedCourses.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <i className="fas fa-inbox text-3xl mb-2"></i>
                                    <p className="text-sm">Nenhum curso atribuído</p>
                                </div>
                            ) : (
                                // Modo de visualização
                                <div className="space-y-2">
                                    {assignedCourses.map(course => (
                                        <div
                                            key={course.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700"
                                        >
                                            <i className="fas fa-book text-indigo-600 dark:text-indigo-400"></i>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{course.title}</p>
                                                {course.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{course.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botões de ação quando editando */}
                        {isEditingCourses && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsEditingCourses(false);
                                        loadUserCourses();
                                    }}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveCourses}
                                    disabled={saving}
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving && <i className="fas fa-circle-notch animate-spin"></i>}
                                    <i className="fas fa-save"></i>
                                    Salvar Alterações
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsModal;
