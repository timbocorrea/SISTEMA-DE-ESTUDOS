import React, { useState, useEffect } from 'react';
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

// Define a unified interface for display items
interface MaterialItem {
  id: string;
  type: LessonResourceType;
  title: string;
  url: string;
  isMain?: boolean; // To distinguish main lesson content
}

type Props = {
  lesson: Lesson;
  onTrackAction?: (action: string) => void;
};

const LessonMaterialsSidebar: React.FC<Props> = ({ lesson, onTrackAction }) => {
  const resources = lesson.resources;
  const hasMaterials = Boolean(lesson.imageUrl || lesson.audioUrl || resources.length > 0);

  // Define groups order
  const groups: LessonResourceType[] = ['AUDIO', 'IMAGE', 'PDF', 'LINK', 'FILE'];

  // Group materials
  const groupedMaterials: Record<string, MaterialItem[]> = {
    AUDIO: [],
    IMAGE: [],
    PDF: [],
    LINK: [],
    FILE: []
  };

  // Add Main Audio
  if (lesson.audioUrl) {
    groupedMaterials.AUDIO.push({
      id: 'main-audio',
      type: 'AUDIO',
      title: 'Áudio da Aula',
      url: lesson.audioUrl,
      isMain: true
    });
  }

  // Add Main Image
  if (lesson.imageUrl) {
    groupedMaterials.IMAGE.push({
      id: 'main-image',
      type: 'IMAGE',
      title: 'Capa da Aula',
      url: lesson.imageUrl,
      isMain: true
    });
  }

  // Add Attachments
  resources.forEach(r => {
    if (groupedMaterials[r.type]) {
      groupedMaterials[r.type].push({
        id: r.id,
        type: r.type,
        title: r.title,
        url: r.url,
        isMain: false
      });
    } else {
      // Fallback for unknown types if any, though types are strict
      groupedMaterials.FILE.push({
        id: r.id,
        type: 'FILE',
        title: r.title,
        url: r.url,
        isMain: false
      });
    }
  });

  // State to control collapsed groups
  // State to control collapsed groups
  // Default all closed per user request
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    AUDIO: false,
    IMAGE: false,
    PDF: false,
    LINK: false,
    FILE: false
  });

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // State for modals
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalPDF, setModalPDF] = useState<string | null>(null);

  // Close modals with ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalImage) setModalImage(null);
        if (modalPDF) setModalPDF(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalImage, modalPDF]);

  // State to track active audio player (accordion style)
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const handleItemClick = (item: MaterialItem) => {
    // Helper to check extensions
    let effectiveType = item.type;
    const lowerUrl = item.url.toLowerCase();

    if (item.type === 'FILE') {
      if (lowerUrl.endsWith('.pdf')) effectiveType = 'PDF';
      else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lowerUrl)) effectiveType = 'IMAGE';
      else if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(lowerUrl)) effectiveType = 'AUDIO';
    }

    switch (effectiveType) {
      case 'AUDIO':
        setActiveAudioId(prev => prev === item.id ? null : item.id);
        if (activeAudioId !== item.id) {
          onTrackAction?.(`Expandiu áudio: ${item.title}`);
        }
        break;
      case 'IMAGE':
        setModalImage(item.url);
        onTrackAction?.(`Visualizou Imagem: ${item.title}`);
        break;
      case 'PDF':
        setModalPDF(item.url);
        onTrackAction?.(`Visualizou PDF: ${item.title}`);
        break;
      case 'LINK':
      case 'FILE':
        window.open(item.url, '_blank');
        onTrackAction?.(`Abriu Link/Arquivo: ${item.title}`);
        break;
    }
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

        {groups.map(type => {
          const items = groupedMaterials[type];
          if (items.length === 0) return null;

          const isExpanded = expandedGroups[type];

          return (
            <div key={type} className="border border-slate-800 rounded-xl overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(type)}
                className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-slate-800' : 'bg-slate-900 hover:bg-slate-800/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <i className={`fas ${iconByType[type as LessonResourceType]} text-indigo-400 w-5 text-center`}></i>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    {labelByType[type as LessonResourceType]}
                  </span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                <i className={`fas fa-chevron-down text-xs text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
              </button>

              {/* Group Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="p-2 space-y-2 bg-slate-900/50">
                  {items.map(item => {
                    // Determine effective type for rendering logic
                    let effectiveType = item.type;
                    const lowerUrl = item.url.toLowerCase();
                    if (item.type === 'FILE') {
                      if (lowerUrl.endsWith('.pdf')) effectiveType = 'PDF';
                      else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lowerUrl)) effectiveType = 'IMAGE';
                      else if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(lowerUrl)) effectiveType = 'AUDIO';
                    }

                    return (
                      <div key={item.id} className="group">
                        {/* Item Card */}
                        <div className={`bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-lg transition-all ${activeAudioId === item.id ? 'bg-slate-800 border-indigo-500/50' : ''}`}>
                          <div className="flex items-start justify-between p-2 gap-2">
                            {/* Icon & Title - Clickable Area */}
                            <div
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              onClick={() => handleItemClick(item)}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${item.isMain || activeAudioId === item.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'}`}>
                                <i className={`fas ${activeAudioId === item.id ? 'fa-chevron-down' : iconByType[effectiveType] || iconByType.FILE}`}></i>
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate transition-colors ${activeAudioId === item.id ? 'text-indigo-400' : 'text-slate-200 group-hover:text-white'}`} title={item.title}>
                                  {item.title}
                                </p>
                                {item.isMain && (
                                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider border border-indigo-500/20 px-1 rounded">
                                    Principal
                                  </span>
                                )}
                                {effectiveType === 'AUDIO' && (
                                  <span className="text-[10px] text-slate-500 ml-2">
                                    {activeAudioId === item.id ? 'Clique para fechar' : 'Clique para ouvir'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Open/View Action */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(item);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              title={effectiveType === 'LINK' || effectiveType === 'FILE' ? "Abrir Link/Arquivo" : "Visualizar/Ouvir"}
                            >
                              <i className={`fas ${effectiveType === 'LINK' || effectiveType === 'FILE' ? 'fa-external-link-alt' : effectiveType === 'AUDIO' ? (activeAudioId === item.id ? 'fa-stop' : 'fa-play') : 'fa-eye'} text-xs`}></i>
                            </button>
                          </div>

                          {/* Dropdowns / Content Area */}

                          {/* Audio Player Dropdown */}
                          {effectiveType === 'AUDIO' && (
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeAudioId === item.id ? 'max-h-20 opacity-100 border-t border-slate-700/50' : 'max-h-0 opacity-0'}`}>
                              <div className="p-2 bg-slate-900/40">
                                <audio
                                  controls
                                  src={item.url}
                                  className="w-full h-8"
                                  autoPlay={activeAudioId === item.id}
                                  onPlay={() => onTrackAction?.(`Iniciou áudio material: ${item.title}`)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* Modal de Visualização de Imagem */}
      {modalImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <img
              src={modalImage || ''}
              alt="Visualização em tamanho real"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
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
            <button
              onClick={() => setModalPDF(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
              title="Fechar (ESC)"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <iframe
              src={modalPDF || ''}
              className="w-full h-full rounded-lg shadow-2xl bg-white"
              title="Visualização de PDF em tela cheia"
              onClick={(e) => e.stopPropagation()}
            />
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

