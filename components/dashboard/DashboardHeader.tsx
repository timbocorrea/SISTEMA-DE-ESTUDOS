import React from 'react';
import { User } from '../../domain/entities';

interface DashboardHeaderProps {
    user: User;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
    return (
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                    Olá, {user.name.split(' ')[0]}! 👋
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Aqui está seu resumo da semana
                </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
                {user.lastAccess && (
                    <div className="text-right border-r border-slate-200 dark:border-slate-800 pr-6">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Último Acesso</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {new Intl.DateTimeFormat('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }).format(user.lastAccess)}
                        </p>
                    </div>
                )}
                <div className="flex items-center">
                    <div className="px-5 py-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center gap-3 text-white shadow-lg shadow-indigo-500/20 rotate-1 hover:rotate-0 transition-all duration-300 border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Nível Atual</span>
                        <span className="text-2xl font-black leading-none">{user.level}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
