
import React from 'react';

const AdminContentManagement: React.FC = () => {
  const stats = [
    { label: 'Total de Itens', value: '1.248', growth: '+5%', icon: 'fas fa-archive', color: 'bg-blue-600/10 text-blue-500' },
    { label: 'Vídeos', value: '450', growth: '+12%', icon: 'fas fa-play-circle', color: 'bg-purple-600/10 text-purple-500' },
    { label: 'Textos', value: '720', growth: '+2%', icon: 'fas fa-file-alt', color: 'bg-orange-600/10 text-orange-500' },
    { label: 'Rascunhos', value: '12', growth: '0%', icon: 'fas fa-edit', color: 'bg-slate-600/10 text-slate-500' },
  ];

  const contentItems = [
    { id: '#84920', title: 'Introdução à Mecânica Quântica', course: 'Física Avançada', type: 'Vídeo', status: 'Publicado', date: 'Há 2 horas' },
    { id: '#73312', title: 'Teorema de Pitágoras: Casos Reais', course: 'Matemática I', type: 'Texto', status: 'Rascunho', date: 'Ontem, 14:30' },
    { id: '#11294', title: 'Renascimento Italiano: Parte 1', course: 'História da Arte', type: 'Vídeo', status: 'Publicado', date: '24/10/2023' },
    { id: '#55910', title: 'Podcast: Entrevista com Físico', course: 'Física Avançada', type: 'Áudio', status: 'Publicado', date: '23/10/2023' },
    { id: '#99212', title: 'Exercícios Práticos: Leis de Newton', course: 'Física Avançada', type: 'Texto', status: 'Revisão', date: '20/10/2023' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Publicado': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Rascunho': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Revisão': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Vídeo': return 'fa-play-circle text-purple-500 bg-purple-500/10';
      case 'Texto': return 'fa-file-alt text-orange-500 bg-orange-500/10';
      case 'Áudio': return 'fa-headphones text-blue-500 bg-blue-500/10';
      default: return 'fa-file';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-transparent min-h-full transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
            Home / Painel / <span className="text-slate-800 dark:text-white">Gestão de Conteúdo</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciamento de Conteúdo</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Organize e publique materiais didáticos.</p>
        </div>
        <button className="bg-[#0084ff] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
          <i className="fas fa-plus"></i> Novo Conteúdo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between group hover:border-blue-500/30 transition-all shadow-sm">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</span>
                <span className={`text-[10px] font-bold ${stat.growth.startsWith('+') ? 'text-green-500' : 'text-slate-500'}`}>{stat.growth}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${stat.color}`}>
              <i className={stat.icon}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Buscar por título, ID ou tag..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <select className="bg-slate-50 dark:bg-[#0a0e14] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-bold outline-none">
               <option>Todos os Cursos</option>
             </select>
             <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0a0e14] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button className="p-2 bg-blue-600 rounded-lg text-white text-xs"><i className="fas fa-list"></i></button>
                <button className="p-2 text-slate-400 dark:text-slate-500 text-xs hover:text-blue-500"><i className="fas fa-th-large"></i></button>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Conteúdo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Curso</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contentItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${getTypeIcon(item.type)}`}>
                          <i className={`fas ${getTypeIcon(item.type).split(' ')[1]}`}></i>
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {item.id}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.course}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                       <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                       {item.status}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{item.date}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminContentManagement;
