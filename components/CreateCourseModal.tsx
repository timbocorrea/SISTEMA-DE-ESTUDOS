import React, { useState } from 'react';

interface CreateCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (title: string, description: string, imageUrl: string) => Promise<void>;
    isLoading?: boolean;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setImageUrl('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) return;
        await onConfirm(title, description, imageUrl);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Criar Novo Curso</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Preencha os detalhes abaixo</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título do Curso</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Ex: Fundamentos de React"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL da Imagem de Capa (Opcional)</label>
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição (Opcional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                                placeholder="Breve descrição do conteúdo..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title.trim() || isLoading}
                            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check"></i>}
                            Criar Curso
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseModal;
