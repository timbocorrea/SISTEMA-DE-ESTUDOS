import React from 'react';

interface HistoryPageProps {
    history: string[];
}

const HistoryPage: React.FC<HistoryPageProps> = ({ history }) => {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <i className="fas fa-history text-2xl"></i>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Histórico de Atividades</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Seus últimos 50 passos na plataforma.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {history.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        <i className="fas fa-wind text-4xl mb-3 opacity-50"></i>
                        <p>Nenhuma atividade registrada ainda.</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 z-0"></div>

                        <ul className="relative z-10">
                            {history.map((item, index) => (
                                <li key={index} className="flex items-start gap-4 p-6 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors last:border-0 group">
                                    <div className="w-4 h-4 mt-1.5 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform"></div>

                                    <div className="flex-1">
                                        <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                                            {item}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
