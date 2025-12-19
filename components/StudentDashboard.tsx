
import React from 'react';
import { User } from '../domain/entities';

interface StudentDashboardProps {
  user: User;
  onCourseClick: (id: string) => void;
}

const GamificationHeader: React.FC<{ user: User }> = ({ user }) => {
  const currentLevelXp = user.getXpThresholdForLevel(user.level);
  const nextLevelXp = user.getXpThresholdForLevel(user.level + 1);
  const xpInLevel = user.xp - currentLevelXp;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min((xpInLevel / xpRequiredForNext) * 100, 100);

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-indigo-500/30 group">
      {/* Decorative Glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        {/* Level Badge */}
        <div className="flex-shrink-0 relative">
          <div className="w-24 h-24 bg-indigo-600 rounded-2xl rotate-3 flex items-center justify-center border-2 border-indigo-400 shadow-lg shadow-indigo-500/40">
            <span className="text-4xl font-black rotate-[-3deg]">{user.level}</span>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-cyan-400 text-slate-900 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
            Nível
          </div>
        </div>

        {/* Info & Progress */}
        <div className="flex-1 space-y-4 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Status do Aluno: {user.name}</h2>
              <p className="text-indigo-300 text-sm font-medium">ADS Case Study | Engenharia de Software</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white">{user.xp}</span>
              <span className="text-indigo-400 text-xs font-bold uppercase ml-2 tracking-widest">XP Total</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
              <span>Progresso do Nível</span>
              <span>{Math.floor(xpInLevel)} / {xpRequiredForNext} XP para Lvl {user.level + 1}</span>
            </div>
            <div className="h-4 bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="hidden lg:flex flex-col gap-2">
           <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
              <i className="fas fa-trophy text-yellow-500 text-lg"></i>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Conquistas</p>
                <p className="text-sm font-bold">{user.achievements.length}</p>
              </div>
           </div>
           <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
              <i className="fas fa-fire text-orange-500 text-lg"></i>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Ofensiva</p>
                <p className="text-sm font-bold">5 Dias</p>
              </div>
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
      <GamificationHeader user={user} />

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <i className="fas fa-book-reader text-indigo-500"></i>
            Seus Cursos de ADS
          </h3>
          <button className="text-indigo-500 text-sm font-bold hover:underline">Ver catálogo completo</button>
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
                <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit">
                  {course.category}
                </span>
                <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-indigo-600 transition-colors">{course.title}</h4>
                
                <div className="flex items-center gap-3 py-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" alt={course.instructor} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Instrutor: {course.instructor}</span>
                </div>

                <div className="space-y-1.5 mt-auto">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Progresso: {course.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${course.progress}%` }}></div>
                  </div>
                </div>

                <button 
                  onClick={() => onCourseClick(course.id)}
                  className={`w-full py-3 mt-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                    course.progress > 0 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-none' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'
                  }`}
                >
                  {course.progress > 0 ? 'Continuar Estudando' : 'Iniciar Aula +150 XP'}
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
