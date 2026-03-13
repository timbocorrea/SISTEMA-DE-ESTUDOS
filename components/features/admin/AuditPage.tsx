import React, { useEffect, useState } from 'react';
import { auditService, AuditLogEntry } from '@/services/AuditService';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedDuration } from '@/components/ui/animated-duration';
import { AuditSessionDetailModal } from '@/components/AuditSessionDetailModal';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const AuditPage: React.FC = () => {
    const { data: rawLogs, loadMore, loading: isLoadingMore, hasMore } = useInfiniteScroll('audit_logs', { 
        pageSize: 50,
        select: 'id, created_at, path, page_title, resource_title, total_duration_seconds, active_duration_seconds'
    });
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    // Initial load
    useEffect(() => {
        loadMore();
    }, [loadMore]);

    // Map raw DB rows to the AuditLogEntry structure expected by the component
    const logs: AuditLogEntry[] = React.useMemo(() => rawLogs.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at,
        path: row.path,
        pageTitle: row.page_title,
        resourceTitle: row.resource_title,
        total_duration_seconds: row.total_duration_seconds,
        active_duration_seconds: row.active_duration_seconds,
        interaction_stats: row.interaction_stats || {},
        events: row.events || [],
        device: 'Unknown'
    })), [rawLogs]);

    const handleRowClick = async (logId: string) => {
        setIsDetailLoading(true);
        const fullDetail = await auditService.getSessionDetail(logId);
        if (fullDetail) {
            setSelectedLog(fullDetail);
        }
        setIsDetailLoading(false);
    };

    const filteredLogs = logs.filter(log => {
        const matchesDate = dateFilter ? log.timestamp.startsWith(dateFilter) : true;
        let matchesStatus = true;

        if (statusFilter !== 'all') {
            const isStudyPage = log.path.startsWith('/course/') || log.path.includes('/lesson/');

            if (!isStudyPage) {
                // If a specific status filter is active, exclude non-study pages as they have no status
                matchesStatus = false;
            } else {
                const score = log.total_duration_seconds > 0
                    ? Math.round(((log.active_duration_seconds || 0) / log.total_duration_seconds) * 100)
                    : 0;
                if (statusFilter === 'productive') matchesStatus = score >= 80;
                else if (statusFilter === 'regular') matchesStatus = score >= 50 && score < 80;
                else if (statusFilter === 'idle') matchesStatus = score < 50;
            }
        }

        return matchesDate && matchesStatus;
    });

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    const getScoreBadge = (score: number) => {
        if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
        if (score >= 50) return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
        return 'bg-red-500/10 border-red-500/30 text-red-400';
    };

    const getFriendlyPageName = (path: string, currentTitle: string, resourceTitle?: string) => {
        // Priority Mappings
        if (path === '/' || path === '') return 'Dashboard';
        if (path === '/courses') return 'Meus Cursos';
        if (path === '/history') return 'Histórico';
        if (path === '/achievements') return 'Conquistas';
        if (path === '/audit') return 'Auditoria (Pais)';
        if (path === '/profile') return 'Meu Perfil';
        if (path === '/settings') return 'Configurações';
        if (path.startsWith('/admin')) return 'Administração';

        if (path.startsWith('/course/')) {
            return resourceTitle ? `Sala de Aula: ${resourceTitle}` : 'Sala de Aula';
        }

        // Helper for raw paths that might have slipped in as titles
        if (currentTitle.startsWith('/')) {
            if (currentTitle.includes('course')) return 'Sala de Aula';
            return currentTitle; // Keep distinct if unknown
        }

        return currentTitle;
    };

    const isProductiveStudyPage = (path: string) => {
        return path.startsWith('/course/') || path.includes('/lesson/');
    };

    // Filters application
    // Note: since we use infinite scroll, filters apply to loaded data.
    // In a fully robust infinite scroll with filters, filters would be passed to the hook.
    // This is kept here for pure UI filtering on loaded chunks as per previous logic.

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <i className="fas fa-shield-alt text-indigo-500"></i>
                        Auditoria de Atividade
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Monitoramento detalhado de permanência e engajamento para validação acadêmica.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 bg-white dark:bg-[#0a0e14]/50 p-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md">
                    <div className="relative">
                        <i className="fas fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="date"
                            className="bg-slate-100 dark:bg-white/5 border-none rounded-lg py-2 pl-9 pr-3 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <i className="fas fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <select
                            className="bg-slate-100 dark:bg-white/5 border-none rounded-lg py-2 pl-9 pr-8 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none min-w-[140px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Todos os Status</option>
                            <option value="productive">Produtivo (Verde)</option>
                            <option value="regular">Regular (Amarelo)</option>
                            <option value="idle">Ocioso/AFK (Vermelho)</option>
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                    </div>

                    {(dateFilter || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setDateFilter(''); setStatusFilter('all'); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Limpar Filtros"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    )}
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0a0e14]/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <i className="fas fa-history text-xl"></i>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Total Registrado</p>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <NumberTicker value={filteredLogs.length} /> <span className="text-sm font-medium opacity-50">sessões</span>
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a0e14]/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <i className="fas fa-clock text-xl"></i>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Tempo Útil (Engajado)</p>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                <AnimatedDuration seconds={filteredLogs.reduce((acc, log) => acc + (log.active_duration_seconds || 0), 0)} />
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0a0e14]/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                            <i className="fas fa-bed text-xl"></i>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Tempo Ocioso (AFK)</p>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                <AnimatedDuration seconds={filteredLogs.reduce((acc, log) => acc + (log.total_duration_seconds - (log.active_duration_seconds || 0)), 0)} />
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Table */}
            <div className="bg-white dark:bg-[#0a0e14]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/5 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Horário</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Local / Página</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">Duração Total</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">Atividade Real</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        Nenhuma atividade encontrada com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => handleRowClick(log.id)}
                                        className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer ${isDetailLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                            <span className="opacity-50 ml-2">{new Date(log.timestamp).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-white">
                                                    {getFriendlyPageName(log.path, log.pageTitle, log.resourceTitle)}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono opacity-70 truncate max-w-[200px]">{log.path}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">
                                            {formatDuration(log.total_duration_seconds)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono">
                                            {isProductiveStudyPage(log.path) ? (
                                                <>
                                                    {(() => {
                                                        const score = log.total_duration_seconds > 0
                                                            ? Math.round(((log.active_duration_seconds || 0) / log.total_duration_seconds) * 100)
                                                            : 0;
                                                        return (
                                                            <>
                                                                <span className={getScoreColor(score)}>
                                                                    {formatDuration(log.active_duration_seconds || 0)}
                                                                </span>
                                                                <div className="w-16 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                                        style={{ width: `${score}%` }}
                                                                    ></div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 opacity-60">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isProductiveStudyPage(log.path) ? (
                                                (() => {
                                                    const score = log.total_duration_seconds > 0
                                                        ? Math.round(((log.active_duration_seconds || 0) / log.total_duration_seconds) * 100)
                                                        : 0;
                                                    return (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${getScoreBadge(score)}`}>
                                                            {score >= 80 ? 'Produtivo' : score >= 50 ? 'Regular' : 'Ocioso/AFK'}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 opacity-60">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More Button */}
                {hasMore && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/[0.02]">
                        <button
                            onClick={() => loadMore()}
                            disabled={isLoadingMore}
                            className="px-6 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoadingMore ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-chevron-down"></i>}
                            {isLoadingMore ? 'Carregando...' : 'Carregar Mais Logs'}
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes da Sessão */}
            {selectedLog && (
                <AuditSessionDetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
};

export default AuditPage;
