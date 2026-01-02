import React from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface WeeklySummaryProps {
    xpHistory: { date: string; xp: number }[];
    courseProgress: { courseId: string; title: string; progress: number }[];
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({ xpHistory, courseProgress }) => {
    // Calculate stats
    const totalXpThisWeek = xpHistory.reduce((sum, day) => sum + day.xp, 0);
    const coursesCompleted = courseProgress.filter(c => c.progress === 100).length;
    const avgProgress = courseProgress.length > 0
        ? Math.round(courseProgress.reduce((sum, c) => sum + c.progress, 0) / courseProgress.length)
        : 0;

    // Chart colors
    const barColor = '#6366f1'; // indigo-600
    const progressColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                Dados Gráficos
            </h3>

            {/* Stats Cards - Vertical Stack for Sidebar */}
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <i className="fas fa-fire text-lg"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">XP Esta Semana</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{totalXpThisWeek}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <i className="fas fa-trophy text-lg"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Cursos Concluídos</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{coursesCompleted}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <i className="fas fa-chart-line text-lg"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Progresso Médio</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{avgProgress}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts - Vertical Stack */}
            <div className="grid grid-cols-1 gap-4">
                {/* XP History Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-chart-bar text-indigo-600"></i>
                        XP Recente
                    </h3>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={xpHistory}>
                            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '10px' }} tick={{ fontSize: 10 }} />
                            <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tick={{ fontSize: 10 }} width={30} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '12px'
                                }}
                            />
                            <Bar dataKey="xp" fill={barColor} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Course Progress List (Chart alternative for sidebar) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-chart-pie text-purple-600"></i>
                        Progresso
                    </h3>
                    {courseProgress.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {courseProgress.map((course, index) => (
                                <div key={course.courseId} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                            {course.title}
                                        </p>
                                        <span className="font-bold text-slate-600 dark:text-slate-400">
                                            {course.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${course.progress}%`,
                                                backgroundColor: progressColors[index % progressColors.length]
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[150px] text-slate-400">
                            <i className="fas fa-book-open text-2xl mb-2 opacity-50"></i>
                            <p className="text-xs">Sem cursos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklySummary;
