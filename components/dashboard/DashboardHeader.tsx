import React from 'react';
import { User } from '../../domain/entities';

interface DashboardHeaderProps {
    user: User;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
    return (
        <div className="flex items-center justify-between mb-10">
            <div>
                <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">
                    Olá, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user.name.split(' ')[0]}</span>! 👋
                </h2>
                <p className="text-slate-400 mt-2 font-medium">
                    Aqui está o resumo da sua jornada de aprendizado
                </p>
            </div>
            <div className="hidden md:flex items-center gap-8">
                {user.lastAccess && (
                    <div className="text-right border-r border-white/10 pr-8">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Último Acesso</p>
                        <p className="text-sm font-bold text-slate-200">
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
                    <div className="px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-md flex items-center gap-4 text-white shadow-xl shadow-black/20 border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Nível Atual</span>
                            <span className="text-3xl font-black leading-none bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">{user.level}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/10">
                            <i className="fas fa-trophy text-sm"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
