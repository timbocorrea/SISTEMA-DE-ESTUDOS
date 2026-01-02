import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { User } from '../../domain/entities';

interface WeeklySummaryProps {
    user: User;
    xpHistory: { date: string; xp: number }[];
    courseProgress: { courseId: string; title: string; progress: number }[];
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({ user, xpHistory, courseProgress }) => {
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
        <div className="mb-8 space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                        Olá, {user.name.split(' ')[0]}! 👋
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Aqui está seu resumo da semana
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Nível Atual</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{user.level}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                        {user.level}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <i className="fas fa-fire text-xl"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">XP Esta Semana</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{totalXpThisWeek}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <i className="fas fa-trophy text-xl"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Cursos Concluídos</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{coursesCompleted}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <i className="fas fa-chart-line text-xl"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Progresso Médio</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{avgProgress}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* XP History Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-chart-bar text-indigo-600"></i>
                        XP nos Últimos 7 Dias
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={xpHistory}>
                            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff'
                                }}
                            />
                            <Bar dataKey="xp" fill={barColor} radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Course Progress Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-chart-pie text-purple-600"></i>
                        Progresso dos Cursos
                    </h3>
                    {courseProgress.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {courseProgress.map((course, index) => (
                                <div key={course.courseId} className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: progressColors[index % progressColors.length] }}
                                    ></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {course.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${course.progress}%`,
                                                        backgroundColor: progressColors[index % progressColors.length]
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-12 text-right">
                                                {course.progress}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-slate-400">
                            <i className="fas fa-book-open text-4xl mb-2 opacity-50"></i>
                            <p className="text-sm">Nenhum curso inscrito ainda</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklySummary;
