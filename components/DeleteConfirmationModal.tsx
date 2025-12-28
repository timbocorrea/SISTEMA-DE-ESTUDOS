import React, { useState } from 'react';
import { AdminService } from '../services/AdminService';

interface DeleteConfirmationModalProps {
    userCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ userCount, onConfirm, onCancel }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [step, setStep] = useState<1 | 2>(1);
    const requiredText = 'CONFIRMAR EXCLUSÃO';

    const handleFirstConfirmation = () => {
        setStep(2);
    };

    const handleFinalConfirmation = () => {
        if (confirmationText === requiredText) {
            onConfirm();
        }
    };

    const isValid = confirmationText === requiredText;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border-2 border-red-500">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-red-600 to-orange-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <i className="fas fa-exclamation-triangle text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">⚠️ CONFIRMAÇÃO DE EXCLUSÃO</h3>
                            <p className="text-sm text-red-100">Ação irreversível - Passo {step} de 2</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {step === 1 ? (
                        <>
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                                <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">
                                    ⚠️ ATENÇÃO: Esta ação é permanente e irreversível!
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Você está prestes a <strong>EXCLUIR {userCount} usuário(s)</strong> do sistema.
                                    Todos os dados, progresso, certificados e histórico serão permanentemente removidos.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <i className="fas fa-ban text-red-500 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Dados Perdidos</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Todo o progresso, XP, conquistas e histórico de aprendizado
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fas fa-user-times text-red-500 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Conta Removida</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            O usuário não poderá mais fazer login
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fas fa-database text-red-500 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Sem Recuperação</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Não é possível desfazer esta ação
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                    💡 <strong>Alternativa recomendada:</strong> Considere usar a função "Bloquear" ao invés de excluir.
                                    O bloqueio impede o acesso mas preserva os dados para consulta futura.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                                <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-3">
                                    🔒 Confirmação Final Necessária
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                                    Para confirmar a exclusão de <strong>{userCount} usuário(s)</strong>,
                                    digite exatamente o texto abaixo:
                                </p>
                                <div className="bg-slate-800 dark:bg-slate-950 p-3 rounded-lg mb-4">
                                    <code className="text-red-400 font-mono text-sm font-bold">{requiredText}</code>
                                </div>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={e => setConfirmationText(e.target.value)}
                                    placeholder="Digite o texto de confirmação..."
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                                    autoFocus
                                />
                                {confirmationText && !isValid && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                                        <i className="fas fa-times-circle"></i>
                                        Texto incorreto. Digite exatamente como mostrado acima.
                                    </p>
                                )}
                                {isValid && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                        <i className="fas fa-check-circle"></i>
                                        Texto correto. Você pode prosseguir.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <i className="fas fa-arrow-left mr-2"></i>
                            Cancelar e Voltar
                        </button>
                        {step === 1 ? (
                            <button
                                onClick={handleFirstConfirmation}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-arrow-right"></i>
                                Continuar (Passo 1/2)
                            </button>
                        ) : (
                            <button
                                onClick={handleFinalConfirmation}
                                disabled={!isValid}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-trash-alt"></i>
                                EXCLUIR PERMANENTEMENTE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
