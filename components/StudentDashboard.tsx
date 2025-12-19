
import React from 'react';
import { User } from '../domain/entities';

interface StudentDashboardProps {
  user: User;
  onCourseClick: (id: string) => void;
}

const GamificationStats: React.FC<{ user: User }> = ({ user }) => {
  // Cálculo do progresso no ciclo de 1000 XP do nível atual
  const xpInLevel = user.xp % 1000;
  const progressPercent = (xpInLevel / 1000) * 100;
  const xpRemaining = 1000 - xpInLevel;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 mb-8 transition-all hover:shadow-md">
      {/* Badge Circular de Nível */}
      <div className="relative flex-shrink-0">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 border-4 border-white dark:border-slate-800">
          <div className="text-center">
            <span className="block text-3xl font-black text-white leading-none">{user.level}</span>
            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-tighter">Nível</span>
          </div>
        </div>
        {/* Anel de Progresso Circular */}
        <svg className="absolute top-0 left-0 w-24 h-24 -rotate-90 pointer-events-none overflow-visible">
          <circle
            cx="48"
            cy="48"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-indigo-500/10"
          />
          <circle
            cx="48"
            cy="48"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="314.159"
            strokeDashoffset={314.159 - (314.159 * progressPercent) / 100}
            strokeLinecap="round"
            className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000"
          />
        </svg>
      </div>

      {/* Info de Experiência */}
      <div className="flex-1 w-full space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <i className="fas fa-bolt text-yellow-500"></i>
              Sua Progressão Acadêmica
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-tight">
              XP Total: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user.xp.toLocaleString()}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              Próximo Nível: {xpRemaining} XP
            </div>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.floor(progressPercent)}%</span>
          </div>
        </div>

        {/* Barra de Progresso Horizontal */}
        <div className="relative w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden p-1 border border-slate-200 dark:border-slate-700 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-xl transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="hidden lg:grid grid-cols-1 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
            <i className="fas fa-fire"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ofensiva</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">5 Dias</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onCourseClick }) => {
  const courses = [
    { 
      id: 'course-1', 
      title: 'Engenharia de Software Moderna', 
      category: 'Tecnologia', 
      instructor: 'Dr. Sarah Smith', 
      rating: '4.9', 
      duration: '40h', 
      img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
      progress: 15
    },
    { 
      id: 'course-2', 
      title: 'Arquitetura de Sistemas Escalonáveis', 
      category: 'Infraestrutura', 
      instructor: 'Michael Tech', 
      rating: '4.7', 
      duration: '25h', 
      img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&w=400&q=80',
      progress: 0
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">Dashboard de ADS</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Bem-vindo de volta, {user.name.split(' ')[0]}!</p>
        </div>
      </div>

      <GamificationStats user={user} />

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <i className="fas fa-graduation-cap text-indigo-500"></i>
            Meus Cursos Ativos
          </h3>
          <button className="text-indigo-500 text-sm font-bold hover:underline">Explorar mais</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => (
            <div key={course.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:border-slate-700 transition-all group flex flex-col">
              <div className="relative aspect-video">
                <img src={course.img} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1 shadow-sm">
                  <i className="fas fa-star text-yellow-500"></i> {course.rating}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col space-y-4">
                <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit">
                  {course.category}
                </span>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-indigo-600 transition-colors">{course.title}</h4>
                
                <div className="flex items-center gap-3 py-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" alt={course.instructor} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Instrutor: {course.instructor}</span>
                </div>

                <div className="space-y-1.5 mt-auto">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Progresso: {course.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${course.progress}%` }}></div>
                  </div>
                </div>

                <button 
                  onClick={() => onCourseClick(course.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 mt-4 rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-sm uppercase tracking-wider"
                >
                  Continuar Aprendizado
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
