import React from 'react';

interface PendingApprovalScreenProps {
    userEmail: string;
    onLogout: () => void;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ userEmail, onLogout }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                {/* Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Header com gradiente */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-center">
                        <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                            <i className="fas fa-clock text-4xl text-white"></i>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            Aguardando Aprovação
                        </h1>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-8 space-y-6">
                        <div className="text-center space-y-3">
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                                Sua conta foi criada com sucesso!
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                Porém, ela está aguardando aprovação de um administrador para acessar a plataforma.
                                Você receberá uma notificação por e-mail assim que sua conta for aprovada.
                            </p>
                        </div>

                        {/* Info do usuário */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-user text-indigo-600 dark:text-indigo-400"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Conta pendente
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {userEmail}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Informações adicionais */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <i className="fas fa-info-circle text-indigo-500 mt-1 flex-shrink-0"></i>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    O processo de aprovação pode levar até 24 horas durante dias úteis.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <i className="fas fa-envelope text-indigo-500 mt-1 flex-shrink-0"></i>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Verifique sua caixa de entrada (e spam) para atualizações sobre sua conta.
                                </p>
                            </div>
                        </div>

                        {/* Botão de logout */}
                        <button
                            onClick={onLogout}
                            className="w-full mt-6 px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            Sair
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
                    Precisa de ajuda? Entre em contato com nosso suporte.
                </p>
            </div>
        </div>
    );
};

export default PendingApprovalScreen;
