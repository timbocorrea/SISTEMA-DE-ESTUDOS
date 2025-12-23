import React from 'react';
import { Lesson, LessonResourceType } from '../domain/entities';

const iconByType: Record<LessonResourceType, string> = {
  PDF: 'fa-file-pdf',
  LINK: 'fa-link',
  AUDIO: 'fa-headphones',
  IMAGE: 'fa-image',
  FILE: 'fa-paperclip'
};

const labelByType: Record<LessonResourceType, string> = {
  PDF: 'PDF',
  LINK: 'Link',
  AUDIO: 'Áudio',
  IMAGE: 'Imagem',
  FILE: 'Arquivo'
};

type Props = {
  lesson: Lesson;
};

const LessonMaterialsSidebar: React.FC<Props> = ({ lesson }) => {
  const resources = lesson.resources;
  const hasMaterials = Boolean(lesson.imageUrl || lesson.audioUrl || resources.length > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[500px] overflow-hidden">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <i className="fas fa-folder-open"></i>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Materiais da Aula</h3>
          <p className="text-[10px] text-slate-400">Texto, áudio, imagem e anexos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMaterials && (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600 mb-3">
              <i className="fas fa-box-open text-xl"></i>
            </div>
            <p className="text-xs text-slate-500">Nenhum material adicional foi publicado para esta aula.</p>
          </div>
        )}

        {lesson.imageUrl && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagem</p>
            <img
              src={lesson.imageUrl}
              alt="Imagem da aula"
              className="w-full rounded-xl border border-slate-800"
              loading="lazy"
            />
          </div>
        )}

        {lesson.audioUrl && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Áudio</p>
            <audio controls src={lesson.audioUrl} className="w-full" />
          </div>
        )}



        {resources.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexos</p>
            <div className="space-y-4">
              {resources.map(r => (
                <div key={r.id} className="space-y-2">
                  {/* Header do recurso */}
                  <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/30 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
                        <i className={`fas ${iconByType[r.type]}`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-100 truncate">{r.title}</p>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                          {labelByType[r.type]}
                        </p>
                      </div>
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                      title="Abrir em nova aba / Baixar"
                    >
                      <i className="fas fa-external-link-alt text-xs"></i>
                    </a>
                  </div>

                  {/* Visualizador inline baseado no tipo */}
                  {r.type === 'PDF' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                      <iframe
                        src={r.url}
                        className="w-full h-[600px]"
                        title={r.title}
                      />
                    </div>
                  )}

                  {r.type === 'IMAGE' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-4">
                      <img
                        src={r.url}
                        alt={r.title}
                        className="w-full rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {r.type === 'AUDIO' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <audio controls src={r.url} className="w-full" />
                    </div>
                  )}

                  {r.type === 'LINK' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-sm underline break-all"
                      >
                        {r.url}
                      </a>
                    </div>
                  )}

                  {r.type === 'FILE' && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                      <i className="fas fa-file text-4xl text-slate-600 mb-2"></i>
                      <p className="text-xs text-slate-400">
                        Clique no ícone <i className="fas fa-external-link-alt"></i> acima para abrir/baixar
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonMaterialsSidebar;

