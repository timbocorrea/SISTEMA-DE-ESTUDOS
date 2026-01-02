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

            // Strategy: Remove all current assignments for the user, then add the selected ones.
            // We'll use the repository methods via adminService.
            // Since removeAllUserCourseAssignments is just in the repository, we need to verify if AdminService exposes it.
            // AdminService DOES NOT expose removeAllUserCourseAssignments directly in the interface I saw previously?
            // Wait, I need to check AdminService.ts again to be sure specific methods are exposed.
            // If not, I'll use removeUserCourseAssignment loop or similar.

            // Checking AdminService.ts from memory/view:
            // It has assignCoursesToUser (upsert) and removeUserCourseAssignment. It assumes adding to existing.
            // It does NOT have removeAllUserCourseAssignments exposed.

            // Workaround: Get initial assignments again to be safe (or use state initialized one), 
            // find what to remove and what to add.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fas fa-lock text-indigo-500"></i>
                            Acessos do Usuário
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {user.name} ({user.email})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center justify-center shadow-sm"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <input
                        type="text"
                        placeholder="Buscar cursos..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-950 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">
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
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {isSelected && <i className="fas fa-check text-xs"></i>}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => handleToggle(course.id)}
                                        />
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{course.title}</span>
                                    </label>
                                );
                            })}
                            {filteredCourses.length === 0 && (
                                <p className="text-center py-4 text-slate-400">Nenhum curso encontrado.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? <><i className="fas fa-circle-notch animate-spin"></i> Salvando...</> : 'Salvar Alterações'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default UserCourseAccessModal;
