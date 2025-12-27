import React, { useState, useRef, useEffect } from 'react';
import { createSupabaseClient } from '../services/supabaseClient';
import { LessonRecord } from '../domain/admin';

// Componente para gerenciar edição de bloco individual
const EditableBlock: React.FC<{ text: string; onUpdate: (newText: string) => void; onFocus?: (element: HTMLDivElement) => void; blockId?: string }> = ({ text, onUpdate, onFocus, blockId }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const isUpdatingRef = useRef(false);
    const initialTextRef = useRef(text); // Guarda o texto inicial

    // Inicializar conteúdo apenas na primeira renderização
    useEffect(() => {
        if (divRef.current && !divRef.current.innerHTML) {
            divRef.current.innerHTML = text || '';
            initialTextRef.current = text;
        }
    }, []);

    // Sincronizar conteúdo quando o texto do BACKEND mudar (ignorando mudanças locais)
    useEffect(() => {
        if (divRef.current && !isUpdatingRef.current && text !== undefined) {
            // Se o texto do prop mudou E é diferente do que temos guardado
            // significa que veio uma atualização do backend
            if (text !== initialTextRef.current) {
                console.log('🔄 EditableBlock: Sincronizando com backend (texto mudou)');
                console.log('  Antigo:', initialTextRef.current?.substring(0, 50));
                console.log('  Novo:', text?.substring(0, 50));

                divRef.current.innerHTML = text || '';
                initialTextRef.current = text;
            }
        }
    }, [text]);

    const handleInput = () => {
        if (divRef.current) {
            isUpdatingRef.current = true;
            const newHtml = divRef.current.innerHTML;
            initialTextRef.current = newHtml; // Atualiza referência
            onUpdate(newHtml);
            // Reset flag após um tick
            setTimeout(() => {
                isUpdatingRef.current = false;
            }, 0);
        }
    };

    return (
        <div
            ref={divRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={() => divRef.current && onFocus?.(divRef.current)}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-h-[60px] leading-relaxed text-sm font-medium"
            data-placeholder="Digite o conteúdo deste parágrafo..."
            data-block-id={blockId}
            style={{ minHeight: '60px' }}
        />
    );
};

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
    const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light'); // Tema da prévia
    const [showMetadata, setShowMetadata] = useState(false);

    // Multimedia Modals State
    const [showImageModal, setShowImageModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
    const [mediaUrl, setMediaUrl] = useState('');
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    // Menu flutuante entre blocos
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [mediaMenuIndex, setMediaMenuIndex] = useState<number | null>(null);

    // Controle de tamanho de mídia
    const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
    const [mediaSize, setMediaSize] = useState<string>('100%');

    // Controle de expansão de blocos
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

    // Metadata State
    const [title, setTitle] = useState(lesson.title);
    const [videoUrl, setVideoUrl] = useState(lesson.video_url || '');
    const [durationSeconds, setDurationSeconds] = useState(lesson.duration_seconds || 0);
    const [imageUrl, setImageUrl] = useState(lesson.image_url || '');

    // Content Blocks State
    const [blocks, setBlocks] = useState<any[]>(lesson.content_blocks || []);
    const [editingBlockForAudio, setEditingBlockForAudio] = useState<any | null>(null);
    const [tempAudioUrl, setTempAudioUrl] = useState('');

    // Audio Preview State
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    // Audio Upload State
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
    const [activeEditableElement, setActiveEditableElement] = useState<HTMLElement | null>(null); // Rastreia qual bloco está focado
    const savedSelectionRef = useRef<Range | null>(null); // Salva a seleção antes de perder foco

    // Bulk Creation State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkCount, setBulkCount] = useState(3);
    const [bulkData, setBulkData] = useState<Array<{ id: string; text: string; audioFile: File | null; audioUrl: string; spacing: number }>>([]);
    const [isBulkUploading, setIsBulkUploading] = useState(false);

    // Funções para salvar e restaurar seleção
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
            console.log('💾 Seleção salva:', selection.toString());
        } else {
            console.log('⚠️ Nenhuma seleção para salvar');
        }
    };

    const restoreSelection = () => {
        if (savedSelectionRef.current) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(savedSelectionRef.current);
            console.log('✅ Seleção restaurada:', savedSelectionRef.current.toString());
        } else {
            console.log('⚠️ Nenhuma seleção salva para restaurar');
        }
    };

    // Sync blocks when lesson changes (CRITICAL for persistence)
    // IMPORTANTE: só sincroniza quando a LIÇÃO mudar (lesson.id), NÃO quando content_blocks mudar
    // Isso evita sobrescrever edições locais após salvamento
    useEffect(() => {
        console.log('🔄 Sincronizando blocos - NOVA LIÇÃO carregada');
        console.log('📦 Total de blocos recebidos:', lesson.content_blocks?.length);

        // Log detalhado de cada bloco
        lesson.content_blocks?.forEach((block: any, index: number) => {
            console.log(`📋 Bloco ${index + 1}:`, {
                id: block.id,
                textLength: block.text?.length || 0,
                textPreview: block.text?.substring(0, 100),
                hasLineBreaks: block.text?.includes('<br>') || block.text?.includes('\n'),
                hasFormatting: block.text?.includes('<strong>') || block.text?.includes('<b>'),
                spacing: block.spacing,
                fullHTML: block.text
            });
        });

        setBlocks(lesson.content_blocks || []);
        setTitle(lesson.title);
        setVideoUrl(lesson.video_url || '');
        setDurationSeconds(lesson.duration_seconds || 0);
        setImageUrl(lesson.image_url || '');
    }, [lesson.id]); // APENAS quando lesson.id mudar (lição diferente)

    // Detectar cliques em imagens e vídeos nos blocos
    useEffect(() => {
        const handleMediaClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Verificar se clicou em uma imagem
            if (target.tagName === 'IMG') {
                e.stopPropagation();
                setSelectedMedia(target);
                const currentWidth = target.style.maxWidth || '100%';
                setMediaSize(currentWidth);
                return;
            }

            // Verificar se clicou em um vídeo wrapper
            if (target.closest('.video-wrapper')) {
                e.stopPropagation();
                const wrapper = target.closest('.video-wrapper') as HTMLElement;
                setSelectedMedia(wrapper);
                const currentWidth = wrapper.style.maxWidth || '100%';
                setMediaSize(currentWidth);
                return;
            }

            // NÃO desselecionar se clicou na toolbar de mídia
            if (target.closest('.media-toolbar')) {
                return;
            }

            // Desselecionar se clicou fora
            setSelectedMedia(null);
        };

        document.addEventListener('click', handleMediaClick);
        return () => document.removeEventListener('click', handleMediaClick);
    }, []);

    // Função para redimensionar mídia
    const resizeMedia = (size: string) => {
        if (!selectedMedia) return;

        if (selectedMedia.tagName === 'IMG') {
            selectedMedia.style.maxWidth = size;
            selectedMedia.style.width = size === '100%' ? '100%' : 'auto';
        } else if (selectedMedia.classList.contains('video-wrapper')) {
            selectedMedia.style.maxWidth = size;
        }

        setMediaSize(size);

        // Forçar atualização visual imediata
        selectedMedia.style.display = 'none';
        void selectedMedia.offsetHeight; // Trigger reflow
        selectedMedia.style.display = '';
    };

    // Função para alinhar mídia
    const alignMedia = (alignment: 'left' | 'center' | 'right') => {
        if (!selectedMedia) return;

        // Resetar estilos
        selectedMedia.style.marginLeft = '';
        selectedMedia.style.marginRight = '';
        selectedMedia.style.display = 'block';

        if (alignment === 'left') {
            selectedMedia.style.marginLeft = '0';
            selectedMedia.style.marginRight = 'auto';
        } else if (alignment === 'center') {
            selectedMedia.style.marginLeft = 'auto';
            selectedMedia.style.marginRight = 'auto';
        } else if (alignment === 'right') {
            selectedMedia.style.marginLeft = 'auto';
            selectedMedia.style.marginRight = '0';
        }
    };

    // Função para aplicar mudanças e atualizar o bloco
    const applyMediaChanges = () => {
        if (!selectedMedia) return;

        // Encontrar o contenteditable pai que contém a mídia
        let editableParent = selectedMedia.closest('[contenteditable="true"]');
        if (!editableParent) return;

        // Pegar o block-id do elemento editável
        const blockId = editableParent.getAttribute('data-block-id');
        if (!blockId) return;

        // Pegar o HTML atualizado
        const updatedHTML = editableParent.innerHTML;

        // Atualizar o bloco usando o ID correto
        updateBlock(blockId, { text: updatedHTML });

        // Desselecionar
        setSelectedMedia(null);
    };


    useEffect(() => {
        if (editorRef.current) {
            if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>') {
                editorRef.current.innerHTML = content;
            }
        }
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [content]);

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

            // Normalizar blocos: garantir que todos tenham spacing
            const normalizedBlocks = blocks.map(block => ({
                ...block,
                spacing: block.spacing !== undefined ? block.spacing : 8 // Padrão: Normal
            }));

            // Debug: verificar blocos antes de salvar
            console.log('🔍 SALVANDO - Total de blocos:', normalizedBlocks.length);
            console.log('🔍 SALVANDO - Blocos normalizados:', JSON.stringify(normalizedBlocks, null, 2));

            await onSave(htmlContent, {
                title,
                video_url: videoUrl,
                duration_seconds: Number(durationSeconds),
                image_url: imageUrl,
                content_blocks: normalizedBlocks
            });

            console.log('✅ Salvamento concluído com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInput = () => {
        const htmlContent = editorRef.current?.innerHTML || '';
        setContent(htmlContent);
    };

    const execCommand = (command: string, value?: string) => {
        // Executar comando no elemento focado (bloco individual ou editor principal)
        const targetElement = activeEditableElement || editorRef.current;

        if (targetElement) {
            // Garantir que o elemento está focado
            targetElement.focus();
            document.execCommand(command, false, value || '');

            // Se estiver em um bloco, disparar evento de input para salvar
            if (activeEditableElement) {
                const event = new Event('input', { bubbles: true });
                activeEditableElement.dispatchEvent(event);
            } else {
                handleInput();
            }
        }
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
        // Removed setActiveTab - now using two-column layout
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

    // ========== MULTIMEDIA FUNCTIONS ==========

    // Upload de imagem para Supabase Storage
    const handleImageUpload = async (file: File) => {
        try {
            setUploadingMedia(true);
            const supabase = createSupabaseClient();

            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `content-images/${fileName}`;

            const { data, error } = await supabase.storage
                .from('content-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Erro no upload da imagem:', error);
                alert(`Erro ao fazer upload: ${error.message}`);
                setUploadingMedia(false);
                return null;
            }

            const { data: urlData } = supabase.storage
                .from('content-images')
                .getPublicUrl(filePath);

            setUploadingMedia(false);
            return urlData.publicUrl;

        } catch (err) {
            console.error('Erro inesperado no upload:', err);
            alert('Erro inesperado ao fazer upload.');
            setUploadingMedia(false);
            return null;
        }
    };

    // Inserir imagem como novo bloco
    const insertImage = (url: string, atIndex?: number) => {
        if (!url) return;

        const newBlock = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            text: `<img src="${url}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" alt="Imagem do conteúdo" />`,
            audioUrl: '',
            spacing: 8
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex + 1, 0, newBlock);
            setBlocks(newBlocks);
        } else {
            setBlocks([...blocks, newBlock]);
        }

        setShowImageModal(false);
        setMediaUrl('');
        setImageMode('url');
        setShowMediaMenu(false);
    };

    // Inserir tabela como novo bloco
    const insertTable = (atIndex?: number) => {
        let html = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 20px 0; border: 1px solid #cbd5e1;"><thead><tr>';
        for (let j = 0; j < tableCols; j++) {
            html += `<th style="padding: 12px; background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: 600;">Cabeçalho ${j + 1}</th>`;
        }
        html += '</tr></thead><tbody>';
        for (let i = 0; i < tableRows - 1; i++) {
            html += '<tr>';
            for (let j = 0; j < tableCols; j++) {
                html += '<td style="padding: 12px; border: 1px solid #cbd5e1;">Linha ' + (i + 1) + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';

        const newBlock = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            text: html,
            audioUrl: '',
            spacing: 8
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex + 1, 0, newBlock);
            setBlocks(newBlocks);
        } else {
            setBlocks([...blocks, newBlock]);
        }

        setShowTableModal(false);
        setTableRows(3);
        setTableCols(3);
        setShowMediaMenu(false);
    };

    // Inserir vídeo como novo bloco
    const insertVideoEmbed = (atIndex?: number) => {
        if (!mediaUrl) return;
        let videoId = '';
        let embedUrl = '';
        if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
            const match = mediaUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            videoId = match ? match[1] : '';
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (mediaUrl.includes('vimeo.com')) {
            const match = mediaUrl.match(/vimeo\.com\/(\d+)/);
            videoId = match ? match[1] : '';
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
        if (!embedUrl) {
            alert('URL de vídeo inválida. Use YouTube ou Vimeo.');
            return;
        }

        const html = `<div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0; border-radius: 12px;"><div class="video-overlay"></div><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe></div>`;

        const newBlock = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            text: html,
            audioUrl: '',
            spacing: 8
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex + 1, 0, newBlock);
            setBlocks(newBlocks);
        } else {
            setBlocks([...blocks, newBlock]);
        }

        setShowVideoModal(false);
        setMediaUrl('');
        setShowMediaMenu(false);
    };

    // Inserir citação
    const insertQuote = () => {
        const targetElement = activeEditableElement || editorRef.current;
        if (targetElement) {
            targetElement.focus();
            document.execCommand('formatBlock', false, 'blockquote');
            if (activeEditableElement) {
                const event = new Event('input', { bubbles: true });
                activeEditableElement.dispatchEvent(event);
            } else {
                handleInput();
            }
        }
    };

    // Inserir lista não ordenada
    const insertUnorderedList = () => execCommand('insertUnorderedList');

    // Inserir lista ordenada
    const insertOrderedList = () => execCommand('insertOrderedList');

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

    // Bulk Handlers
    const handleUpdateBulkCount = (newCount: number) => {
        const safeCount = Math.min(10, Math.max(1, newCount));
        setBulkCount(safeCount);

        setBulkData(prev => {
            const newData = [...prev];
            if (safeCount > prev.length) {
                for (let i = prev.length; i < safeCount; i++) {
                    newData.push({
                        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
                        text: '',
                        audioFile: null,
                        audioUrl: '',
                        spacing: 8
                    });
                }
            } else {
                newData.length = safeCount;
            }
            return newData;
        });
    };

    const handleBulkSave = async () => {
        setIsBulkUploading(true);
        const supabase = createSupabaseClient();
        const newBlocks: any[] = [];

        try {
            console.log('🚀 BULK CREATE - Processando', bulkData.length, 'blocos...');

            for (const item of bulkData) {
                // Skip empty blocks to avoid clutter
                if (!item.text.trim() && !item.audioFile) {
                    console.log('⏭️  Pulando bloco vazio');
                    continue;
                }

                let finalAudioUrl = item.audioUrl;

                if (item.audioFile) {
                    console.log('📤 Fazendo upload de áudio:', item.audioFile.name);
                    const timestamp = Date.now();
                    const fileExt = item.audioFile.name.split('.').pop();
                    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `audio-files/${fileName}`;

                    const { error } = await supabase.storage
                        .from('audio-files')
                        .upload(filePath, item.audioFile, { cacheControl: '3600', upsert: false });

                    if (!error) {
                        const { data: urlData } = supabase.storage
                            .from('audio-files')
                            .getPublicUrl(filePath);
                        finalAudioUrl = urlData.publicUrl;
                        console.log('✅ Upload concluído:', finalAudioUrl);
                    } else {
                        console.error('❌ Erro no upload:', error);
                    }
                }

                newBlocks.push({
                    id: item.id,
                    text: item.text,
                    audioUrl: finalAudioUrl,
                    spacing: item.spacing
                });
            }

            console.log('✅ BULK CREATE - Criados', newBlocks.length, 'blocos');
            console.log('📋 Blocos criados:', JSON.stringify(newBlocks, null, 2));
            console.log('📋 Blocos existentes antes:', blocks.length);

            setBlocks(prev => {
                const updated = [...prev, ...newBlocks];
                console.log('📋 Total de blocos após adicionar:', updated.length);
                return updated;
            });

            setIsBulkModalOpen(false);
            setBulkData([]);
            setBulkCount(3);

            console.log('✅ BULK CREATE - Modal fechado, estado limpo');
        } catch (err) {
            console.error('❌ Erro ao processar criação em lote:', err);
            alert('Erro ao processar criação em lote.');
        } finally {
            setIsBulkUploading(false);
        }
    };

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
        <div className="h-screen bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
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

                        {/* Tabs removidos - agora tudo em uma tela */}

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
                {/* Toolbar always visible now */ true && (
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

                        {/* Font Family & Size & Color */}
                        <div className="flex items-center gap-1 mr-2">
                            {/* Font Family Selector */}
                            <select
                                onFocus={saveSelection}
                                onChange={(e) => execCommand('fontName', e.target.value)}
                                className="h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 min-w-[120px]"
                                defaultValue="Arial"
                                title="Família da fonte"
                            >
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Tahoma">Tahoma</option>
                                <option value="Trebuchet MS">Trebuchet MS</option>
                                <option value="Impact">Impact</option>
                                <option value="Comic Sans MS">Comic Sans MS</option>
                            </select>

                            {/* Font Size in Pixels */}
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    min="8"
                                    max="72"
                                    defaultValue="14"
                                    onMouseDown={() => saveSelection()} // Salva antes de clicar
                                    onInput={(e) => {
                                        const size = (e.target as HTMLInputElement).value;
                                        if (!size || parseInt(size) < 8) return;

                                        const targetElement = activeEditableElement || editorRef.current;

                                        if (targetElement && savedSelectionRef.current) {
                                            targetElement.focus();
                                            restoreSelection();

                                            const selection = window.getSelection();
                                            if (selection && selection.rangeCount > 0) {
                                                document.execCommand('fontSize', false, '7');

                                                // Buscar apenas dentro do elemento focado
                                                const fontElements = targetElement.querySelectorAll('font[size="7"]');
                                                fontElements.forEach((element) => {
                                                    element.removeAttribute('size');
                                                    (element as HTMLElement).style.fontSize = `${size}px`;
                                                });

                                                // Salvar novamente a seleção após aplicar
                                                saveSelection();

                                                // Disparar evento para salvar
                                                if (activeEditableElement) {
                                                    const event = new Event('input', { bubbles: true });
                                                    activeEditableElement.dispatchEvent(event);
                                                } else {
                                                    handleInput();
                                                }
                                            }
                                        }
                                    }}
                                    className="h-8 w-16 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 text-center"
                                    title="Selecione o texto, depois digite o tamanho aqui"
                                    placeholder="14px"
                                />
                            </div>

                            <div className="relative flex items-center">
                                <input
                                    type="color"
                                    onFocus={saveSelection}
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

                        {/* Multimedia Buttons */}
                        <ToolbarButton
                            icon="image"
                            command=""
                            title="Inserir Imagem"
                            onClick={() => setShowImageModal(true)}
                        />
                        <ToolbarButton
                            icon="table"
                            command=""
                            title="Inserir Tabela"
                            onClick={() => setShowTableModal(true)}
                        />
                        <ToolbarButton
                            icon="video"
                            command=""
                            title="Inserir Vídeo (YouTube/Vimeo)"
                            onClick={() => setShowVideoModal(true)}
                        />
                        <ToolbarButton
                            icon="quote-left"
                            command=""
                            title="Inserir Citação"
                            onClick={insertQuote}
                        />
                        <ToolbarButton icon="remove-format" command="removeFormat" title="Limpar formatação" />
                    </div>
                )}

                {/* Element Resize Toolbar - Always visible when element selected */}
                {selectedElement && (
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

            {/* Área do editor - TWO COLUMN LAYOUT */}
            <div className={`flex-1 flex flex-col overflow-hidden ${forceLightMode ? 'bg-slate-100' : 'bg-slate-100 dark:bg-black/20'}`}>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
                    {/* Coluna Esquerda: Prévia para Alunos */}
                    <div className="flex flex-col h-full min-h-0">
                        {/* Header Fixo */}
                        <div className="mb-4 px-2 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${forceLightMode ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                                        <i className="fas fa-eye text-indigo-500"></i>
                                        Prévia para Alunos
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Como os alunos verão o conteúdo</p>
                                </div>

                                {/* Toggle de Tema da Prévia */}
                                <button
                                    onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    title={`Mudar para tema ${previewTheme === 'light' ? 'escuro' : 'claro'}`}
                                >
                                    <i className={`fas ${previewTheme === 'light' ? 'fa-moon' : 'fa-sun'} text-sm ${previewTheme === 'light' ? 'text-indigo-600' : 'text-yellow-500'}`}></i>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {previewTheme === 'light' ? 'Claro' : 'Escuro'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo com Scroll Independente */}
                        <div className={`flex-1 overflow-y-auto p-8 rounded-2xl border shadow-sm scrollbar-thin ${previewTheme === 'light'
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-900 border-slate-800'
                            }`}>
                            {blocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${previewTheme === 'light' ? 'bg-slate-100' : 'bg-slate-800'
                                        }`}>
                                        <i className={`fas fa-layer-group text-3xl ${previewTheme === 'light' ? 'text-slate-300' : 'text-slate-600'
                                            }`}></i>
                                    </div>
                                    <p className={`text-lg font-bold mb-2 ${previewTheme === 'light' ? 'text-slate-800' : 'text-white'
                                        }`}>Nenhum Bloco Criado</p>
                                    <p className={`text-sm max-w-md ${previewTheme === 'light' ? 'text-slate-500' : 'text-slate-400'
                                        }`}>
                                        Adicione blocos no gerenciador ao lado para visualizar como aparecerão para os alunos.
                                    </p>
                                </div>
                            ) : (
                                blocks.map((rawBlock, index) => {
                                    const block = typeof rawBlock === 'string'
                                        ? { id: `legacy-${index}`, text: rawBlock, audioUrl: '' }
                                        : rawBlock;

                                    const text = block.text || '';
                                    const spacing = block.spacing !== undefined ? block.spacing : 8;
                                    const spacingClass = spacing === 0 ? 'mb-0' : spacing === 2 ? 'mb-2' : spacing === 4 ? 'mb-4' : spacing === 6 ? 'mb-6' : spacing === 8 ? 'mb-8' : spacing === 12 ? 'mb-12' : spacing === 16 ? 'mb-16' : 'mb-8';

                                    return (
                                        <div key={block.id || index} className={`${spacingClass} text-sm ${previewTheme === 'light' ? 'text-slate-700' : 'text-slate-200'
                                            }`}>
                                            {text && <div className="w-full" dangerouslySetInnerHTML={{ __html: text }} />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Coluna Direita: Gerenciador de Blocos */}
                    <div className="flex flex-col h-full min-h-0">
                        {/* Header Fixo com Botões */}
                        <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                            <div>
                                <h2 className={`text-2xl font-black tracking-tight ${forceLightMode ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>Gerenciador de Blocos</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sincronize parágrafos e áudios com precisão.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsBulkModalOpen(true);
                                        handleUpdateBulkCount(3);
                                    }}
                                    className="px-4 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                    title="Inserir vários blocos de uma vez"
                                >
                                    <i className="fas fa-layer-group"></i>
                                    Em Lote
                                </button>
                                <button
                                    onClick={() => {
                                        const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
                                        setBlocks([...blocks, { id, text: '', audioUrl: '' }]);
                                    }}
                                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                >
                                    <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
                                    Novo Bloco
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo com Scroll Independente */}
                        <div className="flex-1 overflow-y-auto pr-4 space-y-6 pb-20 scrollbar-thin">

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
                                    {/* Removed button - no longer needed with two-column layout */}
                                </div>
                            ) : (
                                blocks.map((rawBlock, index) => {
                                    // Garantir que block seja um objeto com as propriedades necessárias (suporte a legado)
                                    const block = typeof rawBlock === 'string'
                                        ? { id: `legacy-${index}`, text: rawBlock, audioUrl: '' }
                                        : rawBlock;

                                    const text = block.text || '';

                                    return (
                                        <div key={block.id || index}>
                                            {/* Botão "+" flutuante que aparece ao hover */}
                                            <div
                                                className="relative h-8 group/add flex items-center justify-center"
                                                onMouseEnter={() => setHoveredBlockIndex(index)}
                                                onMouseLeave={() => setHoveredBlockIndex(null)}
                                            >
                                                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity"></div>

                                                {/* Bot\u00e3o \"+\" */}
                                                <button
                                                    onClick={() => {
                                                        setMediaMenuIndex(index);
                                                        setShowMediaMenu(!showMediaMenu);
                                                    }}
                                                    className={`relative z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:scale-110 shadow-lg transition-all duration-200 ${hoveredBlockIndex === index ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
                                                        }`}
                                                >
                                                    <i className="fas fa-plus text-xs"></i>
                                                </button>

                                                {/* Menu Popup */}
                                                {showMediaMenu && mediaMenuIndex === index && (
                                                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button
                                                            onClick={() => {
                                                                setMediaMenuIndex(index);
                                                                setShowImageModal(true);
                                                                setShowMediaMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <i className="fas fa-image w-4"></i>
                                                            <span>Inserir Imagem</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMediaMenuIndex(index);
                                                                setShowTableModal(true);
                                                                setShowMediaMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <i className="fas fa-table w-4"></i>
                                                            <span>Inserir Tabela</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMediaMenuIndex(index);
                                                                setShowVideoModal(true);
                                                                setShowMediaMenu(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <i className="fas fa-video w-4"></i>
                                                            <span>Inserir Vídeo</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                key={block.id || index}
                                                onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                                                className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer ${expandedBlockId === block.id ? 'p-12' : 'p-6'
                                                    }`}
                                            >
                                                {/* Badge de Ordem */}
                                                <div className={`absolute -left-3 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 z-10 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all ${expandedBlockId === block.id ? 'top-8' : 'top-4'
                                                    }`}>
                                                    {String(index + 1).padStart(2, '0')}
                                                </div>

                                                {/* Indicador de Configurações - Mostra que há ferramentas disponíveis */}
                                                <div className={`absolute right-4 top-4 text-slate-300 dark:text-slate-600 transition-all duration-300 ${expandedBlockId === block.id ? 'rotate-90 text-indigo-500 dark:text-indigo-400' : 'group-hover:text-slate-400 dark:group-hover:text-slate-500'}`}>
                                                    <i className="fas fa-cog"></i>
                                                </div>

                                                {/* Controles de Movimentação Flutuantes - só aparecem quando expandido */}
                                                {expandedBlockId === block.id && (
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
                                                )}

                                                <div className="flex flex-col md:flex-row items-start gap-6">
                                                    <div
                                                        className="flex-1 relative"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <EditableBlock
                                                            text={text}
                                                            onUpdate={(newText) => updateBlock(block.id, { text: newText })}
                                                            onFocus={(element) => setActiveEditableElement(element)}
                                                            blockId={block.id}
                                                        />

                                                        {/* Indicador visual de texto - só aparece quando expandido */}
                                                        {expandedBlockId === block.id && (
                                                            <div className="mt-4 flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 pt-4">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <i className="fas fa-align-left text-[9px]"></i>
                                                                    {text.replace(/<[^>]*>/g, '').length} caracteres
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <i className="fas fa-clock text-[9px]"></i>
                                                                    ~{Math.ceil(text.replace(/<[^>]*>/g, '').length / 15)}s de áudio
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Controles laterais - só aparecem quando expandido */}
                                                    {expandedBlockId === block.id && (
                                                        <div
                                                            className="flex md:flex-col items-start justify-start gap-3 border-l border-slate-100 dark:border-slate-800 pl-6 min-w-[120px]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
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

                                                            {/* Controle de Espaçamento Individual */}
                                                            <div className="w-full relative group/spacing">
                                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                    <i className="fas fa-arrows-alt-v text-xs text-slate-400"></i>
                                                                </div>
                                                                <select
                                                                    value={block.spacing !== undefined ? block.spacing : 2}
                                                                    onChange={(e) => updateBlock(block.id, { spacing: Number(e.target.value) })}
                                                                    className="w-full h-10 pl-9 pr-2 appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:border-indigo-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                                                    title="Espaçamento abaixo deste bloco"
                                                                >
                                                                    <option value={0}>Sem Espaço</option>
                                                                    <option value={4}>Pequeno</option>
                                                                    <option value={8}>Normal</option>
                                                                    <option value={12}>Médio</option>
                                                                    <option value={16}>Grande</option>
                                                                    <option value={24}>Enorme</option>
                                                                </select>
                                                            </div>

                                                            <button
                                                                onClick={() => removeBlock(block.id)}
                                                                className="w-full h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-900/40 text-slate-300 transition-all flex items-center justify-center gap-2"
                                                                title="Remover Bloco"
                                                            >
                                                                <i className="fas fa-trash-alt text-xs"></i>
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">Excluir</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
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

            {/* Bulk Creation Modal */}
            {
                isBulkModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl shadow-sm">
                                        <i className="fas fa-layer-group"></i>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">Criação em Lote</h3>
                                        <p className="text-xs text-slate-500 font-medium">Adicione múltiplos blocos de conteúdo e áudio simultaneamente.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] uppercase font-black text-slate-400 px-2">Quantidade:</span>
                                        <select
                                            value={bulkCount}
                                            onChange={(e) => handleUpdateBulkCount(Number(e.target.value))}
                                            className="bg-transparent font-bold text-indigo-600 dark:text-indigo-400 outline-none text-sm cursor-pointer pr-2"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <option key={n} value={n}>{n} Blocos</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={() => setIsBulkModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-500">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-[#0B0F17]">
                                {bulkData.map((item, index) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4 items-start animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-1">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Texto do Parágrafo</label>
                                                <textarea
                                                    value={item.text}
                                                    onChange={(e) => {
                                                        const newData = [...bulkData];
                                                        newData[index].text = e.target.value;
                                                        setBulkData(newData);
                                                    }}
                                                    className="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                                    placeholder="Digite ou cole o texto aqui..."
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Áudio (Opcional)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="audio/*"
                                                            className="hidden"
                                                            id={`bulk-audio-${item.id}`}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const newData = [...bulkData];
                                                                    newData[index].audioFile = file;
                                                                    setBulkData(newData);
                                                                }
                                                            }}
                                                        />
                                                        <label htmlFor={`bulk-audio-${item.id}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all ${item.audioFile ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-indigo-400'}`}>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.audioFile ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                <i className={`fas ${item.audioFile ? 'fa-check' : 'fa-music'}`}></i>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-bold truncate ${item.audioFile ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>
                                                                    {item.audioFile ? item.audioFile.name : 'Selecionar arquivo...'}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="w-1/3">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Espaçamento</label>
                                                    <select
                                                        value={item.spacing}
                                                        onChange={(e) => {
                                                            const newData = [...bulkData];
                                                            newData[index].spacing = Number(e.target.value);
                                                            setBulkData(newData);
                                                        }}
                                                        className="w-full h-[46px] px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value={0}>Sem Espaço</option>
                                                        <option value={4}>Pequeno</option>
                                                        <option value={8}>Normal</option>
                                                        <option value={12}>Médio</option>
                                                        <option value={16}>Grande</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsBulkModalOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBulkSave}
                                    disabled={isBulkUploading}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
                                >
                                    {isBulkUploading ? (
                                        <>
                                            <i className="fas fa-circle-notch animate-spin"></i>
                                            Processando Uploads...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check"></i>
                                            Inserir {bulkCount} Blocos
                                        </>
                                    )}
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

            {/* === MODALS DE MÍDIA === */}

            {/* Modal: Inserir Imagem */}
            {
                showImageModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowImageModal(false)}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inserir Imagem</h3>
                                <button onClick={() => setShowImageModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <i className=" fas fa-times text-xl"></i>
                                </button>
                            </div>

                            {/* Tabs: Upload vs URL */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setImageMode('url')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${imageMode === 'url'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    <i className="fas fa-link mr-2"></i>
                                    URL
                                </button>
                                <button
                                    onClick={() => setImageMode('upload')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${imageMode === 'upload'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    <i className="fas fa-upload mr-2"></i>
                                    Upload
                                </button>
                            </div>

                            {imageMode === 'url' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        URL da Imagem
                                    </label>
                                    <input
                                        type="url"
                                        value={mediaUrl}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={() => insertImage(mediaUrl, mediaMenuIndex !== null ? mediaMenuIndex : undefined)}
                                        disabled={!mediaUrl}
                                        className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                                    >
                                        Inserir Imagem
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Selecione uma imagem
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const url = await handleImageUpload(file);
                                                if (url) insertImage(url, mediaMenuIndex !== null ? mediaMenuIndex : undefined);
                                            }
                                        }}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-600 dark:file:text-indigo-400 file:font-semibold hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/30"
                                    />
                                    {uploadingMedia && (
                                        <div className="mt-4 flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            <span>Fazendo upload...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Modal: Inserir Tabela */}
            {
                showTableModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowTableModal(false)}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inserir Tabela</h3>
                                <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Número de Linhas
                                    </label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={tableRows}
                                        onChange={(e) => setTableRows(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Número de Colunas
                                    </label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="10"
                                        value={tableCols}
                                        onChange={(e) => setTableCols(Number(e.target.value))}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                <button
                                    onClick={() => insertTable(mediaMenuIndex !== null ? mediaMenuIndex : undefined)}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Criar Tabela {tableRows}x{tableCols}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal: Inserir Vídeo */}
            {
                showVideoModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inserir Vídeo</h3>
                                <button onClick={() => setShowVideoModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    URL do Vídeo (YouTube ou Vimeo)
                                </label>
                                <input
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Cole o link completo do YouTube ou Vimeo
                                </p>
                                <button
                                    onClick={() => insertVideoEmbed(mediaMenuIndex !== null ? mediaMenuIndex : undefined)}
                                    disabled={!mediaUrl}
                                    className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                                >
                                    Inserir Vídeo
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Toolbar Flutuante para Redimensionar Mídia */}
            {
                selectedMedia && (
                    <div
                        className="media-toolbar fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
                        style={{ maxWidth: '90vw' }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">Tamanho:</span>

                            <button
                                onClick={() => resizeMedia('33%')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${mediaSize === '33%'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                Pequeno
                            </button>

                            <button
                                onClick={() => resizeMedia('50%')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${mediaSize === '50%'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                Médio
                            </button>

                            <button
                                onClick={() => resizeMedia('75%')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${mediaSize === '75%'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                Grande
                            </button>

                            <button
                                onClick={() => resizeMedia('100%')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${mediaSize === '100%'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600'
                                    }`}
                            >
                                Original
                            </button>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2"></div>

                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-2">Alinhamento:</span>

                            <button
                                onClick={() => alignMedia('left')}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                                title="Alinhar à esquerda"
                            >
                                <i className="fas fa-align-left"></i>
                            </button>

                            <button
                                onClick={() => alignMedia('center')}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                                title="Centralizar"
                            >
                                <i className="fas fa-align-center"></i>
                            </button>

                            <button
                                onClick={() => alignMedia('right')}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                                title="Alinhar à direita"
                            >
                                <i className="fas fa-align-right"></i>
                            </button>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2"></div>

                            <button
                                onClick={applyMediaChanges}
                                className="px-4 py-2 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-colors shadow-lg"
                                title="Aplicar mudanças na prévia"
                            >
                                <i className="fas fa-check mr-2"></i>
                                Aplicar
                            </button>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-2"></div>

                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default LessonContentEditorPage;
