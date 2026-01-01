import React, { useEffect, useState } from 'react';
import { XpLogRecord } from '../domain/admin';
import { AdminService } from '../services/AdminService';

interface AdminStudentHistoryProps {
    userId: string;
    adminService: AdminService;
}

export const AdminStudentHistory: React.FC<AdminStudentHistoryProps> = ({ userId, adminService }) => {
    const [history, setHistory] = useState<XpLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const data = await adminService.getXpHistory(userId);
                setHistory(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar histórico.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchHistory();
        }
    }, [userId, adminService]);

    if (loading) return <div className="text-gray-400 text-sm">Carregando histórico...</div>;
    if (error) return <div className="text-red-400 text-sm">{error}</div>;
    if (history.length === 0) return <div className="text-gray-400 text-sm italic">Nenhum registro encontrado.</div>;

    return (
        <div className="mt-4">
            <h3 className="text-md font-semibold text-gray-200 mb-2">Histórico de Progressão</h3>
            <div className="overflow-x-auto border border-gray-700 rounded-md">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ação</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">XP</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Descrição</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-700">
                        {history.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-cyan-400 font-mono">
                                    {log.action_type}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-400 font-bold">
                                    +{log.amount} XP
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-400">
                                    {log.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
