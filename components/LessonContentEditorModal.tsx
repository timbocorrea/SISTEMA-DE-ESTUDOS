import React, { useState } from 'react';

interface LessonContentEditorModalProps {
    isOpen: boolean;
    initialContent: string;
    lessonTitle: string;
    onClose: () => void;
    onSave: (content: string) => void;
}

const LessonContentEditorModal: React.FC<LessonContentEditorModalProps> = ({
    isOpen,
    initialContent,
    lessonTitle,
    onClose,
    onSave
}) => {
    const [content, setContent] = useState(initialContent);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(content);
        onClose();
    };

    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <i className="fas fa-pen-to-square text-indigo-600 dark:text-indigo-400 text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Editor de Conteúdo</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{lessonTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Toolbar - Espaço para futuros recursos de edição */}
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Formato de Texto
                        </span>
                        <div className="flex gap-1 ml-4">
                            {/* Futuros botões de formatação serão adicionados aqui */}
                            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <i className="fas fa-bold mr-1"></i> Negrito (em breve)
                            </button>
                            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <i className="fas fa-italic mr-1"></i> Itálico (em breve)
                            </button>
                            <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <i className="fas fa-list mr-1"></i> Lista (em breve)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Digite o conteúdo da aula aqui...

Você pode escrever:
• Introdução ao tema
• Objetivos de aprendizagem
• Explicações detalhadas
• Exemplos práticos
• Exercícios propostos
• Referências e links úteis

Dica: Use quebras de linha para organizar o texto em parágrafos."
                        className="w-full h-full bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-slate-700 dark:text-slate-200 text-base leading-relaxed resize-none outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-mono"
                        style={{
                            fontSize: '15px',
                            lineHeight: '1.8'
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-font"></i>
                                <span>{charCount.toLocaleString()} caracteres</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="fas fa-text-width"></i>
                                <span>{wordCount.toLocaleString()} palavras</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <i className="fas fa-check"></i>
                                Salvar Conteúdo
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                <p className="font-bold mb-1">💡 Recursos avançados em breve!</p>
                                <p>Estamos preparando um editor visual com formatação rica, imagens inline, código com syntax highlighting e muito mais.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonContentEditorModal;
