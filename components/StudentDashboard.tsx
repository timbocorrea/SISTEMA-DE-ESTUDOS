
import React from 'react';
import { IUserSession } from '../domain/auth';

interface StudentDashboardProps {
  session: IUserSession;
  onCourseClick: (id: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ session, onCourseClick }) => {
  const courses = [
    { 
      id: 'course-1', 
      title: 'Introdução ao Desenvolvimento Web...', 
      category: 'Tecnologia', 
      instructor: 'Sarah Johnson', 
      rating: '4.9', 
      duration: '24h', 
      img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
      progress: 0
    },
    { 
      id: 'course-2', 
      title: 'Fundamentos de UI/UX Design', 
      category: 'Design', 
      instructor: 'Michael Chen', 
      rating: '4.7', 
      duration: '12h', 
      img: 'https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?auto=format&fit=crop&w=400&q=80',
      progress: 65
    },
    { 
      id: 'course-3', 
      title: 'Marketing Digital Estratégico', 
      category: 'Marketing', 
      instructor: 'Emily Davis', 
      rating: '4.8', 
      duration: '18h', 
      img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
      progress: 0
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1e293b] to-[#334155] dark:from-[#0f172a] dark:to-[#1e293b] rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl transition-all">
        <div className="relative z-10 space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">Bem-vindo de volta, {session.user.name.split(' ')[0]}!</h2>
          <p className="text-slate-300 text-lg max-w-xl">Continue sua jornada de aprendizado. Você tem 3 cursos em andamento.</p>
        </div>
        <div className="absolute right-[-10%] top-[-50%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="Buscar cursos, tópicos ou instrutores..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-600 dark:text-slate-300 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2">
          {['Todos', 'Tecnologia', 'Marketing', 'Design', 'Negócios'].map(cat => (
            <button key={cat} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${cat === 'Todos' ? 'bg-[#0084ff] text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cursos Disponíveis</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            Ordenar por: 
            <select className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none">
              <option>Recomendados</option>
              <option>Novos</option>
            </select>
          </div>
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
                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest w-fit">
                  {course.category}
                </span>
                <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight min-h-[3rem]">{course.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">Aprenda com especialistas os conceitos fundamentais do mercado.</p>
                
                <div className="flex items-center gap-3 py-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.instructor}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" alt={course.instructor} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{course.instructor}</span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                   <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                      <i className="far fa-clock"></i> {course.duration}
                   </div>
                   <button onClick={() => onCourseClick(course.id)} className="text-[#0084ff] dark:text-blue-400 font-bold text-sm hover:underline">
                      Detalhes
                   </button>
                </div>

                {course.progress > 0 && (
                   <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                         <span>{course.progress}% Concluído</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 rounded-full" style={{ width: `${course.progress}%` }}></div>
                      </div>
                   </div>
                )}

                <button 
                  onClick={() => onCourseClick(course.id)}
                  className={`w-full py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
                    course.progress > 0 
                      ? 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-none' 
                      : 'bg-[#0084ff] text-white hover:bg-blue-600 shadow-blue-500/20'
                  }`}
                >
                  {course.progress > 0 ? 'Continuar' : 'Começar Agora'}
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
