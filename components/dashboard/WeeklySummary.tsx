import React from 'react';
import { BarChart, ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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

    // Chart colors - Neon Palette
    const barColor = '#818cf8'; // indigo-400
    const progressColors = ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171'];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 ml-1 text-shadow-sm">
                Dados Gráficos
            </h3>

            {/* Stats Cards - Vertical Stack for Sidebar */}
            <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm hover:bg-slate-200 dark:hover:bg-black/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center ring-1 ring-indigo-500/20">
                            <i className="fas fa-fire text-lg drop-shadow-md"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">XP Esta Semana</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{totalXpThisWeek}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-sm hover:bg-black/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                            <i className="fas fa-trophy text-lg drop-shadow-md"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Cursos Concluídos</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{coursesCompleted}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-sm hover:bg-black/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center ring-1 ring-violet-500/20">
                            <i className="fas fa-chart-line text-lg drop-shadow-md"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Progresso Médio</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{avgProgress}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts - Vertical Stack */}
            <div className="grid grid-cols-1 gap-4">
                {/* XP History Chart */}
                <div className="bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-4 flex items-center justify-between uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-chart-bar text-indigo-400"></i>
                            XP vs Tempo
                        </div>
                        <div className="flex items-center gap-3 text-[9px] lowercase opacity-70">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded bg-[#818cf8]"></span> xp
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full border border-[#34d399]"></span> tempo
                            </div>
                        </div>
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart data={xpHistory}>
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                height={40}
                                tick={({ x, y, payload, index }) => {
                                    const dataItem = xpHistory[index] as any;
                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text x={0} y={0} dy={10} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold">
                                                {payload.value}
                                            </text>
                                            <text x={0} y={0} dy={22} textAnchor="middle" fill="#475569" fontSize={9}>
                                                {dataItem.day}/{dataItem.month}
                                            </text>
                                        </g>
                                    );
                                }}
                            />
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value: any, name: any) => {
                                    if (name === 'xp') return [`${value} XP`, 'Experiência'];
                                    if (name === 'minutes') return [`${value} min`, 'Tempo de Estudo'];
                                    return [value, name];
                                }}
                            />
                            {/* XP Bars */}
                            <Bar yAxisId="left" dataKey="xp" fill={barColor} radius={[4, 4, 4, 4]} barSize={20} />

                            {/* Time Line */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="minutes"
                                stroke="#34d399"
                                strokeWidth={2}
                                dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Course Progress List */}
                <div className="bg-slate-100 dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <i className="fas fa-chart-pie text-violet-400"></i>
                        Progresso
                    </h3>
                    {courseProgress.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {courseProgress.map((course, index) => (
                                <div key={course.courseId} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <p className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                            {course.title}
                                        </p>
                                        <span className="font-bold text-slate-800 dark:text-white">
                                            {course.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]"
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
                        <div className="flex flex-col items-center justify-center h-[150px] text-slate-500/50">
                            <i className="fas fa-book-open text-2xl mb-2 opacity-50"></i>
                            <p className="text-xs font-medium">Sem cursos iniciados</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklySummary;
