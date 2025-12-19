
import React from 'react';
import { IUserSession } from '../domain/auth';

interface StudentDashboardProps {
  session: IUserSession;
  onCourseClick: (id: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ session, onCourseClick }) => {
  // Mock data for the case study
  const userStats = {
    xp: 2450,
    level: 3,
    xpToNext: 3000,
    achievements: [
      { id: '1', title: 'Primeiro Código', icon: 'fas fa-code' },
      { id: '2', title: 'Mestre POO', icon: 'fas fa-cube' },
    ]
  };

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

  const xpProgress = ((userStats.xp % 1000) / 1000) * 100;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Gamified Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl border border-indigo-500/20 transition-all">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight">Bem-vindo, {session.user.name.split(' ')[0]}!</h2>
            <p className="text-slate-300 text-lg max-w-xl">Sua jornada rumo à senioridade continua. Você está quase no nível {userStats.level + 1}.</p>
            
            <div className="flex items-center gap-4">
              {userStats.achievements.map(ach => (
                <div key={ach.id} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 hover:scale-110 transition-transform cursor-help" title={ach.title}>
                  <i className={`${ach.icon} text-indigo-400`}></i>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full md:w-80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Nível {userStats.level}</span>
              <span className="text-xs font-bold text-slate-400">{userStats.xp} / {userStats.xpToNext} XP</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000" 
                style={{ width: `${xpProgress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 text-center font-medium italic">Faltam {userStats.xpToNext - userStats.xp} XP para subir de nível!</p>
          </div>
        </div>
        
        <div className="absolute right-[-10%] top-[-50%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Course Selection */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Seus Cursos de ADS</h3>
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
                <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{course.title}</h4>
                
                <div className="flex items-center gap-3 py-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" alt={course.instructor} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Instrutor: {course.instructor}</span>
                </div>

                {course.progress > 0 && (
                   <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                         <span>{course.progress}% Concluído</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${course.progress}%` }}></div>
                      </div>
                   </div>
                )}

                <button 
                  onClick={() => onCourseClick(course.id)}
                  className={`w-full py-3 mt-auto rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                    course.progress > 0 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-none' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'
                  }`}
                >
                  {course.progress > 0 ? 'Continuar Estudando' : 'Iniciar Aula +100 XP'}
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
