import React, { useState, useRef, useEffect } from 'react';
import { createSupabaseClient } from '../services/supabaseClient';
import { LessonRecord } from '../domain/admin';

interface LessonContentEditorPageProps {
    lesson: LessonRecord;
    onSave: (content: string, metadata?: Partial<LessonRecord>) => Promise<void>;
    onCancel: () => void;
}

const LessonContentEditorPage: React.FC<LessonContentEditorPageProps> = ({
    lesson,
    onSave,
    onCancel
}) => {
    const [content, setContent] = useState(lesson.content || '');
    console.log('🔍 Editor inicializando - lesson.content:', lesson.content);
    console.log('🔍 Estado content:', content);

    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<string[]>([]);
    const [zoom, setZoom] = useState(100);
    const [forceLightMode, setForceLightMode] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);

    // Metadata State
    const [title, setTitle] = useState(lesson.title);
    const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
    const [durationSeconds, setDurationSeconds] = useState(lesson.duration_seconds || 0);
    const [imageUrl, setImageUrl] = useState(lesson.image_url || '');

    // Content Blocks State
    const [blocks, setBlocks] = useState<any[]>(lesson.content_blocks || []);
    const [activeTab, setActiveTab] = useState<'editor' | 'blocks'>('editor');
    const [editingBlockForAudio, setEditingBlockForAudio] = useState<any | null>(null);
    const [tempAudioUrl, setTempAudioUrl] = useState('');

    // Audio Preview State
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    // Audio Upload State
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (activeTab === 'editor' && editorRef.current) {
            if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>') {
                editorRef.current.innerHTML = content;
            }
        }
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [activeTab, content]);

    // Handle clicks to select images or clear selection
    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Image Selection
        if (target.tagName === 'IMG') {
            setSelectedElement(target);
            return;
        }

        // Video Selection (Handle Overlay, Wrapper Config, or Generic Wrapper)
        const isVideoOverlay = target.classList.contains('video-overlay');
        const isVideoWrapper = target.classList.contains('video-wrapper');
        const hasIframeChild = target.tagName === 'DIV' && target.querySelector('iframe');

        if (isVideoOverlay && target.parentElement) {
            setSelectedElement(target.parentElement);
        } else if (isVideoWrapper || hasIframeChild) {
            setSelectedElement(target);
        } else {
            // Only deselect if we clicked something that ISN'T the currently selected element
            // This prevents deselecting when clicking controls inside (though controls are usually outside editor)
            // But we need to allow clicking elsewhere to deselect.
            setSelectedElement(null);
        }
    };

    const handleSelectionChange = () => {
        if (!editorRef.current) return;

        // Check active styles
        const formats: string[] = [];
        if (document.queryCommandState('bold')) formats.push('bold');
        if (document.queryCommandState('italic')) formats.push('italic');
        if (document.queryCommandState('underline')) formats.push('underline');
        if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
        if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
        if (document.queryCommandState('justifyRight')) formats.push('justifyRight');
        if (document.queryCommandState('justifyFull')) formats.push('justifyFull');
        if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList')) formats.push('insertOrderedList');

        setActiveFormats(formats);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const htmlContent = editorRef.current?.innerHTML || '';
            await onSave(htmlContent, {
                title,
                video_url: videoUrl,
                duration_seconds: Number(durationSeconds),
                image_url: imageUrl,
                content_blocks: blocks
            });
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInput = () => {
        const htmlContent = editorRef.current?.innerHTML || '';
        setContent(htmlContent);
    };

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleSelectionChange();
    };

    const resizeElement = (width: string) => {
        if (selectedElement) {
            selectedElement.style.width = width;

            if (width === 'auto') {
                selectedElement.style.width = '';
            }

            handleInput(); // Trigger content update
            // Don't deselect immediately to allow multiple adjustments
        }
    };

    const alignElement = (align: 'left' | 'center' | 'right') => {
        if (!selectedElement) return;

        // Reset common styles
        selectedElement.style.display = '';
        selectedElement.style.margin = '';
        selectedElement.style.float = '';
        selectedElement.style.clear = '';

        if (align === 'center') {
            selectedElement.style.display = 'block';
            selectedElement.style.margin = '0 auto';
        } else if (align === 'left') {
            selectedElement.style.float = 'left';
            selectedElement.style.marginRight = '1rem';
            selectedElement.style.marginBottom = '0.5rem';
        } else if (align === 'right') {
            selectedElement.style.float = 'right';
            selectedElement.style.marginLeft = '1rem';
            selectedElement.style.marginBottom = '0.5rem';
        }

        handleInput();
    };

    const insertYoutubeVideo = () => {
        const input = prompt('Cole a URL do vídeo do YouTube ou o código de incorporação (iframe):');
        if (!input) return;

        let embedHtml = '';

        // Check if it's already an iframe
        if (input.trim().startsWith('<iframe')) {
            embedHtml = `<div class="video-wrapper aspect-video w-full my-4 relative" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
                <div class="video-overlay"></div>
                ${input}
            </div>`;
        } else {
            // Try to extract video ID
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = input.match(regExp);

            if (match && match[2].length === 11) {
                const videoId = match[2];
                embedHtml = `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
                    <div class="video-overlay"></div>
                    <iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                </div><p><br></p>`;
            } else {
                alert('URL do YouTube inválida!');
                return;
            }
        }

        if (embedHtml) {
            execCommand('insertHTML', embedHtml);
        }
    };

    const addBlockFromText = () => {
        const editor = editorRef.current;
        if (!editor) return;

        let paragraphs: string[] = [];
        if (editor.children.length > 0) {
            paragraphs = Array.from(editor.children)
                .map(child => (child as HTMLElement).innerText.trim())
                .filter(text => text.length > 0);
        } else {
            paragraphs = editor.innerText.split(/\n+/).filter(p => p.trim().length > 0);
        }

        if (paragraphs.length === 0) return;

        const newBlocks = paragraphs.map(p => ({
            id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            text: p,
            audioUrl: ''
        }));

        setBlocks([...blocks, ...newBlocks]);
        setActiveTab('blocks');
    };

    const updateBlock = (id: string, updates: any) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[targetIndex];
        newBlocks[targetIndex] = temp;
        setBlocks(newBlocks);
    };

    const openAudioModal = (block: any) => {
        setEditingBlockForAudio(block);
        // Converte a URL existente para garantir formato correto
        const existingUrl = block.audioUrl || '';
        setTempAudioUrl(convertGoogleDriveUrl(existingUrl));
    };

    // Função para converter URLs do Google Drive
    const convertGoogleDriveUrl = (url: string): string => {
        // Detecta URLs do Google Drive no formato de compartilhamento
        const driveShareRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
        const match = url.match(driveShareRegex);

        if (match && match[1]) {
            const fileId = match[1];
            // Usa formato export=open que funciona melhor para streaming
            return `https://drive.google.com/uc?export=open&id=${fileId}`;
        }

        // Retorna a URL original se não for do Google Drive
        return url;
    };

    const handleAudioUrlChange = (url: string) => {
        // Converte automaticamente se for URL do Google Drive
        const convertedUrl = convertGoogleDriveUrl(url);
        setTempAudioUrl(convertedUrl);
    };

    const saveAudioUrl = () => {
        if (editingBlockForAudio) {
            updateBlock(editingBlockForAudio.id, { audioUrl: tempAudioUrl });
            setEditingBlockForAudio(null);
            setTempAudioUrl('');
            // Stop preview if playing
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
            setIsPlayingPreview(false);
        }
    };

    const togglePreviewAudio = () => {
        if (!tempAudioUrl) return;

        console.log('Tentando reproduzir áudio com URL:', tempAudioUrl);

        // Se já está tocando, pausa
        if (isPlayingPreview && previewAudioRef.current) {
            previewAudioRef.current.pause();
            setIsPlayingPreview(false);
            return;
        }

        // Se não está tocando, cria novo áudio e toca
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
        }

        const audio = new Audio(tempAudioUrl);
        previewAudioRef.current = audio;

        audio.onended = () => {
            setIsPlayingPreview(false);
        };

        audio.onerror = () => {
            setIsPlayingPreview(false);
            alert('Erro ao carregar áudio. Verifique se a URL está correta e o arquivo é acessível.');
        };

        audio.play()
            .then(() => setIsPlayingPreview(true))
            .catch(err => {
                console.error('Erro ao reproduzir áudio:', err);
                setIsPlayingPreview(false);
                alert('Erro ao reproduzir áudio. Verifique se a URL está correta.');
            });
    };

    const handleAudioUpload = async (file: File) => {
        try {
            // Validações
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert('Arquivo muito grande! Tamanho máximo: 10MB');
                return;
            }

            const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
            if (!allowedTypes.includes(file.type)) {
                alert('Formato não suportado! Use MP3, WAV, OGG ou M4A');
                return;
            }

            setUploadingAudio(true);
            setUploadProgress(0);

            // Criar client Supabase
            const supabase = createSupabaseClient();

            // Nome único para o arquivo
            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `audio-files/${fileName}`;

            // Upload para Supabase Storage
            const { data, error } = await supabase.storage
                .from('audio-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Erro no upload:', error);
                alert(`Erro ao fazer upload: ${error.message}`);
                setUploadingAudio(false);
                return;
            }

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('audio-files')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            console.log('Upload concluído! URL:', publicUrl);

            // Atualizar URL no estado
            setTempAudioUrl(publicUrl);
            setUploadProgress(100);

            // Limpar estado após 1s
            setTimeout(() => {
                setUploadingAudio(false);
                setUploadProgress(0);
            }, 1000);

        } catch (err) {
            console.error('Erro inesperado:', err);
            alert('Erro inesperado ao fazer upload. Veja o console para detalhes.');
            setUploadingAudio(false);
            setUploadProgress(0);
        }
    };

    // Helper to count words/chars stripping HTML
    const getTextStats = () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const charCount = text.length;
        return { wordCount, charCount };
    };

    const { wordCount, charCount } = getTextStats();

    const ToolbarButton = ({
        icon,
        command,
        value = '',
        title,
        active = false,
        onClick
    }: {
        icon: string;
        command: string;
        value?: string;
        title: string;
        active?: boolean;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick || (() => execCommand(command, value))}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${active
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            title={title}
        >
            <i className={`${icon.includes(' ') ? icon : `fas fa-${icon}`} text-sm`}></i>
        </button>
    );

    const Divider = () => (
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            {/* Header fixo */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="px-8 py-3">
                    <div className="flex items-center justify-between">
                        {/* Título e botão voltar */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onCancel}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
                                title="Voltar sem salvar"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <div className="hidden sm:block">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Editor de Conteúdo</h1>
                                    <button
                                        onClick={() => setShowMetadata(!showMetadata)}
                                        className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${showMetadata
                                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                            }`}
                                    >
                                        <i className="fas fa-cog mr-1"></i>
                                        Config. da Aula
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-sm">
                                    {title}
                                </p>
                            </div>
                        </div>

                        {/* Tabs Centrais */}
                        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'editor'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                    }`}
                            >
                                <i className="fas fa-file-alt mr-2"></i>
                                Texto Rico
                            </button>
                            <button
                                onClick={() => setActiveTab('blocks')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'blocks'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                    }`}
                            >
                                <i className="fas fa-layer-group mr-2"></i>
                                Blocos de Áudio
                                {blocks.length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px]">
                                        {blocks.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Stats e botão salvar */}
                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-font"></i>
                                    <span>{charCount.toLocaleString()} caracteres</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-text-width"></i>
                                    <span>{wordCount.toLocaleString()} palavras</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                                {isSaving ? (
                                    <>
                                        <i className="fas fa-circle-notch animate-spin"></i>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i>
                                        Salvar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar Estilo Google Docs */}
                {activeTab === 'editor' && (
                    <div className="px-8 py-2 bg-slate-50 dark:bg-[#0f1520] border-t border-slate-200 dark:border-slate-800 flex items-center flex-wrap gap-1">
                        {/* Undo/Redo */}
                        <ToolbarButton icon="undo" command="undo" title="Desfazer" />
                        <ToolbarButton icon="redo" command="redo" title="Refazer" />
                        <Divider />

                        {/* Zoom Control */}
                        <div className="flex items-center gap-1 mr-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 px-2">
                            <i className="fas fa-search-plus text-xs text-slate-400 mr-2"></i>
                            <select
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                                title="Zoom"
                            >
                                <option value={50}>50%</option>
                                <option value={75}>75%</option>
                                <option value={90}>90%</option>
                                <option value={100}>100%</option>
                                <option value={125}>125%</option>
                                <option value={150}>150%</option>
                                <option value={200}>200%</option>
                            </select>
                        </div>
                        {/* Dark/Light Mode Toggle */}
                        <button
                            onClick={() => setForceLightMode(!forceLightMode)}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ml-1 ${forceLightMode
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            title={forceLightMode ? "Usar tema do sistema" : "Forçar fundo claro"}
                        >
                            <i className={`fas ${forceLightMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>
                        <Divider />

                        {/* Print - Simulated */}
                        <ToolbarButton icon="print" command="" title="Imprimir" />
                        <Divider />

                        {/* Font Size & Color */}
                        <div className="flex items-center gap-1 mr-2">
                            <select
                                onChange={(e) => execCommand('fontSize', e.target.value)}
                                className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                                defaultValue="3"
                                title="Tamanho da fonte"
                            >
                                <option value="1">Muito Pequeno</option>
                                <option value="2">Pequeno</option>
                                <option value="3">Normal</option>
                                <option value="4">Médio</option>
                                <option value="5">Grande</option>
                                <option value="6">Muito Grande</option>
                                <option value="7">Enorme</option>
                            </select>

                            <div className="relative flex items-center">
                                <input
                                    type="color"
                                    onChange={(e) => execCommand('foreColor', e.target.value)}
                                    className="absolute opacity-0 w-8 h-8 cursor-pointer z-10"
                                    title="Cor do texto"
                                />
                                <button className="w-8 h-8 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <i className="fas fa-palette text-sm"></i>
                                </button>
                            </div>
                        </div>
                        <Divider />

                        {/* Formats */}
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                            <ToolbarButton icon="bold" command="bold" title="Negrito (Ctrl+B)" active={activeFormats.includes('bold')} />
                            <ToolbarButton icon="italic" command="italic" title="Itálico (Ctrl+I)" active={activeFormats.includes('italic')} />
                            <ToolbarButton icon="underline" command="underline" title="Sublinhado (Ctrl+U)" active={activeFormats.includes('underline')} />
                            <ToolbarButton icon="strikethrough" command="strikeThrough" title="Tachado" active={activeFormats.includes('strikeThrough')} />
                        </div>
                        <Divider />

                        {/* Lists */}
                        <ToolbarButton icon="list-ul" command="insertUnorderedList" title="Lista com marcadores" active={activeFormats.includes('insertUnorderedList')} />
                        <ToolbarButton icon="list-ol" command="insertOrderedList" title="Lista numerada" active={activeFormats.includes('insertOrderedList')} />
                        <ToolbarButton icon="indent" command="indent" title="Aumentar recuo" />
                        <ToolbarButton icon="outdent" command="outdent" title="Diminuir recuo" />
                        <Divider />

                        {/* Alignment */}
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                            <ToolbarButton icon="align-left" command="justifyLeft" title="Alinhar à esquerda" active={activeFormats.includes('justifyLeft')} />
                            <ToolbarButton icon="align-center" command="justifyCenter" title="Centralizar" active={activeFormats.includes('justifyCenter')} />
                            <ToolbarButton icon="align-right" command="justifyRight" title="Alinhar à direita" active={activeFormats.includes('justifyRight')} />
                            <ToolbarButton icon="align-justify" command="justifyFull" title="Justificado" active={activeFormats.includes('justifyFull')} />
                        </div>
                        <Divider />

                        {/* Special */}
                        <ToolbarButton
                            icon="link"
                            command="createLink"
                            title="Inserir Link"
                            onClick={() => {
                                const url = prompt('Digite a URL:');
                                if (url) execCommand('createLink', url);
                            }}
                        />
                        <ToolbarButton
                            icon="fab fa-youtube"
                            command="insertYoutube"
                            title="Inserir Vídeo do YouTube"
                            onClick={insertYoutubeVideo}
                        />
                        <ToolbarButton
                            icon="image"
                            command="insertImage"
                            title="Inserir Imagem (URL)"
                            onClick={() => {
                                const url = prompt('Digite a URL da imagem:');
                                if (url) execCommand('insertImage', url);
                            }}
                        />
                        <ToolbarButton icon="remove-format" command="removeFormat" title="Limpar formatação" />
                    </div>
                )}

                {/* Element Resize Toolbar - Shows when an element (image/video) is selected */}
                {activeTab === 'editor' && selectedElement && (
                    <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 bg-slate-800 text-white p-2 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
                        <span className="text-xs font-bold text-slate-300 mr-2">Tamanho:</span>
                        {[25, 50, 75, 100].map(size => (
                            <button
                                key={size}
                                onClick={() => resizeElement(`${size}%`)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                            >
                                {size}%
                            </button>
                        ))}
                        <button
                            onClick={() => resizeElement('auto')}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                        >
                            Auto
                        </button>
                        <div className="w-px h-4 bg-slate-600 mx-1"></div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => alignElement('left')} className="w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center" title="Alinhar à Esquerda">
                                <i className="fas fa-align-left text-xs"></i>
                            </button>
                            <button onClick={() => alignElement('center')} className="w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center" title="Centralizar">
                                <i className="fas fa-align-center text-xs"></i>
                            </button>
                            <button onClick={() => alignElement('right')} className="w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center" title="Alinhar à Direita">
                                <i className="fas fa-align-right text-xs"></i>
                            </button>
                        </div>
                        <div className="w-px h-4 bg-slate-600 mx-1"></div>
                        <button
                            onClick={() => setSelectedElement(null)}
                            className="w-6 h-6 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-full transition-colors"
                            title="Fechar"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                )}
            </div>

            {/* Área do editor - FULL SCREEN */}
            <div className={`flex-1 ${activeTab === 'blocks' ? 'overflow-hidden' : 'overflow-auto'} ${forceLightMode ? 'bg-slate-100' : 'bg-slate-100 dark:bg-black/20'}`}>
                {activeTab === 'editor' ? (
                    <div
                        className={`max-w-[850px] mx-auto my-8 min-h-[1100px] shadow-sm border p-12 sm:p-16 transition-transform origin-top ${forceLightMode
                            ? 'bg-white border-slate-200'
                            : 'bg-white dark:bg-[#0f1520] border-slate-200 dark:border-slate-800'
                            }`}
                        style={{ transform: `scale(${zoom / 100})`, marginBottom: `${(zoom / 100) * 100}px` }}
                    >
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={handleInput}
                            onClick={handleEditorClick}
                            className={`rich-text-editor outline-none leading-loose tracking-wide editor-content ${forceLightMode
                                ? 'text-slate-800'
                                : 'text-slate-800 dark:text-slate-200'
                                }`}
                            style={{
                                fontSize: '11pt',
                                fontFamily: 'Arial, sans-serif',
                                minHeight: '800px'
                            }}
                            suppressContentEditableWarning
                            data-placeholder="Comece a digitar..."
                        />

                        {/* Botão flutuante para converter para blocos */}
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={addBlockFromText}
                                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all flex flex-col items-center gap-2 group"
                            >
                                <i className="fas fa-magic text-xl group-hover:animate-bounce"></i>
                                <span className="font-bold text-sm">Gerar Blocos de Áudio a partir do texto acima</span>
                                <span className="text-[10px]">Cada parágrafo se tornará um bloco independente</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 h-full overflow-hidden">
                        {/* Coluna Esquerda: Texto Original (Somente Leitura) */}
                        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <i className="fas fa-file-alt text-xs"></i>
                                    </div>
                                    <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-widest">
                                        Texto Original
                                    </h3>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 tracking-tighter">
                                    MODO PREVISUALIZAÇÃO
                                </span>
                            </div>
                            <div className="flex-1 overflow-auto p-12 rich-text-editor editor-content scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                <div
                                    className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed"
                                    style={{ fontSize: '11pt', fontFamily: 'Arial, sans-serif' }}
                                    dangerouslySetInnerHTML={{ __html: content }}
                                />
                            </div>
                        </div>

                        {/* Coluna Direita: Gerenciador de Blocos */}
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciador de Blocos</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sincronize parágrafos e áudios com precisão.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const id = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
                                        setBlocks([...blocks, { id, text: '', audioUrl: '' }]);
                                    }}
                                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                >
                                    <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                                    Novo Bloco
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto pr-4 space-y-6 pb-20 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">

                                {blocks.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-20 text-center flex flex-col items-center gap-6">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-3xl shadow-inner">
                                            <i className="fas fa-layer-group"></i>
                                        </div>
                                        <div className="max-w-xs transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                                            <p className="font-black text-xl text-slate-800 dark:text-white mb-2">Editor Vazio</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Seus parágrafos aparecerão aqui. Comece escrevendo no <span className="font-bold text-indigo-500">Texto Rico</span> e clique em <span className="font-bold text-indigo-500">Gerar Blocos</span>.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('editor')}
                                            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                        >
                                            Ir para o editor de texto
                                        </button>
                                    </div>
                                ) : (
                                    blocks.map((rawBlock, index) => {
                                        // Garantir que block seja um objeto com as propriedades necessárias (suporte a legado)
                                        const block = typeof rawBlock === 'string'
                                            ? { id: `legacy-${index}`, text: rawBlock, audioUrl: '' }
                                            : rawBlock;

                                        const text = block.text || '';

                                        return (
                                            <div
                                                key={block.id || index}
                                                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all duration-300"
                                            >
                                                {/* Badge de Ordem */}
                                                <div className="absolute -left-3 top-8 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 z-10 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all">
                                                    {String(index + 1).padStart(2, '0')}
                                                </div>

                                                {/* Controles de Movimentação Flutuantes */}
                                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-20">
                                                    <button
                                                        onClick={() => moveBlock(index, 'up')}
                                                        disabled={index === 0}
                                                        className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 disabled:opacity-30 transition-all"
                                                    >
                                                        <i className="fas fa-chevron-up text-xs"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => moveBlock(index, 'down')}
                                                        disabled={index === blocks.length - 1}
                                                        className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 disabled:opacity-30 transition-all"
                                                    >
                                                        <i className="fas fa-chevron-down text-xs"></i>
                                                    </button>
                                                </div>

                                                <div className="flex flex-col md:flex-row items-start gap-6">
                                                    <div className="flex-1 relative">
                                                        <textarea
                                                            value={text}
                                                            onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none min-h-[60px] leading-relaxed text-sm font-medium"
                                                            placeholder="Digite o conteúdo deste parágrafo..."
                                                            rows={Math.max(2, Math.ceil(text.length / 85))}
                                                        />
                                                        {/* Indicador visual de texto */}
                                                        <div className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 pt-4">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <i className="fas fa-align-left text-[9px]"></i>
                                                                {text.length} caracteres
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                <i className="fas fa-clock text-[9px]"></i>
                                                                ~{Math.ceil(text.length / 15)}s de áudio
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex md:flex-col items-start justify-start gap-3 border-l border-slate-100 dark:border-slate-800 pl-6 min-w-[120px]">
                                                        <button
                                                            onClick={() => openAudioModal(block)}
                                                            className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 px-4 transition-all duration-300 font-bold text-[10px] uppercase tracking-widest ${block.audioUrl
                                                                ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                                                                : 'bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-900/30'
                                                                }`}
                                                        >
                                                            <i className={`fas ${block.audioUrl ? 'fa-microphone' : 'fa-microphone-slash'} text-xs`}></i>
                                                            <span>{block.audioUrl ? 'Áudio' : 'Sem Áudio'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => removeBlock(block.id)}
                                                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-900/40 text-slate-300 transition-all flex items-center justify-center"
                                                            title="Remover Bloco"
                                                        >
                                                            <i className="fas fa-trash-alt text-xs"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Áudio Minimalista */}
            {
                editingBlockForAudio && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <i className="fas fa-music"></i>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Gerenciar Áudio</h3>
                                </div>
                                <button
                                    onClick={() => setEditingBlockForAudio(null)}
                                    className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 italic">
                                        "{editingBlockForAudio.text}"
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL do Arquivo</label>
                                    <div className="relative">
                                        <i className="fas fa-link absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                        <input
                                            type="text"
                                            value={tempAudioUrl}
                                            onChange={(e) => handleAudioUrlChange(e.target.value)}
                                            autoFocus
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            placeholder="Cole a URL do áudio ou link do Google Drive"
                                        />
                                    </div>
                                </div>

                                {/* Divider OR */}
                                <div className="relative flex items-center py-2">
                                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                                    <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OU</span>
                                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                                </div>

                                {/* Upload de Arquivo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Upload de Arquivo
                                    </label>
                                    <label className="block">
                                        <input
                                            type="file"
                                            accept="audio/*,.mp3,.wav,.ogg,.m4a"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAudioUpload(file);
                                            }}
                                            disabled={uploadingAudio}
                                            className="hidden"
                                            id="audioFileInput"
                                        />
                                        <div className={`w-full px-4 py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-center cursor-pointer transition-all ${uploadingAudio
                                            ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                                            : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                            }`}>
                                            <i className={`fas ${uploadingAudio ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'} mr-2`}></i>
                                            {uploadingAudio ? 'Fazendo upload...' : 'Selecionar Arquivo de Áudio'}
                                        </div>
                                    </label>

                                    {/* Progress Bar */}
                                    {uploadingAudio && (
                                        <div className="space-y-1">
                                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[10px] text-center text-slate-500">{uploadProgress}% concluído</p>
                                        </div>
                                    )}
                                </div>

                                {tempAudioUrl && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                            <i className="fas fa-volume-up text-indigo-500"></i>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 truncate">{tempAudioUrl}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={togglePreviewAudio}
                                            type="button"
                                            className={`w-full px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isPlayingPreview
                                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                                                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                                                }`}
                                        >
                                            <i className={`fas ${isPlayingPreview ? 'fa-pause' : 'fa-play'}`}></i>
                                            {isPlayingPreview ? 'Pausar Teste' : 'Testar Áudio'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={() => setEditingBlockForAudio(null)}
                                    className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveAudioUrl}
                                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    Salvar Áudio
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Metadata Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 z-[60] ${showMetadata ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur">
                        <h2 className="font-bold text-slate-800 dark:text-white">Configurações da Aula</h2>
                        <button
                            onClick={() => setShowMetadata(false)}
                            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-500"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Título da Aula</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Ex: Introdução ao React"
                            />
                        </div>

                        {/* Video URL */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">URL do Vídeo</label>
                            <div className="relative">
                                <i className="fab fa-youtube absolute left-3 top-2.5 text-slate-400"></i>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="https://youtube.com/..."
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Cole a URL do vídeo ou o ID do YouTube.</p>
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duração (Segundos)</label>
                            <div className="relative">
                                <i className="fas fa-clock absolute left-3 top-2.5 text-slate-400"></i>
                                <input
                                    type="number"
                                    value={durationSeconds}
                                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {Math.floor(Number(durationSeconds) / 60)}m {Number(durationSeconds) % 60}s
                            </p>
                        </div>

                        {/* Image URL (Optional) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">URL da Imagem (Capa)</label>
                            <div className="relative">
                                <i className="fas fa-image absolute left-3 top-2.5 text-slate-400"></i>
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-4">
                                <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    Dica
                                </h4>
                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300/80 leading-relaxed">
                                    Essas informações são salvas automaticamente junto com o conteúdo quando você clica em "Salvar".
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {
                showMetadata && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:hidden"
                        onClick={() => setShowMetadata(false)}
                    ></div>
                )
            }

            <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          opacity: 0.6;
          pointer-events: none;
        }
        
        .editor-content ul { list-style-type: disc; margin-left: 1.5em; }
        .editor-content ol { list-style-type: decimal; margin-left: 1.5em; }
        .editor-content blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
        
        /* Estilização para parecer página A4 Google Docs */
        @media print {
          body * { visibility: hidden; }
          .editor-content, .editor-content * { visibility: visible; }
          .editor-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; border: none; }
        }
      `}</style>
        </div >
    );
};

export default LessonContentEditorPage;
