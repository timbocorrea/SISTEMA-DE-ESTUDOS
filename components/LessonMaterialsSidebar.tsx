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

  // Estado para controlar modal de visualização de imagem
  const [modalImage, setModalImage] = React.useState<string | null>(null);

  // Estado para controlar expansão de cada recurso
  const [expandedResources, setExpandedResources] = React.useState<Record<string, boolean>>({});

  // Estado para controlar modal de visualização de PDF
  const [modalPDF, setModalPDF] = React.useState<string | null>(null);

  // Fechar modal com ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalImage) setModalImage(null);
        if (modalPDF) setModalPDF(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalImage, modalPDF]);

  // Função para toggle da expansão de um recurso
  const toggleResourceExpansion = (resourceId: string) => {
    setExpandedResources(prev => ({
      ...prev,
      [resourceId]: !prev[resourceId]
    }));
  };

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
              className="w-full rounded-xl border border-slate-800 cursor-pointer hover:opacity-80 transition-opacity"
              loading="lazy"
              onClick={() => setModalImage(lesson.imageUrl!)}
              title="Clique para visualizar em tamanho real"
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
              {resources.map(r => {
                const isExpanded = expandedResources[r.id] || false;

                return (
                  <div key={r.id} className="space-y-2">
                    {/* Header do recurso - Agora clicável */}
                    <div
                      className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/30 rounded-xl px-4 py-3 cursor-pointer hover:from-indigo-900/50 hover:to-purple-900/50 transition-all"
                      onClick={() => toggleResourceExpansion(r.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
                          <i className={`fas ${iconByType[r.type]}`}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-100 truncate">{r.title}</p>
                          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                            {labelByType[r.type]}
                          </p>
                        </div>
                        {/* Ícone de chevron indicando estado */}
                        <div className="text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Abrir em nova aba / Baixar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-external-link-alt text-xs"></i>
                      </a>
                    </div>

                    {/* Visualizador inline baseado no tipo - Com animação de slide-down */}
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: isExpanded ? '400px' : '0',
                        opacity: isExpanded ? 1 : 0
                      }}
                    >
                      {r.type === 'PDF' && (
                        <div
                          className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-colors"
                          onClick={() => setModalPDF(r.url)}
                          title="Clique para visualizar em tela cheia"
                        >
                          <iframe
                            src={r.url}
                            className="w-full h-[300px] pointer-events-none"
                            title={r.title}
                          />
                          <div className="bg-slate-700/50 px-3 py-2 text-center">
                            <p className="text-xs text-slate-300">
                              <i className="fas fa-expand-alt mr-2"></i>
                              Clique para visualizar em tela cheia
                            </p>
                          </div>
                        </div>
                      )}

                      {r.type === 'IMAGE' && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-4">
                          <img
                            src={r.url}
                            alt={r.title}
                            className="w-full max-h-[300px] object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                            onClick={() => setModalImage(r.url)}
                            title="Clique para visualizar em tamanho real"
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
                            onClick={(e) => e.stopPropagation()}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização de Imagem */}
      {modalImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            {/* Botão Fechar */}
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            {/* Imagem */}
            <img
              src={modalImage}
              alt="Visualização em tamanho real"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Dica de fechamento */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center whitespace-nowrap">
              Clique fora da imagem ou pressione ESC para fechar
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {modalPDF && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalPDF(null)}
        >
          <div className="relative max-w-7xl w-full h-[90vh]">
            {/* Botão Fechar */}
            <button
              onClick={() => setModalPDF(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            {/* PDF Viewer */}
            <iframe
              src={modalPDF}
              className="w-full h-full rounded-lg shadow-2xl bg-white"
              title="Visualização de PDF em tela cheia"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Dica de fechamento */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center whitespace-nowrap">
              Clique fora do PDF ou pressione ESC para fechar
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonMaterialsSidebar;

