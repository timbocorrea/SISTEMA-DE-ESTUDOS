import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord, ProfileRecord } from '../domain/admin';
import { createSupabaseClient } from '../services/supabaseClient';

interface Props {
    user: ProfileRecord;
    adminService: AdminService;
    onClose: () => void;
    onSuccess: () => void;
}

const UserCourseAccessModal: React.FC<Props> = ({ user, adminService, onClose, onSuccess }) => {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allCourses, userAssignments] = await Promise.all([
                adminService.listCourses(),
                adminService.getUserCourseAssignments(user.id)
            ]);
            setCourses(allCourses);
            setSelectedCourseIds(userAssignments);
        } catch (err: any) {
            setError(err?.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');

            const currentUser = (await createSupabaseClient().auth.getUser()).data.user;
            if (!currentUser) throw new Error("Você não está autenticado.");

            const initialAssignments = await adminService.getUserCourseAssignments(user.id);

            const toAdd = selectedCourseIds.filter(id => !initialAssignments.includes(id));
            const toRemove = initialAssignments.filter(id => !selectedCourseIds.includes(id));

            const promises = [];

            // Add new
            if (toAdd.length > 0) {
                promises.push(adminService.assignCoursesToUser(user.id, toAdd, currentUser.id));
            }

            // Remove old - one by one as per current service capability
            toRemove.forEach(courseId => {
                promises.push(adminService.removeUserCourseAssignment(user.id, courseId));
            });

            await Promise.all(promises);

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Erro ao salvar alterações');
            setSaving(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0e14]/95 backdrop-blur-xl w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh] rounded-t-3xl md:rounded-3xl">

                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <i className="fas fa-lock text-indigo-400"></i>
                            Acessos do Usuário
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {user.name} ({user.email})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5">
                    <div className="relative group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Buscar cursos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">
                            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>Carregando cursos...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {filteredCourses.map(course => {
                                const isSelected = selectedCourseIds.includes(course.id);
                                return (
                                    <label
                                        key={course.id}
                                        className={`flex items-center gap-3 p-4 min-h-[52px] rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${isSelected
                                            ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                                            : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-indigo-500/30'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected
                                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                            : 'border-white/20 bg-black/40'
                                            }`}>
                                            {isSelected && <i className="fas fa-check text-xs"></i>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => handleToggle(course.id)}
                                        />
                                        <span className="font-bold text-slate-200">{course.title}</span>
                                    </label>
                                );
                            })}
                            {filteredCourses.length === 0 && (
                                <p className="text-center py-4 text-slate-500">Nenhum curso encontrado.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white font-bold text-sm transition-colors border border-white/10"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 border border-indigo-400/20"
                    >
                        {saving ? <><i className="fas fa-circle-notch animate-spin"></i> Salvando...</> : 'Salvar Alterações'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default UserCourseAccessModal;
