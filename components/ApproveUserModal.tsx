import React, { useEffect, useState } from 'react';
import { AdminService } from '../services/AdminService';
import { CourseRecord } from '../domain/admin';

interface ApproveUserModalProps {
    user: {
        id: string;
        name: string;
        email: string;
    };
    adminId: string;
    adminService: AdminService;
    onClose: () => void;
    onSuccess: () => void;
}

const ApproveUserModal: React.FC<ApproveUserModalProps> = ({ user, adminId, adminService, onClose, onSuccess }) => {
    const [courses, setCourses] = useState<CourseRecord[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [instructions, setInstructions] = useState('');

    useEffect(() => {
        const loadCourses = async () => {
            try {
                setLoading(true);
                const courseList = await adminService.listCourses();
                setCourses(courseList);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };
        loadCourses();
    }, [adminService]);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleApprove = async () => {
        // Validação: pelo menos um curso deve ser selecionado
        if (selectedCourseIds.length === 0) {
            setError('Selecione pelo menos um curso para atribuir ao usuário.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            // Aprovar usuário
            await adminService.approveUser(user.id, adminId);

            // Atribuir cursos
            await adminService.assignCoursesToUser(user.id, selectedCourseIds, adminId);

            // Preparar e abrir cliente de email
            const subject = encodeURIComponent("Acesso Aprovado - StudySystem");
            const body = encodeURIComponent(
                `Olá ${user.name},\n\n` +
                `Seu acesso à plataforma StudySystem foi aprovado!\n\n` +
                `${instructions}\n\n` +
                `Atenciosamente,\n` +
                `Equipe Administrativa`
            );

            window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, '_blank');

            onSuccess();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fas fa-user-check text-green-600"></i>
                            Aprovar Usuário
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Selecione os cursos e envie as instruções de acesso.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* User Info */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                            <i className="fas fa-user text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Email Instructions */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Instruções por Email (Opcional)
                        </label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Digite aqui as instruções que serão enviadas para o aluno..."
                            className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none placeholder:text-slate-400"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            Este texto será inserido no corpo do email que será aberto no seu cliente padrão.
                        </p>
                    </div>

                    {/* Courses List */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                            Atribuir Cursos ({selectedCourseIds.length} selecionados)
                        </p>

                        {loading ? (
                            <div className="text-center py-8 text-slate-400">
                                <i className="fas fa-circle-notch animate-spin text-2xl mb-2"></i>
                                <p className="text-sm">Carregando cursos...</p>
                            </div>
                        ) : courses.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <i className="fas fa-inbox text-3xl mb-2"></i>
                                <p className="text-sm">Nenhum curso cadastrado</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {courses.map(course => (
                                    <label
                                        key={course.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCourseIds.includes(course.id)
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCourseIds.includes(course.id)}
                                            onChange={() => toggleCourse(course.id)}
                                            className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 text-green-600 focus:ring-2 focus:ring-green-500/50"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                {course.title}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleApprove}
                            disabled={submitting || loading || selectedCourseIds.length === 0}
                            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting && <i className="fas fa-circle-notch animate-spin"></i>}
                            <i className="fas fa-envelope"></i>
                            Aprovar e Enviar Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApproveUserModal;
