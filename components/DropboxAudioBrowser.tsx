import React, { useState, useRef, useEffect } from 'react';
import { DropboxService, DropboxItem } from '../services/dropbox/DropboxService';

export interface DropboxFile {
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
  initialFile?: DropboxFile | null;
  variant?: 'modal' | 'panel';
}

const DropboxAudioBrowser: React.FC<DropboxAudioBrowserProps> = ({
  isOpen,
  onClose,
  onSelectAudio,
  variant = 'modal'
}) => {
  // Estado de Autenticação e Navegação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<DropboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de Seleção e Preview
  const [selectedItem, setSelectedItem] = useState<DropboxItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Inicialização
  useEffect(() => {
    if (isOpen) {
      const auth = DropboxService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) {
        loadFolder(currentPath);
      }
    }
  }, [isOpen]);

  // Carregar pasta
  const loadFolder = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const entries = await DropboxService.listFolder(path);

      // Filtrar apenas pastas e arquivos de áudio
      const filtered = entries.filter(item => {
        if (item.tag === 'folder') return true;
        const ext = item.name.split('.').pop()?.toLowerCase();
        return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '');
      });

      // Ordenar: Pastas primeiro, depois arquivos
      filtered.sort((a, b) => {
        if (a.tag === b.tag) return a.name.localeCompare(b.name);
        return a.tag === 'folder' ? -1 : 1;
      });

      setItems(filtered);
      setCurrentPath(path);
    } catch (err) {
      console.error(err);
      setError('Falha ao carregar arquivos. Tente reconectar.');
      if ((err as any).message === 'Sessão expirada') {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Autenticação
  const handleLogin = async () => {
    try {
      // Save current URL to return to after auth
      localStorage.setItem('dropbox_return_url', window.location.href);

      // Redirect to Dropbox using the stable Redirect URI
      const authUrl = await DropboxService.getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Erro ao iniciar login:', err);
      // Assuming 'toast' is available globally or imported
      // If not, replace with a simple setError or alert
      // setError('Erro ao conectar com Dropbox');
      // toast.error('Erro ao conectar com Dropbox'); 
    }
  };

  // Navegação
  const handleItemClick = async (item: DropboxItem) => {
    if (item.tag === 'folder') {
      // Entrar na pasta
      loadFolder(item.path_lower || item.id);
    } else {
      // Selecionar arquivo
      setSelectedItem(item);
      setLoading(true);
      try {
        // Obter link temporário
        const link = await DropboxService.getTemporaryLink(item.path_lower || item.id);
        setPreviewUrl(link);
      } catch (err) {
        console.error(err);
        setError('Erro ao obter link do arquivo');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      loadFolder(''); // Raiz
      return;
    }
    // Reconstrói o caminho baseado nos segmentos atuais
    // Obs: Isso é simplificado. O ideal seria manter um array de objetos path/name
    // Para simplicidade, vamos assumir navegação simples ou resetar para raiz
    // Melhor implementação: Botão "Voltar" ou "Raiz"
    loadFolder('');
  };

  const handleBack = () => {
    // Lógica simples para voltar um nível (exige persistência de histórico ou manipulação de string)
    if (currentPath === '') return;

    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    loadFolder(parentPath);
  };

  // Audio Controls
  const togglePreview = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const confirmSelection = () => {
    if (selectedItem && previewUrl) {
      onSelectAudio(previewUrl, selectedItem.name);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Renderização Exclusiva do Painel (Variant Panel)
  // Se precisarmos do modal, podemos manter o código antigo, mas focaremos no Panel
  const isPanel = variant === 'panel';

  return (
    <div className={`absolute top-4 right-0 bottom-4 w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-[100%] opacity-100 z-10' : 'translate-x-[20%] opacity-0 -z-10'} flex flex-col rounded-r-3xl overflow-hidden`}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <i className="fab fa-dropbox text-[#0061FE] text-lg"></i>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Dropbox</h3>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Tela de Login (Se não autenticado) */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-2">
              <i className="fab fa-dropbox text-3xl text-[#0061FE]"></i>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">Conectar Conta</h4>
              <p className="text-xs text-slate-500 mt-2">
                Conecte-se para acessar seus arquivos de áudio diretamente aqui.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-[#0061FE] hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-sign-in-alt"></i>
              Conectar Dropbox
            </button>
          </div>
        ) : (
          // Navegador de Arquivos (Se autenticado)
          <div className="flex-1 flex flex-col h-full">

            {/* Barra de Navegação */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              {currentPath !== '' && (
                <button onClick={handleBack} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                  {currentPath === '' ? 'Arquivos' : currentPath.split('/').pop()}
                </p>
              </div>
              <button onClick={loadFolder.bind(null, currentPath)} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
                <i className="fas fa-sync-alt text-xs"></i>
              </button>
            </div>

            {/* Lista de Arquivos */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <i className="fas fa-spinner fa-spin text-indigo-500"></i>
                  <span className="text-xs text-slate-400">Carregando...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2 p-4 text-center">
                  <i className="fas fa-exclamation-circle text-2xl"></i>
                  <span className="text-xs font-bold">{error}</span>
                  <button
                    onClick={() => {
                      localStorage.removeItem('dropbox_access_token');
                      setIsAuthenticated(false);
                      handleLogin();
                    }}
                    className="text-[10px] underline mt-2 hover:text-red-700"
                  >
                    Tentar reconectar
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                  <i className="far fa-folder-open text-2xl opacity-50"></i>
                  <span className="text-xs">Pasta vazia</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors group ${selectedItem?.id === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${item.tag === 'folder'
                        ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30'
                        : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30'
                        }`}>
                        <i className={`fas ${item.tag === 'folder' ? 'fa-folder' : 'fa-music'}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${selectedItem?.id === item.id
                          ? 'text-indigo-700 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-200'
                          }`}>
                          {item.name}
                        </p>
                        {item.size && (
                          <p className="text-[10px] text-slate-400">
                            {(item.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        )}
                      </div>
                      {item.tag === 'folder' && (
                        <i className="fas fa-chevron-right text-xs text-slate-300 group-hover:text-slate-400"></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview e Ação */}
            {selectedItem && selectedItem.tag === 'file' && (
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {loading && !previewUrl ? (
                  <div className="h-10 flex items-center justify-center text-xs text-slate-400">
                    <i className="fas fa-circle-notch fa-spin mr-2"></i> Preparando...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <audio ref={audioRef} src={previewUrl || ''} onEnded={() => setIsPlaying(false)} className="hidden" />

                    <div className="flex gap-2">
                      <button
                        onClick={togglePreview}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"
                      >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        {isPlaying ? 'Pausar' : 'Ouvir'}
                      </button>
                      <button
                        onClick={confirmSelection}
                        className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        Usar Arquivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropboxAudioBrowser;
