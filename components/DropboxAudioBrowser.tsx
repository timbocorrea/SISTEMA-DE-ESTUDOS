import React, { useState, useRef, useEffect } from 'react';
import DropboxChooser from 'react-dropbox-chooser';

interface DropboxFile {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  isDir: boolean;
}

interface DropboxAudioBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudio: (url: string, filename: string) => void;
  appKey: string;
}

const DropboxAudioBrowser: React.FC<DropboxAudioBrowserProps> = ({
  isOpen,
  onClose,
  onSelectAudio,
  appKey
}) => {
  const [selectedFile, setSelectedFile] = useState<DropboxFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Converter Preview Link para Direct Download URL
  const convertToDirectLink = (previewLink: string): string => {
    if (previewLink.includes('dl=0')) {
      return previewLink.replace('dl=0', 'dl=1');
    }
    const separator = previewLink.includes('?') ? '&' : '?';
    return `${previewLink}${separator}dl=1`;
  };

  // Handler para quando arquivos são selecionados do Dropbox
  const handleSuccess = (files: any[]) => {
    console.log('📦 Arquivos selecionados do Dropbox:', files);
    
    // Filtrar apenas arquivos de áudio
    const audioFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '');
    });

    if (audioFiles.length === 0) {
      alert('⚠️ Nenhum arquivo de áudio encontrado. Por favor, selecione arquivos MP3, WAV, OGG, M4A, AAC ou FLAC.');
      return;
    }

    // Usar o primeiro arquivo de áudio
    const file = audioFiles[0];
    const directLink = convertToDirectLink(file.link);

    setSelectedFile({
      id: file.id || Date.now().toString(),
      name: file.name,
      link: file.link,
      bytes: file.bytes,
      icon: file.icon,
      isDir: false
    });

    // Configurar preview
    setPreviewUrl(directLink);
  };

  // Preview do áudio
  const handlePreview = () => {
    if (audioRef.current && previewUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Aplicar áudio selecionado
  const handleUseAudio = () => {
    if (selectedFile && previewUrl) {
      onSelectAudio(previewUrl, selectedFile.name);
      onClose();
    }
  };

  // Reset ao fechar
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPlaying(false);
    onClose();
  };

  // Atualizar estado de reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <i className="fab fa-dropbox text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Dropbox - Selecionar Áudio
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Selecione um arquivo de áudio do seu Dropbox
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
            title="Fechar"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-240px)] overflow-y-auto">
          {/* Dropbox Chooser Button */}
          {!selectedFile ? (
            <div className="text-center py-12">
              <div className="mb-6">
                <i className="fab fa-dropbox text-6xl text-blue-500 mb-4"></i>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Conecte-se ao Dropbox
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Clique no botão abaixo para selecionar um arquivo de áudio
                </p>
              </div>

              <DropboxChooser
                appKey={appKey}
                success={handleSuccess}
                cancel={() => console.log('Seleção cancelada')}
                multiselect={false}
                extensions={['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']}
                linkType="preview"
              >
                <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/30">
                  <i className="fab fa-dropbox mr-2"></i>
                  Conectar ao Dropbox
                </button>
              </DropboxChooser>

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Formatos suportados: MP3, WAV, OGG, M4A, AAC, FLAC
              </p>
            </div>
          ) : (
            <>
              {/* Selected File Info */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <i className="fas fa-check-circle text-green-500 text-xl mt-1"></i>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                      Arquivo Selecionado
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Tamanho: {(selectedFile.bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (audioRef.current) {
                        audioRef.current.pause();
                      }
                      setIsPlaying(false);
                    }}
                    className="px-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Trocar
                  </button>
                </div>
              </div>

              {/* Audio Preview Player */}
              {previewUrl && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                    🎧 Preview do Áudio
                  </h4>
                  
                  <audio ref={audioRef} src={previewUrl} className="hidden" />

                  <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                      onClick={handlePreview}
                      className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
                    >
                      <i className={`fas fa-${isPlaying ? 'pause' : 'play'} ${!isPlaying ? 'ml-1' : ''}`}></i>
                    </button>

                    {/* File Name */}
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isPlaying ? '▶️ Reproduzindo...' : '⏸️ Pausado'}
                      </p>
                    </div>

                    {/* Volume Icon */}
                    <i className="fas fa-volume-up text-slate-400 text-xl"></i>
                  </div>
                </div>
              )}

              {/* Info Alert */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <i className="fas fa-info-circle text-blue-500 text-sm mt-0.5"></i>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A URL será automaticamente aplicada ao campo de áudio quando você clicar em "Usar Este Áudio"
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            onClick={handleClose}
            className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all active:scale-95"
          >
            <i className="fas fa-times mr-2"></i>
            Cancelar
          </button>
          
          {selectedFile && (
            <button
              onClick={handleUseAudio}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <i className="fas fa-check"></i>
              Usar Este Áudio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DropboxAudioBrowser;
