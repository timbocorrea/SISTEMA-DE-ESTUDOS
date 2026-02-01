import React, { useState, useRef, useEffect } from 'react';
import { createSupabaseClient } from '../services/supabaseClient';
import { LessonRecord, LessonResourceRecord } from '../domain/admin';
import ResourceUploadForm from './ResourceUploadForm';
import { SupabaseAdminRepository } from '../repositories/SupabaseAdminRepository';
import { LessonResource } from '../domain/entities';
import QuizEditor from './QuizEditor';
import { LessonRequirementsEditor } from './LessonRequirementsEditor';
import { Quiz, QuizQuestion, QuizOption } from '../domain/quiz-entities';
import { SupabaseCourseRepository } from '../repositories/SupabaseCourseRepository'; // Ajuste conforme necessário recuperando do context
import { marked } from 'marked'; // Para conversão de Markdown para HTML
import { toast } from 'sonner';
import DropboxAudioBrowser, { DropboxFile } from './DropboxAudioBrowser';
import { DropboxService } from '../services/dropbox/DropboxService';

const FONT_FAMILIES = [
    { name: 'Padrão', value: 'inherit' },
    { name: 'Lexend', value: 'Lexend, sans-serif' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Monospace', value: 'monospace' }
];

// Componente ToolbarButton extraído para melhor performance
const ToolbarButton: React.FC<{
    icon: string;
    title: string;
    active?: boolean;
    onClick: () => void;
}> = ({ icon, title, active = false, onClick }) => (
    <button
        type="button"
        onMouseDown={(e) => {
            e.preventDefault(); // Evita perder o foco do editor
            onClick();
        }}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
        title={title}
    >
        <i className={`${icon.includes(' ') ? icon : `fas fa-${icon}`} text-sm`}></i>
    </button>
);

const Divider = () => (
    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
);

// Componente BlockItem memoizado para evitar re-renders desnecessários de toda a lista
const BlockItem = React.memo(({
    block,
    index,
    isExpanded,
    isSelected,
    isSelectionMode,
    isHovered,
    isMediaMenuOpen,
    isActive,
    totalBlocks,
    handlers
}: {
    block: Block;
    index: number;
    isExpanded: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
    isHovered: boolean;
    isMediaMenuOpen: boolean;
    isActive: boolean;
    totalBlocks: number;
    handlers: {
        setExpandedBlockId: (id: string | null) => void;
        toggleBlockSelection: (id: string) => void;
        setHoveredBlockIndex: (idx: number | null) => void;
        setMediaMenuIndex: (idx: number | null) => void;
        setShowMediaMenu: (show: boolean) => void;
        addBlockAtPosition: (idx: number) => void;
        setShowImageModal: (show: boolean) => void;
        setShowTableModal: (show: boolean) => void;
        setShowVideoModal: (show: boolean) => void;
        insertVideoEmbed: (idx: number) => void;
        openAudioModal: (block: any) => void;
        copyBlockContent: (id: string) => void;
        cutBlockContent: (id: string) => void;
        removeBlock: (id: string) => void;
        moveBlock: (idx: number, dir: 'up' | 'down') => void;
        updateBlock: (id: string, updates: any) => void;
        setActiveEditableElement: (el: HTMLElement | null) => void;
        saveSelection: () => void;
        execCommand: (cmd: string, val?: string) => void;
        setCurrentFontSize: (size: string) => void;
        currentFontSize: string;
        activeFormats: string[];
        toggleBlockFeatured: (id: string) => void;
    }
}) => {
    const text = block.text || '';

    return (
        <div
            style={{
                contentVisibility: 'auto',
                containIntrinsicSize: isExpanded ? '400px' : '100px'
            }}
            className="w-full"
        >
            {/* Botão "+" flutuante que aparece ao hover */}
            <div
                className="relative h-8 group/add flex items-center justify-center"
                onMouseEnter={() => handlers.setHoveredBlockIndex(index)}
                onMouseLeave={() => handlers.setHoveredBlockIndex(null)}
            >
                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity"></div>

                {/* Spacing Controls - Appear on hover */}
                <div className={`relative z-10 flex items-center gap-2 transition-all duration-200 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                    {/* Decrease Spacing */}
                    <button
                        onClick={() => {
                            const currentSpacing = block.spacing || 0;
                            const spacingOptions = [0, 4, 8, 12, 16, 24];
                            const currentIndex = spacingOptions.indexOf(currentSpacing);
                            const newSpacing = currentIndex > 0 ? spacingOptions[currentIndex - 1] : 0;
                            handlers.updateBlock(block.id, { spacing: newSpacing });
                        }}
                        disabled={!block.spacing || block.spacing === 0}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-orange-500 hover:text-orange-600 hover:scale-110 shadow-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Diminuir espaçamento"
                    >
                        <i className="fas fa-minus text-xs"></i>
                    </button>

                    {/* Current Spacing Indicator */}
                    <div className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                            {block.spacing || 0}px
                        </span>
                    </div>

                    {/* Increase Spacing */}
                    <button
                        onClick={() => {
                            const currentSpacing = block.spacing || 0;
                            const spacingOptions = [0, 4, 8, 12, 16, 24];
                            const currentIndex = spacingOptions.indexOf(currentSpacing);
                            const newSpacing = currentIndex < spacingOptions.length - 1 ? spacingOptions[currentIndex + 1] : 24;
                            handlers.updateBlock(block.id, { spacing: newSpacing });
                        }}
                        disabled={block.spacing === 24}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-green-500 hover:text-green-600 hover:scale-110 shadow-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Aumentar espaçamento"
                    >
                        <i className="fas fa-plus text-xs"></i>
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>

                    {/* Media Menu Button */}
                    <button
                        onClick={() => {
                            handlers.setMediaMenuIndex(index);
                            handlers.setShowMediaMenu(!isMediaMenuOpen);
                        }}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:scale-110 shadow-lg transition-all duration-200"
                        title="Inserir mídia"
                    >
                        <i className="fas fa-image text-xs"></i>
                    </button>

                    {/* Add Block Button */}
                    <button
                        onClick={() => handlers.addBlockAtPosition(index)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:scale-110 shadow-lg transition-all duration-200"
                        title="Adicionar bloco aqui"
                    >
                        <i className="fas fa-file-alt text-xs"></i>
                    </button>
                </div>

                {isMediaMenuOpen && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                            onClick={() => {
                                handlers.setMediaMenuIndex(index);
                                handlers.setShowImageModal(true);
                                handlers.setShowMediaMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                        >
                            <i className="fas fa-image w-4"></i>
                            <span>Inserir Imagem</span>
                        </button>
                        <button
                            onClick={() => {
                                handlers.setMediaMenuIndex(index);
                                handlers.setShowTableModal(true);
                                handlers.setShowMediaMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                        >
                            <i className="fas fa-table w-4"></i>
                            <span>Inserir Tabela</span>
                        </button>
                        <button
                            onClick={() => {
                                handlers.setMediaMenuIndex(index);
                                handlers.setShowVideoModal(true);
                                handlers.setShowMediaMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                        >
                            <i className="fas fa-video w-4"></i>
                            <span>Inserir Vídeo (Youtube/Vimeo)</span>
                        </button>
                        <button
                            onClick={() => {
                                handlers.insertVideoEmbed(index);
                                handlers.setShowMediaMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-colors"
                        >
                            <i className="fas fa-code w-4"></i>
                            <span>Inserir Código Embed</span>
                        </button>
                    </div>
                )}
            </div>

            <div
                data-block-id={block.id}
                onClick={() => !isSelectionMode && handlers.setExpandedBlockId(isExpanded ? null : block.id)}
                className={`group relative bg-white dark:bg-slate-900/50 rounded-2xl border transition-all duration-300 ${isExpanded
                    ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                    : isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
            >

                {/* Checkbox para Seleção em Massa */}
                {isSelectionMode && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => handlers.toggleBlockSelection(block.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                                }`}
                        >
                            {isSelected && <i className="fas fa-check text-xs"></i>}
                        </button>
                    </div>
                )}

                <div className={`p-6 ${isSelectionMode ? 'pl-14' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlers.moveBlock(index, 'up'); }}
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                                >
                                    <i className="fas fa-chevron-up text-xs"></i>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlers.moveBlock(index, 'down'); }}
                                    disabled={index === totalBlocks - 1}
                                    className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-30"
                                >
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </button>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                {index + 1}
                            </div>
                            <div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${block.audioUrl
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                    {block.audioUrl ? 'Com Áudio' : 'Sem Áudio'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => handlers.toggleBlockFeatured(block.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${block.featured
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                                    }`}
                                title={block.featured ? "Remover destaque" : "Destacar bloco"}
                            >
                                <i className={`fas fa-star text-sm ${block.featured ? "animate-pulse" : ""}`}></i>
                            </button>
                            <button
                                onClick={() => handlers.openAudioModal(block)}
                                className="w-8 h-8 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors"
                                title="Gerenciar Áudio"
                            >
                                <i className="fas fa-music text-sm"></i>
                            </button>
                            <button
                                onClick={() => handlers.copyBlockContent(block.id)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center transition-colors"
                                title="Copiar bloco"
                            >
                                <i className="fas fa-copy text-sm"></i>
                            </button>
                            <button
                                onClick={() => handlers.cutBlockContent(block.id)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center transition-colors"
                                title="Recortar bloco"
                            >
                                <i className="fas fa-cut text-sm"></i>
                            </button>
                            <button
                                onClick={() => handlers.removeBlock(block.id)}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                                title="Excluir bloco"
                            >
                                <i className="fas fa-trash-alt text-sm"></i>
                            </button>
                        </div>
                    </div>

                    {/* Toolbar específica de cada bloco (só aparece quando o bloco está focado) */}
                    {isActive && (
                        <div className="sticky top-2 z-30 flex items-center flex-wrap gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl mb-4 animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-slate-900/5">
                            {/* Grupo: Tipografia */}
                            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl mr-1">
                                <input
                                    type="number"
                                    min="8"
                                    max="72"
                                    value={handlers.currentFontSize}
                                    onChange={(e) => {
                                        const size = e.target.value;
                                        handlers.setCurrentFontSize(size);
                                        const activeEl = document.querySelector(`[data-block-id="${block.id}"] [contenteditable="true"]`) as HTMLElement;
                                        if (size && activeEl) {
                                            const selection = window.getSelection();
                                            if (!selection || selection.isCollapsed || !activeEl.contains(selection.anchorNode)) {
                                                const range = document.createRange();
                                                range.selectNodeContents(activeEl);
                                                selection?.removeAllRanges();
                                                selection?.addRange(range);
                                            }
                                            document.execCommand('fontSize', false, '7');
                                            const fontElements = activeEl.querySelectorAll('font[size="7"]');
                                            fontElements.forEach(font => {
                                                const span = document.createElement('span');
                                                span.style.fontSize = `${size}pt`;
                                                span.innerHTML = font.innerHTML;
                                                font.parentNode?.replaceChild(span, font);
                                            });
                                            handlers.updateBlock(block.id, { text: activeEl.innerHTML });
                                            handlers.saveSelection();
                                            setTimeout(() => activeEl.focus(), 0);
                                        }
                                    }}
                                    className="w-14 h-9 rounded-lg border-none bg-white dark:bg-slate-800 text-xs px-2 text-center font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                                    title="Tamanho da fonte"
                                />
                                <select
                                    className="w-24 h-9 rounded-lg border-none bg-white dark:bg-slate-800 text-[10px] px-1 ml-1 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                                    onChange={(e) => handlers.execCommand('fontName', e.target.value)}
                                    title="Tipo de fonte"
                                >
                                    {FONT_FAMILIES.map(font => (
                                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                            {font.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Divider />

                            {/* Grupo: Estilos de Texto */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton
                                    icon="bold"
                                    title="Negrito"
                                    active={handlers.activeFormats.includes('bold')}
                                    onClick={() => handlers.execCommand('bold')}
                                />
                                <ToolbarButton
                                    icon="italic"
                                    title="Itálico"
                                    active={handlers.activeFormats.includes('italic')}
                                    onClick={() => handlers.execCommand('italic')}
                                />
                                <ToolbarButton
                                    icon="underline"
                                    title="Sublinhado"
                                    active={handlers.activeFormats.includes('underline')}
                                    onClick={() => handlers.execCommand('underline')}
                                />
                            </div>

                            <Divider />

                            <Divider />

                            {/* Grupo: Cor */}
                            <div className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-400 group cursor-pointer active:scale-95" title="Cor do Texto">
                                <i className="fas fa-palette text-sm group-hover:text-indigo-500 transition-colors"></i>
                                <input
                                    type="color"
                                    onChange={(e) => handlers.execCommand('foreColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </div>

                            <Divider />

                            {/* Grupo: Alinhamento */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="align-left" title="Esquerda" active={handlers.activeFormats.includes('justifyLeft')} onClick={() => handlers.execCommand('justifyLeft')} />
                                <ToolbarButton icon="align-center" title="Centro" active={handlers.activeFormats.includes('justifyCenter')} onClick={() => handlers.execCommand('justifyCenter')} />
                                <ToolbarButton icon="align-right" title="Direita" active={handlers.activeFormats.includes('justifyRight')} onClick={() => handlers.execCommand('justifyRight')} />
                                <ToolbarButton icon="align-justify" title="Justificado" active={handlers.activeFormats.includes('justifyFull')} onClick={() => handlers.execCommand('justifyFull')} />
                            </div>

                            <Divider />

                            {/* Grupo: Listas e Recuos */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="list-ul" title="Lista" active={handlers.activeFormats.includes('insertUnorderedList')} onClick={() => handlers.execCommand('insertUnorderedList')} />
                                <ToolbarButton icon="list-ol" title="Numerada" active={handlers.activeFormats.includes('insertOrderedList')} onClick={() => handlers.execCommand('insertOrderedList')} />
                                <ToolbarButton icon="indent" title="Recuo à Direita" onClick={() => handlers.execCommand('indent')} />
                                <ToolbarButton icon="outdent" title="Recuo à Esquerda" onClick={() => handlers.execCommand('outdent')} />
                            </div>

                            <Divider />

                            {/* Grupo: Espaçamento (Slider) */}
                            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl mr-1">
                                <i className="fas fa-text-height text-xs text-slate-400"></i>
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.1"
                                    value={parseFloat((document.querySelector(`[data-block-id="${block.id}"] [contenteditable="true"]`) as HTMLElement)?.style.lineHeight || '1.6')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        handlers.execCommand('lineHeight', val);
                                    }}
                                    className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                                    title="Ajustar Espaçamento entre Linhas"
                                />
                                <span className="text-[9px] font-bold text-slate-500 w-6 text-center">
                                    {((document.querySelector(`[data-block-id="${block.id}"] [contenteditable="true"]`) as HTMLElement)?.style.lineHeight || '1.6')}
                                </span>
                            </div>

                            <Divider />

                            {/* Grupo: Mídia e Links */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton
                                    icon="link"
                                    title="Link"
                                    onClick={() => {
                                        const url = prompt('URL:');
                                        if (url) handlers.execCommand('createLink', url);
                                    }}
                                />
                                <ToolbarButton
                                    icon="image"
                                    title="Inserir Imagem (URL)"
                                    onClick={() => {
                                        const url = prompt('URL da Imagem:');
                                        if (url) {
                                            // Convert Dropbox URLs to direct download
                                            let finalUrl = url;
                                            if (url.includes('dropbox.com')) {
                                                finalUrl = url.replace('dl=0', 'dl=1');
                                                if (!finalUrl.includes('dl=')) {
                                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'dl=1';
                                                }
                                                console.log('🔄 Dropbox URL:', url, '→', finalUrl);
                                            }
                                            // Create a special link that opens image modal
                                            const selection = window.getSelection();
                                            if (selection && !selection.isCollapsed) {
                                                const range = selection.getRangeAt(0);
                                                const selectedText = range.toString();

                                                // Create link with inline onclick that will be preserved
                                                const escapedUrl = finalUrl.replace(/'/g, "\\'");
                                                const linkHtml = `<a href="#" class="image-link text-indigo-600 dark:text-indigo-400 underline decoration-dotted hover:decoration-solid cursor-pointer" data-image-url="${finalUrl}" onclick="console.log('🖱️ Clicou'); event.preventDefault(); if(window.openImageModal) { console.log('✅ Chamando modal'); window.openImageModal('${escapedUrl}'); } else { console.error('❌ openImageModal não existe'); } return false;" title="Clique para ver a imagem">${selectedText}</a>`;
                                                console.log('📝 Link HTML criado:', linkHtml);

                                                range.deleteContents();
                                                const fragment = range.createContextualFragment(linkHtml);
                                                range.insertNode(fragment);

                                                // Update block content
                                                const activeEl = document.querySelector(`[data-block-id="${block.id}"] [contenteditable="true"]`) as HTMLElement;
                                                if (activeEl) {
                                                    handlers.updateBlock(block.id, { text: activeEl.innerHTML });
                                                }
                                            } else {
                                                // If no selection, insert as regular image tag
                                                const imgHtml = `<img src="${finalUrl}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" /><p><br></p>`;
                                                handlers.execCommand('insertHTML', imgHtml);
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className={`relative pt-2 transition-all duration-300 ${block.featured ? 'border-l-4 border-yellow-500 pl-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-r-lg py-4 shadow-sm' : ''}`} onClick={(e) => e.stopPropagation()}>


                        <EditableBlock
                            text={text}
                            onUpdate={(newText) => handlers.updateBlock(block.id, { text: newText })}
                            onFocus={(element) => handlers.setActiveEditableElement(element)}
                            blockId={block.id}
                        />

                        {isExpanded && (
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
                </div>
            </div>
        </div >
    );
});

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
            className="editor-content w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-h-[60px] leading-relaxed text-sm font-medium"
            data-placeholder="Digite o conteúdo deste parágrafo..."
            data-block-id={blockId}
            style={{ minHeight: '60px' }}
        />
    );
};

// Interface para os blocos de conteúdo
interface Block {
    id: string;
    text: string;
    audioUrl?: string;
    spacing?: number;
    lineHeight?: string; // NEW: Persist line height for student preview
    featured?: boolean; // NEW: Highlight block style
}

interface LessonContentEditorPageProps {
    lesson: LessonRecord;
    apiKey?: string;
    onSave: (content: string, metadata?: Partial<LessonRecord>) => Promise<void>;
    onCancel: () => void;
}

const LessonContentEditorPage: React.FC<LessonContentEditorPageProps> = ({
    lesson,
    apiKey,
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
    const [activeEditableElement, setActiveEditableElement] = useState<HTMLElement | null>(null);
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
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

    // Dropbox Integration State
    const [showDropboxBrowser, setShowDropboxBrowser] = useState(false);
    // Verificação inicial de Autenticação do Dropbox (Callback) e Inicialização
    useEffect(() => {
        // Initialize service
        DropboxService.initialize();

        // Check if we just returned from a successful login
        const justLoggedIn = localStorage.getItem('dropbox_just_logged_in');
        if (justLoggedIn) {
            localStorage.removeItem('dropbox_just_logged_in');
            if (DropboxService.isAuthenticated()) {
                setShowDropboxBrowser(true);
                toast.success('Conectado ao Dropbox com sucesso!');
            }
        }
    }, []);

    // Image Viewer Modal State
    const [showImageViewerModal, setShowImageViewerModal] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState('');

    // Menu flutuante entre blocos
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [mediaMenuIndex, setMediaMenuIndex] = useState<number | null>(null);
    const [currentFontSize, setCurrentFontSize] = useState<string>('14');


    // Controle de tamanho de mídia
    const [selectedMedia, setSelectedMedia] = useState<HTMLElement | null>(null);
    const [mediaSize, setMediaSize] = useState<string>('100%');

    // Controle de expansão de blocos
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

    // Metadata State
    const [title, setTitle] = useState(lesson.title);
    const [videoUrls, setVideoUrls] = useState<{ url: string; title: string; image_url?: string }[]>(() => {
        // Initialize from video_urls if available, otherwise create from video_url for backward compatibility
        if (lesson.video_urls && lesson.video_urls.length > 0) {
            return lesson.video_urls;
        } else if (lesson.video_url) {
            return [{ url: lesson.video_url, title: 'Vídeo Principal', image_url: lesson.image_url || undefined }];
        }
        return [];
    });
    const [audioUrl, setAudioUrl] = useState(lesson.audio_url || '');
    const [durationSeconds, setDurationSeconds] = useState(lesson.duration_seconds || 0);
    const [imageUrl, setImageUrl] = useState(lesson.image_url || '');

    // Content Blocks State
    const [blocks, setBlocks] = useState<any[]>(lesson.content_blocks || []);
    const [editingBlockForAudio, setEditingBlockForAudio] = useState<any | null>(null);
    const [tempAudioUrl, setTempAudioUrl] = useState('');
    const [audioFilter, setAudioFilter] = useState<'all' | 'with-audio' | 'without-audio'>('all');

    // Handler for Dropbox Audio Selection
    const handleDropboxAudioSelected = (url: string, filename: string) => {
        setTempAudioUrl(url);
        toast.success(`✅ ${filename} selecionado do Dropbox!`);
        setShowDropboxBrowser(false);
    };
    const [blocksPerPage, setBlocksPerPage] = useState<number | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);

    // Lesson Resources
    const [lessonResources, setLessonResources] = useState<LessonResourceRecord[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);

    // Quiz Management Modal State
    const [showQuizManagementModal, setShowQuizManagementModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showImportExportModal, setShowImportExportModal] = useState(false);

    // Import Method Modal State (Upload ou Colar)
    const [importType, setImportType] = useState<'json' | 'docx' | 'md' | null>(null);
    const [showImportMethodModal, setShowImportMethodModal] = useState(false);
    const [importMethod, setImportMethod] = useState<'upload' | 'paste'>('upload');
    const [pastedContent, setPastedContent] = useState('');



    // Carregar recursos ao abrir o modal
    useEffect(() => {
        if (showMaterialModal && lesson.id) {
            fetchLessonResources();
        }
    }, [showMaterialModal, lesson.id]);

    const fetchLessonResources = async () => {
        if (!lesson.id) return;
        setIsLoadingResources(true);
        try {
            const repo = new SupabaseAdminRepository();
            const resources = await repo.listLessonResources(lesson.id);
            setLessonResources(resources);
        } catch (error) {
            console.error('Erro ao buscar materiais:', error);
        } finally {
            setIsLoadingResources(false);
        }
    };

    // Audio Preview State
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    // Audio Upload State
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Quiz State
    const [showQuizEditor, setShowQuizEditor] = useState(false);
    const [existingQuiz, setExistingQuiz] = useState<Quiz | null>(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [isTogglingRelease, setIsTogglingRelease] = useState(false);

    // Lesson Requirements State
    const [showRequirementsEditor, setShowRequirementsEditor] = useState(false);
    const [lessonRequirements, setLessonRequirements] = useState<import('../domain/lesson-requirements').LessonProgressRequirements | null>(null);
    const [loadingRequirements, setLoadingRequirements] = useState(false);


    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkCount, setBulkCount] = useState(3);

    // Unsaved Changes Tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const initialBlocksRef = useRef(JSON.stringify(blocks));
    const [changedBlocks, setChangedBlocks] = useState<Map<string, { before: Block; after: Block }>>(new Map());
    const [showChangesModal, setShowChangesModal] = useState(false);

    // Network Connection Monitoring
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOfflineModal, setShowOfflineModal] = useState(false);

    // Hierarchy State for Quiz Bank Preview
    const [courseId, setCourseId] = useState<string | undefined>(undefined);
    const [moduleId, setModuleId] = useState<string | undefined>(lesson.module_id);

    useEffect(() => {
        if (lesson.module_id) {
            setModuleId(lesson.module_id);
            const fetchHierarchy = async () => {
                try {
                    const repo = new SupabaseAdminRepository();
                    const mod = await repo.getModule(lesson.module_id);
                    setCourseId(mod.course_id);
                } catch (error) {
                    console.error('Error fetching hierarchy:', error);
                }
            };
            fetchHierarchy();
        }
    }, [lesson.id, lesson.module_id]);

    // Carregar quiz existente ao montar componente
    useEffect(() => {
        async function loadExistingQuiz() {
            setExistingQuiz(null); // ⚡ CRITICAL: Limpar quiz anterior ao trocar de aula
            setLoadingQuiz(true);

            console.log('🔍 [QUIZ DEBUG] Iniciando busca de quiz para aula:', lesson.id);

            try {
                const supabase = createSupabaseClient();
                const courseRepo = new SupabaseCourseRepository(supabase);

                const quiz = await courseRepo.getQuizByLessonId(lesson.id);

                if (quiz) {
                    setExistingQuiz(quiz);
                    console.log('✅ Quiz carregado:', quiz.title, '| ID:', quiz.id, '| Liberado:', quiz.isManuallyReleased);
                } else {
                    console.log('⚠️ Nenhum quiz encontrado para aula:', lesson.id);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar quiz:', error);
            } finally {
                setLoadingQuiz(false);
            }
        }
        loadExistingQuiz();
    }, [lesson.id]);

    // Carregar requisitos da aula
    useEffect(() => {
        async function loadRequirements() {
            setLoadingRequirements(true);
            try {
                const supabase = createSupabaseClient();
                const courseRepo = new SupabaseCourseRepository(supabase);
                const reqs = await courseRepo.getLessonRequirements(lesson.id);
                setLessonRequirements(reqs);
                console.log('✅ Requisitos carregados:', reqs);
            } catch (error) {
                console.error('❌ Erro ao carregar requisitos:', error);
            } finally {
                setLoadingRequirements(false);
            }
        }
        loadRequirements();
    }, [lesson.id]);

    // Setup global function for opening image modal
    useEffect(() => {
        (window as any).openImageModal = (imageUrl: string) => {
            console.log('🖼️ openImageModal chamada com URL:', imageUrl);
            setViewerImageUrl(imageUrl);
            setShowImageViewerModal(true);
        };

        // Add global click listener for image links
        const handleImageLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList?.contains('image-link') || target.closest('.image-link')) {
                e.preventDefault();
                const link = target.classList?.contains('image-link') ? target : target.closest('.image-link');
                const imageUrl = link?.getAttribute('data-image-url');
                if (imageUrl) {
                    setViewerImageUrl(imageUrl);
                    setShowImageViewerModal(true);
                }
            }
        };

        document.addEventListener('click', handleImageLinkClick);

        return () => {
            delete (window as any).openImageModal;
            document.removeEventListener('click', handleImageLinkClick);
        };
    }, []);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [audioFilter]);

    // Track unsaved changes when blocks are modified
    useEffect(() => {
        const currentBlocksStr = JSON.stringify(blocks);
        if (currentBlocksStr !== initialBlocksRef.current) {
            setHasUnsavedChanges(true);

            // Track which specific blocks changed
            try {
                const initialBlocks = JSON.parse(initialBlocksRef.current) as Block[];
                const changes = new Map<string, { before: Block; after: Block }>();

                blocks.forEach((currentBlock) => {
                    const originalBlock = initialBlocks.find(b => b.id === currentBlock.id);
                    if (originalBlock) {
                        // Check if block was modified
                        if (JSON.stringify(originalBlock) !== JSON.stringify(currentBlock)) {
                            changes.set(currentBlock.id, { before: originalBlock, after: currentBlock });
                        }
                    } else {
                        // New block added
                        changes.set(currentBlock.id, {
                            before: { id: currentBlock.id, text: '', audioUrl: '', spacing: 0 },
                            after: currentBlock
                        });
                    }
                });

                // Check for deleted blocks
                initialBlocks.forEach((originalBlock) => {
                    if (!blocks.find(b => b.id === originalBlock.id)) {
                        changes.set(originalBlock.id, {
                            before: originalBlock,
                            after: { id: originalBlock.id, text: '[REMOVIDO]', audioUrl: '', spacing: 0 }
                        });
                    }
                });

                setChangedBlocks(changes);
            } catch (error) {
                console.error('Error tracking changes:', error);
            }
        }
    }, [blocks]);

    // Network Connection Monitoring
    useEffect(() => {
        console.log('🔍 Network monitoring initialized. Current state:', navigator.onLine ? 'ONLINE' : 'OFFLINE');

        const handleOnline = () => {
            console.log('🌐 Conexão restaurada');
            setIsOnline(true);
            setShowOfflineModal(false);
            toast.success('✅ Conexão com a internet restaurada!');
        };

        const handleOffline = () => {
            console.log('📵 Conexão perdida');
            console.log('📵 Atualizando estados: isOnline=false, showOfflineModal=true');
            setIsOnline(false);
            setShowOfflineModal(true);
            toast.error('❌ Conexão com a internet perdida!');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial state and trigger modal if offline
        if (!navigator.onLine) {
            console.log('⚠️ App iniciou OFFLINE - mostrando modal');
            setIsOnline(false);
            setShowOfflineModal(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Prevent accidental page close/reload when there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleCreateQuiz = async (quizData: any) => {
        try {
            const supabase = createSupabaseClient();
            const courseRepo = new SupabaseCourseRepository(supabase);

            const quiz = new Quiz(
                existingQuiz?.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                lesson.id,
                quizData.title,
                quizData.description,
                quizData.passingScore,
                quizData.questions.map((q: any, idx: number) =>
                    new QuizQuestion(
                        q.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                        existingQuiz?.id || 'temp-quiz-id',
                        q.questionText,
                        q.questionType,
                        idx,
                        q.points,
                        q.options.map((o: any, oIdx: number) =>
                            new QuizOption(
                                o.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                                q.id || 'temp-q-id',
                                o.optionText,
                                o.isCorrect,
                                oIdx
                            )
                        )
                    )
                ),
                existingQuiz?.isManuallyReleased || false,
                quizData.questionsCount,
                quizData.poolDifficulty
            );

            // UPDATE se já existe, CREATE se novo
            if (existingQuiz) {
                const savedQuiz = await courseRepo.updateQuiz(quiz);
                setExistingQuiz(savedQuiz);
                toast.success('✅ Quiz atualizado com sucesso!');
            } else {
                const savedQuiz = await courseRepo.createQuiz(quiz);
                setExistingQuiz(savedQuiz);
                toast.success('✅ Quiz criado com sucesso!');
            }


            setShowQuizEditor(false);
        } catch (error) {
            console.error('Erro ao salvar quiz:', error);
            toast.error('❌ Erro ao salvar quiz: ' + (error as Error).message);
        }
    };

    const handleToggleQuizRelease = async () => {
        if (!existingQuiz) return;

        setIsTogglingRelease(true);
        try {
            const supabase = createSupabaseClient();
            const courseRepo = new SupabaseCourseRepository(supabase);

            const newReleaseState = !existingQuiz.isManuallyReleased;
            await courseRepo.toggleQuizRelease(existingQuiz.id, newReleaseState);

            // Recarregar quiz para atualizar estado
            const updatedQuiz = await courseRepo.getQuizByLessonId(lesson.id);
            setExistingQuiz(updatedQuiz);

            alert(newReleaseState
                ? '✅ Quiz liberado! Alunos podem acessar independente do progresso.'
                : '�� Quiz bloqueado. Alunos precisam completar 90% da aula.');
        } catch (error) {
            console.error('Erro ao alterar liberação do quiz:', error);
            toast.error('❌ Erro ao alterar liberação do quiz');
        } finally {
            setIsTogglingRelease(false);
        }
    };

    // Calcular posição da toolbar quando elemento ativo mudar
    useEffect(() => {
        if (activeEditableElement) {
            const updatePosition = () => {
                const rect = activeEditableElement.getBoundingClientRect();
                const container = activeEditableElement.closest('.overflow-y-auto') as HTMLElement;

                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    setToolbarPosition({
                        top: Math.max(10, rect.top - containerRect.top - 60),
                        left: rect.left - containerRect.left + rect.width / 2
                    });
                }
            };
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        } else {
            setToolbarPosition(null);
        }
    }, [activeEditableElement]);

    const handleSaveRequirements = async (requirements: import('../domain/lesson-requirements').LessonProgressRequirements) => {
        try {
            const supabase = createSupabaseClient();
            const courseRepo = new SupabaseCourseRepository(supabase);

            await courseRepo.saveLessonRequirements(requirements);
            setLessonRequirements(requirements);

            toast.success('✅ Requisitos salvos com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar requisitos:', error);
            throw error;
        }
    };

    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
    const savedSelectionRef = useRef<Range | null>(null); // Salva a seleção antes de perder foco

    // Importação de documentos
    const [isDocImporting, setIsDocImporting] = useState(false);
    const [docImportError, setDocImportError] = useState<string | null>(null);
    const docUploadInputRef = useRef<HTMLInputElement | null>(null);
    const [docPreviewHtml, setDocPreviewHtml] = useState<string | null>(null);
    const [isDocDragActive, setIsDocDragActive] = useState(false);

    // Importação/exportação de JSON (conteúdo)
    const jsonUploadInputRef = useRef<HTMLInputElement | null>(null);
    const [jsonImportError, setJsonImportError] = useState<string | null>(null);
    const [jsonImportSuccess, setJsonImportSuccess] = useState<string | null>(null);
    const [jsonImportMode, setJsonImportMode] = useState<'replace' | 'append' | 'prepend'>('replace');
    const [isJsonImporting, setIsJsonImporting] = useState(false);

    // Seleção em massa
    const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Auto-save
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

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
    // IMPORTANTE: sincroniza quando lesson.id OU content_blocks mudarem
    // Isso garante que ao navegar entre aulas, os blocos sejam recarregados corretamente
    useEffect(() => {
        console.log('🔄 Sincronizando blocos - NOVA LIÇÃO carregada');
        console.log('📦 Total de blocos recebidos:', lesson.content_blocks?.length);
        console.log('🆔 Lesson ID:', lesson.id);

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
        // Update videoUrls from lesson data
        if (lesson.video_urls && lesson.video_urls.length > 0) {
            setVideoUrls(lesson.video_urls);
        } else if (lesson.video_url) {
            setVideoUrls([{ url: lesson.video_url, title: 'Vídeo Principal' }]);
        } else {
            setVideoUrls([]);
        }
        setDurationSeconds(lesson.duration_seconds || 0);
        setImageUrl(lesson.image_url || '');
    }, [lesson.id, lesson.content_blocks, lesson.video_urls, lesson.video_url]); // Recarrega quando ID, blocos ou vídeos mudarem

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

    // Auto-save a cada 5 minutos
    useEffect(() => {
        const autoSaveInterval = setInterval(async () => {
            console.log('⏱️ Auto-save: Salvando automaticamente...');
            setIsAutoSaving(true);
            try {
                await handleSave();
                setLastAutoSave(new Date());
                console.log('✅ Auto-save: Salvamento automático concluído!');

                // Esconder notificação após 3 segundos
                setTimeout(() => {
                    setLastAutoSave(null);
                }, 3000);
            } catch (error) {
                console.error('❌ Auto-save: Erro no salvamento automático:', error);
            } finally {
                setIsAutoSaving(false);
            }
        }, 5 * 60 * 1000); // 5 minutos em milissegundos

        console.log('🔄 Auto-save ativado: salvamento a cada 5 minutos');

        // Cleanup: limpar intervalo ao desmontar componente
        return () => {
            clearInterval(autoSaveInterval);
            console.log('🛑 Auto-save desativado');
        };
    }, [blocks, title, videoUrls, durationSeconds, imageUrl]); // Dependências para recriar intervalo quando dados mudarem

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

        // Detectar tamanho da fonte
        const selection = window.getSelection();
        if (selection && selection.anchorNode) {
            let element = (selection.anchorNode.nodeType === 3
                ? selection.anchorNode.parentElement
                : selection.anchorNode) as HTMLElement;

            if (element) {
                // Estratégia de varredura manual: subir a árvore procurando style.fontSize inline
                let current = element;
                let foundInlineSize = null;

                // Subir até encontrar o bloco raiz ou o editor
                while (current && current.nodeType === 1 && !current.classList?.contains('lesson-block-content') && current !== editorRef.current) {
                    // 1. Checar estilo inline direto (mais confiável para nossos spans gerados)
                    if (current.style && current.style.fontSize) {
                        foundInlineSize = current.style.fontSize;
                        break;
                    }

                    current = current.parentElement as HTMLElement;
                }

                if (foundInlineSize) {
                    const size = parseInt(foundInlineSize);
                    if (!isNaN(size)) {
                        setCurrentFontSize(size.toString());
                        return;
                    }
                }

                // Fallback: Computed Style
                const computed = window.getComputedStyle(element).fontSize;
                if (computed && computed.endsWith('px')) {
                    const px = parseFloat(computed);
                    // Conversão padrão aproximada: 1pt = 1.333px
                    const pt = Math.round(px * 0.75);
                    setCurrentFontSize(pt.toString());
                }
            }
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const htmlContent = editorRef.current?.innerHTML || '';

            // Normalizar blocos: garantir que todos tenham spacing
            const normalizedBlocks = blocks.map(block => ({
                ...block,
                spacing: block.spacing !== undefined ? block.spacing : 0 // Padrão: Sem Espaço
            }));

            // Debug: verificar blocos antes de salvar
            console.log('🔍 SALVANDO - Total de blocos:', normalizedBlocks.length);
            console.log('🔍 SALVANDO - Blocos normalizados:', JSON.stringify(normalizedBlocks, null, 2));

            // Debug: verificar videoUrls
            console.log('🎬 SALVANDO - videoUrls state:', videoUrls);
            console.log('🎬 SALVANDO - videoUrls length:', videoUrls.length);
            console.log('🎬 SALVANDO - primeiro vídeo:', videoUrls.length > 0 ? videoUrls[0] : 'NENHUM');

            const metadataToSave = {
                title,
                video_url: videoUrls.length > 0 ? videoUrls[0].url : null, // First video for backward compatibility
                video_urls: videoUrls, // All videos
                audio_url: audioUrl,
                duration_seconds: Number(durationSeconds),
                image_url: imageUrl,
                content_blocks: normalizedBlocks
            };

            console.log('📤 SALVANDO - Metadata completa:', JSON.stringify(metadataToSave, null, 2));

            // Executar o save primeiro
            await onSave(htmlContent, metadataToSave);

            // APENAS reset unsaved changes tracking AFTER successful save
            initialBlocksRef.current = JSON.stringify(normalizedBlocks);
            setHasUnsavedChanges(false);
            setChangedBlocks(new Map());

            console.log('✅ Salvamento concluído com sucesso!');
            toast.success('✅ Aula salva com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            toast.error('❌ Erro ao salvar a aula. Verifique o console para detalhes.');
            // NÃO resetar hasUnsavedChanges aqui - manter o indicador de mudanças pendentes
        } finally {
            setIsSaving(false);
        }
    };

    const handleInput = () => {
        const htmlContent = editorRef.current?.innerHTML || '';
        setContent(htmlContent);
    };

    const updateActiveFormats = React.useCallback(() => {
        if (!document.hasFocus()) return;

        const formats: string[] = [];
        try {
            if (document.queryCommandState('bold')) formats.push('bold');
            if (document.queryCommandState('italic')) formats.push('italic');
            if (document.queryCommandState('underline')) formats.push('underline');
            if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
            if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
            if (document.queryCommandState('justifyRight')) formats.push('justifyRight');
            if (document.queryCommandState('justifyFull')) formats.push('justifyFull');
            if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
            if (document.queryCommandState('insertOrderedList')) formats.push('insertOrderedList');

            // Só atualizar se houver mudança para evitar re-renders infinitos
            setActiveFormats(prev => {
                if (JSON.stringify(prev) === JSON.stringify(formats)) return prev;
                return formats;
            });
        } catch (e) {
            // Ignorar erros se queryCommandState falhar (ex: nada selecionado)
        }
    }, []);

    const execCommand = React.useCallback((command: string, value?: string) => {
        console.log(`[RichText] Executing: ${command}`, value || '');

        const targetElement = activeEditableElement || editorRef.current;
        const selection = window.getSelection();

        if (targetElement) {
            console.log(`[RichText] Target found:`, targetElement.tagName, targetElement.getAttribute('data-block-id'));

            // Se for comando de estilo, garantir que o estilo não seja forçado por CSS
            if (command !== 'lineHeight') {
                document.execCommand('styleWithCSS', false, 'false');
            }

            // Manter a seleção focada
            targetElement.focus();

            if (command === 'lineHeight') {
                if (activeEditableElement) {
                    activeEditableElement.style.lineHeight = value || '1.6';
                    const event = new Event('input', { bubbles: true });
                    activeEditableElement.dispatchEvent(event);
                    // Also persist to block state for ContentReader
                    const blockId = activeEditableElement.closest('[data-block-id]')?.getAttribute('data-block-id');
                    if (blockId) {
                        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, lineHeight: value || '1.6' } : b));
                    }
                } else {
                    targetElement.style.lineHeight = value || '1.6';
                    handleInput();
                }
            } else if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
                // Manual list creation - execCommand is unreliable for lists
                const listTag = command === 'insertUnorderedList' ? 'ul' : 'ol';
                const otherListTag = command === 'insertUnorderedList' ? 'ol' : 'ul';
                const contentElement = activeEditableElement || targetElement;

                if (contentElement) {
                    const existingSameList = contentElement.querySelector(listTag);
                    const existingOtherList = contentElement.querySelector(otherListTag);

                    if (existingSameList) {
                        // Toggle off same list type - convert list items back to paragraphs
                        const listItems = existingSameList.querySelectorAll('li');
                        let newContent = '';
                        listItems.forEach(li => {
                            newContent += `<p>${li.innerHTML}</p>`;
                        });
                        existingSameList.outerHTML = newContent;
                    } else if (existingOtherList) {
                        // Switch list type - change ul to ol or vice versa
                        const listItems = existingOtherList.querySelectorAll('li');
                        let newListContent = `<${listTag}>`;
                        listItems.forEach(li => {
                            newListContent += `<li>${li.innerHTML}</li>`;
                        });
                        newListContent += `</${listTag}>`;
                        existingOtherList.outerHTML = newListContent;
                    } else {
                        // Create list from content - check for paragraphs first
                        const paragraphs = contentElement.querySelectorAll('p');
                        if (paragraphs.length > 0) {
                            // Convert paragraphs to list items
                            let listContent = `<${listTag}>`;
                            paragraphs.forEach(p => {
                                listContent += `<li>${p.innerHTML}</li>`;
                            });
                            listContent += `</${listTag}>`;
                            contentElement.innerHTML = listContent;
                        } else {
                            // No paragraphs - split by line breaks or wrap entire content
                            const content = contentElement.innerHTML;
                            const lines = content.split(/<br\s*\/?>/gi).filter(line => line.trim());

                            if (lines.length > 1) {
                                // Multiple lines - create list item per line
                                let listContent = `<${listTag}>`;
                                lines.forEach(line => {
                                    listContent += `<li>${line.trim()}</li>`;
                                });
                                listContent += `</${listTag}>`;
                                contentElement.innerHTML = listContent;
                            } else {
                                // Single content - wrap as single list item
                                contentElement.innerHTML = `<${listTag}><li>${content}</li></${listTag}>`;
                            }
                        }
                    }

                    console.log('[List] New content:', contentElement.innerHTML);

                    // Trigger update
                    const event = new Event('input', { bubbles: true });
                    contentElement.dispatchEvent(event);

                    // Also update block state
                    const blockId = contentElement.closest('[data-block-id]')?.getAttribute('data-block-id') ||
                        contentElement.getAttribute('data-block-id');
                    if (blockId) {
                        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, text: contentElement.innerHTML } : b));
                    }
                }

                updateActiveFormats();
            } else {
                // Restore selection before running commands that need it
                if (command === 'indent' || command === 'outdent' ||
                    command === 'bold' || command === 'italic' || command === 'underline') {
                    // Ensure we have a proper selection
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount === 0 && savedSelectionRef.current) {
                        sel.removeAllRanges();
                        sel.addRange(savedSelectionRef.current);
                    }
                }
                const success = document.execCommand(command, false, value || '');
                console.log(`[RichText] Success: ${success}`);

                if (activeEditableElement) {
                    const event = new Event('input', { bubbles: true });
                    activeEditableElement.dispatchEvent(event);
                } else {
                    handleInput();
                }

                // Atualizar estados imediatamente
                updateActiveFormats();
            }
        } else {
            console.warn('[RichText] No target element for command');
        }
    }, [activeEditableElement, updateActiveFormats]);

    // Monitorar mudanças na seleção para atualizar a barra de ferramentas
    useEffect(() => {
        let timeoutId: any;
        const handleSelectionChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const container = selection.getRangeAt(0).commonAncestorContainer;
                    const isInsideEditor = editorRef.current?.contains(container) ||
                        (activeEditableElement && activeEditableElement.contains(container));

                    if (isInsideEditor) {
                        updateActiveFormats();
                    }
                }
            }, 100);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            clearTimeout(timeoutId);
        };
    }, [updateActiveFormats, activeEditableElement]);

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
                toast.error('URL do YouTube inválida!');
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

    const convertHtmlToBlocks = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const candidates = Array.from(doc.body.children);
        const filtered = candidates.filter((element) => {
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            const hasMedia = element.querySelector('img,table,iframe,video,ul,ol');
            return text.length > 0 || !!hasMedia;
        });

        return filtered.map(element => ({
            id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            text: element.outerHTML,
            audioUrl: '',
            spacing: 0
        }));
    };

    const importDocFile = async (file: File) => {
        setDocImportError(null);
        setJsonImportError(null);

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'doc') {
            setDocImportError('Arquivos .doc antigos não são suportados. Converta para .docx antes de importar.');
            if (docUploadInputRef.current) docUploadInputRef.current.value = '';
            return;
        }
        if (extension !== 'docx') {
            setDocImportError('Selecione um arquivo .docx válido para importar.');
            if (docUploadInputRef.current) docUploadInputRef.current.value = '';
            return;
        }

        // Validar tamanho do arquivo (máximo 20MB)
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (file.size > MAX_FILE_SIZE) {
            setDocImportError('Documento muito grande. Tamanho máximo: 20MB');
            if (docUploadInputRef.current) docUploadInputRef.current.value = '';
            return;
        }

        setIsDocImporting(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const mammothModule = await import('mammoth/mammoth.browser');
            const mammoth = (mammothModule as any).default?.convertToHtml ? (mammothModule as any).default : mammothModule;

            // Configurar mammoth para preservar alinhamento de texto
            const options = {
                arrayBuffer,
                styleMap: [
                    // Preservar alinhamento de parágrafos
                    "p[style-name='center'] => p.text-center:fresh",
                    "p[style-name='Center'] => p.text-center:fresh",
                    "p[style-name='right'] => p.text-right:fresh",
                    "p[style-name='Right'] => p.text-right:fresh",
                    "p[style-name='justify'] => p.text-justify:fresh",
                    "p[style-name='Justify'] => p.text-justify:fresh",
                    // Preservar listas
                    "u => u",
                    "strike => s"
                ],
                convertImage: mammoth.images.imgElement((image: any) => {
                    return image.read("base64").then((imageBuffer: string) => {
                        return {
                            src: "data:" + image.contentType + ";base64," + imageBuffer
                        };
                    });
                })
            };

            const { value, messages } = await mammoth.convertToHtml(options);

            // Log de avisos do mammoth (útil para debug)
            if (messages.length > 0) {
                console.log('Avisos da conversão DOCX:', messages);
            }

            // Processar HTML para adicionar estilos inline de alinhamento
            let processedHtml = value || '';
            processedHtml = processedHtml.replace(/class="text-center"/g, 'style="text-align: center"');
            processedHtml = processedHtml.replace(/class="text-right"/g, 'style="text-align: right"');
            processedHtml = processedHtml.replace(/class="text-justify"/g, 'style="text-align: justify"');

            const newBlocks = convertHtmlToBlocks(processedHtml);
            if (newBlocks.length === 0) {
                throw new Error('Documento sem blocos válidos');
            }

            setBlocks(prev => [...prev, ...newBlocks]);
            setExpandedBlockId(newBlocks[0]?.id || null);
            setDocPreviewHtml(processedHtml);
        } catch (error) {
            console.error('Erro ao importar documento', error);
            const errorMessage = error instanceof Error
                ? `Erro: ${error.message}`
                : 'Não foi possível importar o arquivo. Confirme se o DOCX está válido e tente novamente.';
            setDocImportError(errorMessage);
        } finally {
            setIsDocImporting(false);
            if (docUploadInputRef.current) {
                docUploadInputRef.current.value = '';
            }
        }
    };

    const handleDocFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        await importDocFile(file);
    };

    // Função para importar arquivos Markdown
    const importMarkdownFile = async (file: File) => {
        try {
            const text = await file.text();
            const html = await marked.parse(text); // Converte Markdown para HTML
            const newBlocks = convertHtmlToBlocks(html);
            setBlocks(prev => [...prev, ...newBlocks]);
        } catch (error) {
            console.error('Erro ao importar Markdown:', error);
            alert('Erro ao processar arquivo Markdown');
        }
    };

    // Handler para o input de arquivo Markdown
    const handleMarkdownFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.md')) {
            await importMarkdownFile(file);
        } else {
            alert('Por favor, selecione um arquivo .md (Markdown)');
        }
    };




    const handleDocxDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDocDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            await importDocFile(file);
        }
    };

    const handleDocxDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDocDragActive(true);
    };

    const handleDocxDragLeave = () => setIsDocDragActive(false);

    const handleJsonExport = () => {
        const payload = {
            version: '1.0',
            lessonId: lesson.id,
            generatedAt: new Date().toISOString(),
            blocks
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${lesson.title || 'conteudo'}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    // Converter JSON estruturado de documento Word em blocos HTML
    const convertStructuredJsonToBlocks = (contentItems: any[]): Block[] => {
        return contentItems.map((item) => {
            let combinedText = '';
            const runs = item.runs || [];

            for (const run of runs) {
                let text = run.text || '';
                if (run.bold) text = `<strong>${text}</strong>`;
                if (run.italic) text = `<em>${text}</em>`;
                if (run.underline) text = `<u>${text}</u>`;
                if (run.strike) text = `<s>${text}</s>`;
                if (run.fontSize) text = `<span style="font-size: ${run.fontSize}pt">${text}</span>`;
                if (run.color && run.color !== 'auto') text = `<span style="color: #${run.color}">${text}</span>`;
                combinedText += text;
            }

            if (!combinedText.trim()) combinedText = '<br>';

            let htmlElement = 'p';
            let styleAttr = '';

            if (item.type === 'heading') htmlElement = `h${item.level || 1}`;

            if (item.style?.alignment) {
                const alignMap: Record<string, string> = { 'center': 'center', 'right': 'right', 'both': 'justify', 'left': 'left' };
                const align = alignMap[item.style.alignment] || 'left';
                if (align !== 'left') styleAttr += `text-align: ${align};`;
            }

            if (item.style?.indentation) {
                if (item.style.indentation.left) styleAttr += `margin-left: ${item.style.indentation.left / 20}pt;`;
                if (item.style.indentation.firstLine) styleAttr += `text-indent: ${item.style.indentation.firstLine / 20}pt;`;
            }

            const styleAttribute = styleAttr ? ` style="${styleAttr}"` : '';
            const htmlText = `<${htmlElement}${styleAttribute}>${combinedText}</${htmlElement}>`;

            return {
                id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                text: htmlText,
                audioUrl: '',
                spacing: item.style?.spacing?.after ? Math.round(item.style.spacing.after / 100) : 0
            };
        });
    };

    const importJsonContent = async (file: File, mode: 'replace' | 'append' | 'prepend' = jsonImportMode) => {
        setJsonImportError(null);
        setJsonImportSuccess(null);
        setIsJsonImporting(true);

        // 1. Validar tamanho do arquivo (máximo 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            setJsonImportError('Arquivo muito grande. Tamanho máximo: 10MB');
            setIsJsonImporting(false);
            if (jsonUploadInputRef.current) {
                jsonUploadInputRef.current.value = '';
            }
            return;
        }

        try {
            // 2. Ler arquivo
            const text = await file.text();
            const parsed = JSON.parse(text);

            // 3. Detectar e converter formato estruturado de documento Word
            let incomingBlocks: any[] = [];

            if (Array.isArray(parsed)) {
                // Formato: array direto de blocos
                incomingBlocks = parsed;
            } else if (parsed.content && Array.isArray(parsed.content)) {
                // Formato estruturado de documento Word com "content" e "runs"
                console.log('📄 Detectado formato estruturado de documento Word, convertendo...');
                incomingBlocks = convertStructuredJsonToBlocks(parsed.content);
            } else if (parsed.blocks || parsed.content_blocks) {
                // Formato padrão do sistema
                incomingBlocks = parsed.blocks || parsed.content_blocks;
            }

            // 4. Validar existência de blocos
            if (!Array.isArray(incomingBlocks) || incomingBlocks.length === 0) {
                throw new Error('JSON sem blocos válidos.');
            }

            // 5. Validar limite máximo de blocos
            if (incomingBlocks.length > 5000) {
                throw new Error(`Arquivo contém muitos blocos (${incomingBlocks.length}). Máximo permitido: 5000`);
            }

            // 6. Validar estrutura de cada bloco
            const invalidBlocks = incomingBlocks.filter((b: any, idx: number) => {
                if (typeof b !== 'object' || b === null) return true;
                if (b.text !== undefined && typeof b.text !== 'string') return true;
                if (b.spacing !== undefined && typeof b.spacing !== 'number') return true;
                if (b.audioUrl !== undefined && typeof b.audioUrl !== 'string') return true;
                if (b.audio_url !== undefined && typeof b.audio_url !== 'string') return true;
                return false;
            });

            if (invalidBlocks.length > 0) {
                throw new Error(`Encontrados ${invalidBlocks.length} bloco(s) com formato inválido.`);
            }

            // 7. Confirmar se há conteúdo existente e modo é 'replace'
            if (blocks.length > 0 && mode === 'replace') {
                const confirmReplace = window.confirm(
                    `⚠️ Atenção: Você possui ${blocks.length} bloco(s) de conteúdo.\n\n` +
                    `Importar este arquivo JSON irá SUBSTITUIR todo o conteúdo atual.\n\n` +
                    `Deseja continuar?`
                );

                if (!confirmReplace) {
                    setIsJsonImporting(false);
                    if (jsonUploadInputRef.current) {
                        jsonUploadInputRef.current.value = '';
                    }
                    return;
                }
            }

            // 8. Normalizar blocos
            const normalized = incomingBlocks.map((b: any) => ({
                id: b.id || (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                text: b.text || '',
                audioUrl: b.audioUrl || b.audio_url || '',
                spacing: b.spacing || 0
            }));

            // 9. Aplicar modo de importação
            let resultBlocks: Block[];
            if (mode === 'replace') {
                resultBlocks = normalized;
            } else if (mode === 'append') {
                resultBlocks = [...blocks, ...normalized];
            } else { // prepend
                resultBlocks = [...normalized, ...blocks];
            }

            setBlocks(resultBlocks);
            setExpandedBlockId(normalized[0]?.id || null);

            // 10. Feedback de sucesso
            const modeLabels = {
                replace: 'substituídos',
                append: 'adicionados ao final',
                prepend: 'adicionados ao início'
            };

            setJsonImportSuccess(
                `✅ ${normalized.length} bloco(s) ${modeLabels[mode]} com sucesso!`
            );

            // Limpar mensagem de sucesso após 5 segundos
            setTimeout(() => setJsonImportSuccess(null), 5000);

        } catch (err: any) {
            console.error('Erro ao importar JSON', err);
            const message = err?.message || 'Falha ao ler JSON. Verifique se o arquivo está no formato correto.';
            setJsonImportError(message);
        } finally {
            setIsJsonImporting(false);
            if (jsonUploadInputRef.current) {
                jsonUploadInputRef.current.value = '';
            }
        }
    };

    const handleJsonFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await importJsonContent(file);
    };

    // Handler para importação via texto colado (JSON ou MD)
    const handlePastedImport = async () => {
        if (!pastedContent.trim() || !importType) return;

        try {
            if (importType === 'json') {
                // Criar File virtual a partir do texto
                const blob = new Blob([pastedContent], { type: 'application/json' });
                const file = new File([blob], 'pasted-content.json', { type: 'application/json' });
                await importJsonContent(file);
            } else if (importType === 'md') {
                // Para MD, converter Markdown to HTML e criar blocos
                const html = await marked(pastedContent);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                // Criar blocos a partir do HTML
                const paragraphs = tempDiv.querySelectorAll('p, h1, h2, h3, ul, ol');
                const newBlocks = Array.from(paragraphs).map((el, idx) => ({
                    id: `block-paste-${Date.now()}-${idx}`,
                    text: el.outerHTML,
                    spacing: el.tagName.match(/^H[1-3]$/) ? 1.5 : 0,
                    audioUrl: '',
                    lineHeight: '1.8'
                }));

                // Aplicar modo de importação
                if (jsonImportMode === 'replace') {
                    setBlocks(newBlocks);
                } else if (jsonImportMode === 'append') {
                    setBlocks(prev => [...prev, ...newBlocks]);
                } else {
                    setBlocks(prev => [...newBlocks, ...prev]);
                }

                toast.success(`✅ ${newBlocks.length} bloco(s) importados do Markdown!`);
            }

            // Fechar modal e limpar
            setShowImportMethodModal(false);
            setPastedContent('');
        } catch (error: any) {
            toast.error(`❌ Erro ao processar ${importType.toUpperCase()}: ${error.message}`);
        }
    };

    const updateBlock = React.useCallback((id: string, updates: any) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }, []);

    const toggleBlockFeatured = React.useCallback((id: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, featured: !b.featured } : b));
    }, []);

    const removeBlock = React.useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }, []);

    // Copiar conteúdo do bloco para clipboard
    const copyBlockContent = React.useCallback(async (blockId: string) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;

        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = block.text;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([block.text], { type: 'text/html' }),
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            });
            await navigator.clipboard.write([clipboardItem]);

            alert('Conteúdo copiado com formatação preservada!');
        } catch (error) {
            console.error('❌ Erro ao copiar bloco:', error);
            alert('Erro ao copiar conteúdo. Por favor, tente novamente.');
        }
    }, [blocks]);

    // Recortar bloco (copiar + deletar)
    const cutBlockContent = React.useCallback(async (blockId: string) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;

        if (window.confirm('Deseja recortar este bloco? Ele será copiado e removido.')) {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = block.text;
                const plainText = tempDiv.textContent || tempDiv.innerText || '';

                const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([block.text], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                });

                await navigator.clipboard.write([clipboardItem]);

                // Depois remover
                removeBlock(blockId);
            } catch (error) {
                console.error('❌ Erro ao recortar bloco:', error);
                alert('Erro ao recortar conteúdo. Por favor, tente novamente.');
            }
        }
    }, [blocks, removeBlock]);

    // Copiar blocos selecionados em massa
    const copySelectedBlocks = React.useCallback(async () => {
        if (selectedBlocks.size === 0) return;

        try {
            const selectedBlocksArray = blocks.filter(b => selectedBlocks.has(b.id));
            const combinedHTML = selectedBlocksArray.map(b => b.text).join('\n');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = combinedHTML;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';

            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([combinedHTML], { type: 'text/html' }),
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipboardItem]);
            alert(`${selectedBlocks.size} bloco(s) copiado(s) com formatação preservada!`);
        } catch (error) {
            console.error('Erro ao copiar blocos:', error);
            alert('Erro ao copiar blocos selecionados.');
        }
    }, [blocks, selectedBlocks]);

    // Recortar blocos selecionados em massa
    const cutSelectedBlocks = React.useCallback(async () => {
        if (selectedBlocks.size === 0) return;

        if (window.confirm(`Deseja recortar ${selectedBlocks.size} bloco(s)? Eles serão removidos após serem copiados.`)) {
            try {
                const selectedBlocksArray = blocks.filter(b => selectedBlocks.has(b.id));
                const combinedHTML = selectedBlocksArray.map(b => b.text).join('\n');

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = combinedHTML;
                const plainText = tempDiv.textContent || tempDiv.innerText || '';

                const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([combinedHTML], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                });

                await navigator.clipboard.write([clipboardItem]);

                // Remover blocos selecionados
                setBlocks(prev => prev.filter(b => !selectedBlocks.has(b.id)));
                setSelectedBlocks(new Set());
            } catch (error) {
                console.error('Erro ao recortar blocos:', error);
                alert('Erro ao recortar blocos selecionados.');
            }
        }
    }, [blocks, selectedBlocks]);

    // Adicionar bloco em posição específica
    const addBlockAtPosition = React.useCallback((position: number) => {
        const newBlock: Block = {
            id: `block-${Date.now()}-${Math.random()}`,
            text: '<p>Digite aqui...</p>',
            audioUrl: '',
            spacing: 8
        };

        setBlocks(prev => {
            const newBlocks = [...prev];
            newBlocks.splice(position, 0, newBlock); // Insere ANTES do bloco atual
            return newBlocks;
        });
        setExpandedBlockId(newBlock.id);
    }, []);

    const moveBlock = React.useCallback((index: number, direction: 'up' | 'down') => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;

            const temp = newBlocks[index];
            newBlocks[index] = newBlocks[targetIndex];
            newBlocks[targetIndex] = temp;
            return newBlocks;
        });
    }, []);

    // Funções de seleção em massa
    const toggleBlockSelection = (blockId: string) => {
        const newSelected = new Set(selectedBlocks);
        if (newSelected.has(blockId)) {
            newSelected.delete(blockId);
        } else {
            newSelected.add(blockId);
        }
        setSelectedBlocks(newSelected);
    };

    const selectAllBlocks = () => {
        const allIds = new Set(blocks.map(b => b.id));
        setSelectedBlocks(allIds);
    };

    const deselectAllBlocks = () => {
        setSelectedBlocks(new Set());
    };

    const deleteSelectedBlocks = () => {
        if (selectedBlocks.size === 0) return;

        if (window.confirm(`Deseja realmente excluir ${selectedBlocks.size} bloco(s) selecionado(s)?`)) {
            setBlocks(blocks.filter(b => !selectedBlocks.has(b.id)));
            setSelectedBlocks(new Set());
            setIsSelectionMode(false);
        }
    };

    const applyBulkFormatting = React.useCallback((command: string, value: string = '') => {
        if (selectedBlocks.size === 0) return;

        setBlocks(prev => prev.map(block => {
            if (selectedBlocks.has(block.id)) {
                // Criar um elemento temporário fora do DOM visível
                const container = document.createElement('div');
                container.innerHTML = block.text;
                container.contentEditable = 'true';
                container.style.position = 'fixed';
                container.style.left = '-9999px';
                document.body.appendChild(container);

                const range = document.createRange();
                range.selectNodeContents(container);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);

                if (command === 'fontSize') {
                    document.execCommand('fontSize', false, '7');
                    const fontElements = container.querySelectorAll('font[size="7"]');
                    fontElements.forEach(font => {
                        const span = document.createElement('span');
                        span.style.fontSize = `${value}pt`;
                        span.innerHTML = font.innerHTML;
                        font.parentNode?.replaceChild(span, font);
                    });
                } else if (command === 'lineHeight') {
                    // Just clean up and return with lineHeight property
                    const newText = container.innerHTML;
                    document.body.removeChild(container);
                    return { ...block, text: newText, lineHeight: value || '1.6' };
                } else if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
                    // Special handling for list commands - wrap content manually
                    const listTag = command === 'insertUnorderedList' ? 'ul' : 'ol';
                    const existingList = container.querySelector(listTag);

                    if (existingList) {
                        // If already has this list type, unwrap it
                        const listItems = existingList.querySelectorAll('li');
                        let newContent = '';
                        listItems.forEach(li => {
                            newContent += `<p>${li.innerHTML}</p>`;
                        });
                        container.innerHTML = newContent;
                    } else {
                        // Create list from paragraphs or direct content
                        const paragraphs = container.querySelectorAll('p');
                        if (paragraphs.length > 0) {
                            let listContent = `<${listTag}>`;
                            paragraphs.forEach(p => {
                                listContent += `<li>${p.innerHTML}</li>`;
                            });
                            listContent += `</${listTag}>`;
                            container.innerHTML = listContent;
                        } else {
                            // Wrap entire content as single list item
                            const content = container.innerHTML;
                            container.innerHTML = `<${listTag}><li>${content}</li></${listTag}>`;
                        }
                    }

                    const newText = container.innerHTML;
                    document.body.removeChild(container);
                    return { ...block, text: newText };
                } else {
                    // Forçar HTML tags em massa também
                    container.focus();
                    document.execCommand('styleWithCSS', false, 'false');
                    document.execCommand(command, false, value);
                }

                const newText = container.innerHTML;
                document.body.removeChild(container);
                return { ...block, text: newText };
            }
            return block;
        }));
    }, [selectedBlocks]);

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

    const convertDropboxUrl = (url: string): string => {
        if (!url) return url;

        // Detecta links do Dropbox
        if (url.includes('dropbox.com')) {
            // Caso seja link de compartilhamento padrão
            // Muda dl=0 para dl=1 para forçar download/stream direto
            if (url.includes('dl=0')) {
                return url.replace('dl=0', 'dl=1');
            }
            // Se não tiver o parâmetro dl, adiciona
            if (!url.includes('dl=')) {
                const separator = url.includes('?') ? '&' : '?';
                return `${url}${separator}dl=1`;
            }
        }

        return url;
    };

    const handleAudioUrlChange = (url: string) => {
        // Converte automaticamente se for URL do Google Drive ou Dropbox
        let convertedUrl = convertGoogleDriveUrl(url);
        convertedUrl = convertDropboxUrl(convertedUrl);
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
            text: `<img src="${url}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" alt="Imagem do conteúdo" /><p><br></p>`,
            audioUrl: '',
            spacing: 0
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex, 0, newBlock);
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
            spacing: 0
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex, 0, newBlock);
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
            spacing: 0
        };

        if (atIndex !== undefined) {
            const newBlocks = [...blocks];
            newBlocks.splice(atIndex, 0, newBlock);
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



    const handleSaveResource = async (data: { title: string; resourceType: LessonResourceRecord['resource_type']; url: string; category: string }) => {
        if (!lesson.id) return;
        try {
            const repo = new SupabaseAdminRepository();
            let finalUrl = data.url;
            if (data.resourceType === 'AUDIO') {
                finalUrl = convertGoogleDriveUrl(finalUrl);
                finalUrl = convertDropboxUrl(finalUrl);
            }

            await repo.createLessonResource(lesson.id, {
                title: data.title,
                resourceType: data.resourceType,
                url: finalUrl,
                category: data.category,
                position: lessonResources.length + 1
            });

            // Recarregar lista em vez de reload na página
            await fetchLessonResources();
        } catch (error) {
            console.error('Erro ao salvar material:', error);
            alert('Erro ao salvar material.');
        }
    };

    const handleDeleteResource = async (resourceId: string) => {
        if (!confirm('Tem certeza que deseja remover este material?')) return;
        try {
            const repo = new SupabaseAdminRepository();
            await repo.deleteLessonResource(resourceId);
            await fetchLessonResources();
        } catch (error) {
            console.error('Erro ao excluir material:', error);
            alert('Erro ao excluir material.');
        }
    };


    return (
        <div className="h-[100dvh] bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
            {/* Header fixo */}
            <div className="z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="px-8 py-4">
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
                                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {title}
                                </h1>
                                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">
                                    Editor de Conteúdo
                                </p>
                            </div>
                        </div>

                        {/* Tabs removidos - agora tudo em uma tela */}

                        {/* Botões de ação */}
                        <div className="flex items-center gap-6">

                            {/* Botão único para gestão de Quiz */}
                            <button
                                onClick={() => setShowQuizManagementModal(true)}
                                className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase bg-purple-600 text-white border border-transparent hover:bg-purple-700 dark:bg-transparent dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-500/20 dark:hover:border-purple-400"
                                title="Gerenciar quiz desta aula"
                            >
                                <i className="fas fa-clipboard-question text-[10px]"></i>
                                QUIZ
                            </button>

                            <button
                                onClick={() => setShowImportExportModal(true)}
                                className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase bg-teal-600 text-white border border-transparent hover:bg-teal-700 dark:bg-transparent dark:border-teal-500 dark:text-teal-400 dark:hover:bg-teal-500/20 dark:hover:border-teal-400"
                                title="Importar ou exportar conteúdo (DOCX, JSON, MD)"
                            >
                                <i className="fas fa-file-import text-[10px]"></i>
                                IMPORTAR/EXPORTAR
                            </button>




                            <button
                                onClick={() => setShowMaterialModal(true)}
                                className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-transparent dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-400/20 dark:hover:border-slate-300"
                                title="Adicionar material complementar"
                            >
                                <i className="fas fa-paperclip text-[10px]"></i>
                                Material
                            </button>

                            {/* Unsaved Changes Indicator */}
                            {hasUnsavedChanges && (
                                <button
                                    onClick={() => setShowChangesModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg animate-in slide-in-from-left-2 duration-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer"
                                    title="Clique para ver detalhes das alterações"
                                >
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                        {changedBlocks.size} Alteraç{changedBlocks.size === 1 ? 'ão' : 'ões'} não salva{changedBlocks.size === 1 ? '' : 's'}
                                    </span>
                                    <i className="fas fa-chevron-right text-[8px] text-amber-600 dark:text-amber-500"></i>
                                </button>
                            )}

                            {/* Network Status Indicator */}
                            {!isOnline && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in slide-in-from-left-2 duration-300">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </div>
                                    <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                        Sem conexão
                                    </span>
                                </div>
                            )}

                            {/* 6. Botão Salvar */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isOnline}
                                className="h-9 px-3 rounded-lg bg-blue-600 text-white border border-transparent hover:bg-blue-700 dark:bg-transparent dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-500/20 dark:hover:border-blue-400 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-[10px] uppercase"
                                title={!isOnline ? 'Não é possível salvar sem conexão com a internet' : ''}
                            >
                                {isSaving ? (
                                    <>
                                        <i className="fas fa-circle-notch animate-spin text-[10px]"></i>
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save text-[10px]"></i>
                                        Salvar
                                    </>
                                )}
                            </button>

                            {/* 7. Botão Config. da Aula - apenas ícone */}
                            <button
                                onClick={() => setShowMetadata(!showMetadata)}
                                className={`h-9 w-9 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center ml-auto ${showMetadata
                                    ? 'bg-slate-700 text-white border border-slate-600'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 dark:bg-transparent dark:border-slate-400 dark:text-slate-300 dark:hover:bg-slate-400/20 dark:hover:border-slate-300'
                                    }`}
                                title="Configurações da Aula"
                            >
                                <i className="fas fa-cog text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>


                {/* Element Resize Toolbar */}
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
            <div className={`flex-1 flex flex-col overflow-hidden ${forceLightMode ? 'bg-slate-100' : 'bg-slate-100 dark:bg-black/20'} relative`}>
                {/* Indicador de Auto-Save */}
                {(isAutoSaving || lastAutoSave) && (
                    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                        {isAutoSaving ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                                <i className="fas fa-sync fa-spin text-sm"></i>
                                <span className="text-xs font-bold">Salvando automaticamente...</span>
                            </div>
                        ) : lastAutoSave && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl shadow-lg">
                                <i className="fas fa-check-circle text-sm"></i>
                                <span className="text-xs font-bold">
                                    Último salvamento: {lastAutoSave.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                )}

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
                                // Apply same filters as block manager, but always include expanded block
                                blocks
                                    .filter((rawBlock) => {
                                        const block = typeof rawBlock === 'string'
                                            ? { id: `legacy-${blocks.indexOf(rawBlock)}`, text: rawBlock, audioUrl: '' }
                                            : rawBlock;

                                        // Always include the expanded block
                                        if (expandedBlockId && block.id === expandedBlockId) {
                                            return true;
                                        }

                                        // Otherwise apply audio filter
                                        if (audioFilter === 'all') return true;

                                        if (audioFilter === 'with-audio') {
                                            return block.audioUrl && block.audioUrl.trim() !== '';
                                        } else if (audioFilter === 'without-audio') {
                                            return !block.audioUrl || block.audioUrl.trim() === '';
                                        }
                                        return true;
                                    })
                                    .slice(
                                        blocksPerPage === 'all' ? 0 : (currentPage - 1) * blocksPerPage,
                                        blocksPerPage === 'all' ? undefined : currentPage * blocksPerPage
                                    )
                                    .map((rawBlock, filteredIndex) => {
                                        // Find original index to preserve block ID and data
                                        const originalIndex = blocks.indexOf(rawBlock);
                                        const block = typeof rawBlock === 'string'
                                            ? { id: `legacy-${originalIndex}`, text: rawBlock, audioUrl: '' }
                                            : rawBlock;

                                        const text = block.text || '';
                                        const spacing = block.spacing !== undefined ? block.spacing : 0;
                                        const spacingClass = spacing === 0 ? 'mb-0' : spacing === 4 ? 'mb-4' : spacing === 8 ? 'mb-8' : spacing === 12 ? 'mb-12' : spacing === 16 ? 'mb-16' : spacing === 24 ? 'mb-24' : 'mb-8';

                                        return (
                                            <div
                                                key={block.id || originalIndex}
                                                data-block-id={block.id}
                                                onClick={() => {
                                                    // Scroll to corresponding block in manager
                                                    const blockElement = document.querySelector(`[data-block-id="${block.id}"][class*="bg-white dark:bg-slate-900/50"]`);
                                                    if (blockElement) {
                                                        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        // Expand the block
                                                        setExpandedBlockId(block.id);
                                                        // Add highlight flash animation
                                                        blockElement.classList.add('highlight-flash');
                                                        setTimeout(() => {
                                                            blockElement.classList.remove('highlight-flash');
                                                        }, 1200);
                                                    }
                                                }}
                                                className={`relative p-2 md:p-4 rounded-2xl border transition-all cursor-pointer duration-300 ${spacingClass} ${expandedBlockId === block.id
                                                    ? previewTheme === 'light'
                                                        ? 'bg-indigo-50 border-indigo-400 ring-4 ring-indigo-300/50 shadow-lg shadow-indigo-500/20 text-slate-700'
                                                        : 'bg-indigo-900/30 border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/30 text-slate-200'
                                                    : block.featured
                                                        ? previewTheme === 'light'
                                                            ? 'bg-yellow-50 border-l-4 border-l-yellow-500 border-y-slate-100 border-r-slate-100 text-slate-700 shadow-sm'
                                                            : 'bg-yellow-900/10 border-l-4 border-l-yellow-500 border-y-slate-800 border-r-slate-800 text-slate-200 shadow-sm'
                                                        : previewTheme === 'light'
                                                            ? 'bg-white border-transparent text-slate-700 hover:bg-indigo-50/30 hover:ring-2 hover:ring-indigo-500/50'
                                                            : 'bg-slate-900/30 border-transparent text-slate-200 hover:bg-slate-800/50 hover:ring-2 hover:ring-indigo-500/50'
                                                    }`}
                                                title={expandedBlockId === block.id ? "Este bloco está sendo editado" : "Clique para localizar este bloco no gerenciador"}
                                            >
                                                {/* Active Block Indicator */}
                                                {expandedBlockId === block.id && (
                                                    <div className="absolute -top-3 -right-3 z-10">
                                                        <div className="bg-indigo-600 dark:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow-lg border-2 border-white dark:border-slate-900 animate-pulse">
                                                            <i className="fas fa-edit mr-1"></i>
                                                            Editando
                                                        </div>
                                                    </div>
                                                )}
                                                {text && <div className="editor-content w-full text-sm" style={{ lineHeight: block.lineHeight || '1.6' }} dangerouslySetInnerHTML={{ __html: text }} />}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>

                    {/* Coluna Direita: Gerenciador de Blocos */}
                    <div className="flex flex-col h-full min-h-0">
                        {/* Header Fixo */}
                        <div className="mb-4 px-2 flex-shrink-0">
                            <div>
                                <h2 className={`text-2xl font-black tracking-tight ${forceLightMode ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>Gerenciador de Blocos</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sincronize parágrafos e áudios com precisão.</p>
                            </div>
                        </div>


                        {/* Barra de Ferramentas de Seleção em Massa */}
                        {blocks.length > 0 && (
                            <div className="mb-4 px-2 flex flex-wrap items-center justify-start gap-3 gap-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setIsSelectionMode(!isSelectionMode);
                                            if (isSelectionMode) setSelectedBlocks(new Set());
                                        }}
                                        className={`h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase shadow-lg ${isSelectionMode
                                            ? 'bg-indigo-600 text-white border border-transparent hover:bg-indigo-700 dark:bg-transparent dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-400'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 shadow-sm'
                                            }`}
                                        title="Ativar modo de seleção"
                                    >
                                        {isSelectionMode ? (
                                            <i className="fas fa-check-square text-[10px] animate-in zoom-in duration-300"></i>
                                        ) : (
                                            <i className="far fa-square text-[10px]"></i>
                                        )}
                                        {isSelectionMode ? 'Selecionando' : 'Selecionar'}
                                    </button>

                                    {/* Audio Filter Dropdown */}
                                    <div className="relative">
                                        <select
                                            value={audioFilter}
                                            onChange={(e) => setAudioFilter(e.target.value as 'all' | 'with-audio' | 'without-audio')}
                                            className="h-9 px-3 pr-8 rounded-lg font-semibold transition-all active:scale-95 text-[10px] uppercase shadow-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer appearance-none"
                                            title="Filtrar blocos por áudio"
                                        >
                                            <option value="all">📋 Todos os Blocos</option>
                                            <option value="with-audio">🔊 Com Áudio</option>
                                            <option value="without-audio">🔇 Sem Áudio</option>
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
                                    </div>

                                    {/* Filter Count Indicator */}
                                    {audioFilter !== 'all' && (
                                        <div className="h-9 px-3 flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-in slide-in-from-left-2 duration-300">
                                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                                                {blocks.filter((rawBlock) => {
                                                    const block = typeof rawBlock === 'string' ? { audioUrl: '' } : rawBlock;
                                                    if (audioFilter === 'with-audio') return block.audioUrl && block.audioUrl.trim() !== '';
                                                    if (audioFilter === 'without-audio') return !block.audioUrl || block.audioUrl.trim() === '';
                                                    return true;
                                                }).length}
                                            </span>
                                            <span className="text-[7px] font-black text-indigo-500 dark:text-indigo-600 uppercase tracking-tighter">
                                                de {blocks.length}
                                            </span>
                                        </div>
                                    )}

                                    {/* Pagination Dropdown with Custom Input */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <select
                                                value={typeof blocksPerPage === 'number' && ![10, 20, 50].includes(blocksPerPage) ? 'custom' : blocksPerPage}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === 'all') {
                                                        setBlocksPerPage('all');
                                                        setCurrentPage(1);
                                                    } else if (value === 'custom') {
                                                        // Prompt user for custom value
                                                        const currentCustomValue = typeof blocksPerPage === 'number' && ![10, 20, 50].includes(blocksPerPage) ? blocksPerPage : 15;
                                                        const input = prompt('Quantos blocos você deseja exibir por página?', currentCustomValue.toString());

                                                        if (input !== null) { // User didn't cancel
                                                            const customValue = parseInt(input);
                                                            if (!isNaN(customValue) && customValue >= 1 && customValue <= 999) {
                                                                setBlocksPerPage(customValue);
                                                                setCurrentPage(1);
                                                                toast.success(`✅ Exibindo ${customValue} blocos por página`);
                                                            } else {
                                                                toast.error('❌ Valor inválido! Digite um número entre 1 e 999.');
                                                                // Revert to previous value or 'all'
                                                                if (blocksPerPage === 'all' || typeof blocksPerPage !== 'number') {
                                                                    setBlocksPerPage('all');
                                                                }
                                                            }
                                                        } else {
                                                            // User cancelled - revert to previous value
                                                            if (blocksPerPage === 'all' || typeof blocksPerPage !== 'number') {
                                                                setBlocksPerPage('all');
                                                            }
                                                        }
                                                    } else {
                                                        setBlocksPerPage(parseInt(value));
                                                        setCurrentPage(1);
                                                    }
                                                }}
                                                className="h-9 px-3 pr-8 rounded-lg font-semibold transition-all active:scale-95 text-[10px] uppercase shadow-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer appearance-none"
                                                title="Quantidade de blocos por página"
                                            >
                                                <option value="10">📄 10 por página</option>
                                                <option value="20">📄 20 por página</option>
                                                <option value="50">📄 50 por página</option>
                                                <option value="custom">✏️ Personalizado</option>
                                                <option value="all">📚 Todos</option>
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
                                        </div>

                                        {/* Edit button - shown when custom value is active */}
                                        {typeof blocksPerPage === 'number' && ![10, 20, 50].includes(blocksPerPage) && (
                                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                                <div className="h-9 px-3 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        {blocksPerPage}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const input = prompt('Quantos blocos você deseja exibir por página?', blocksPerPage.toString());

                                                        if (input !== null) {
                                                            const customValue = parseInt(input);
                                                            if (!isNaN(customValue) && customValue >= 1 && customValue <= 999) {
                                                                setBlocksPerPage(customValue);
                                                                setCurrentPage(1);
                                                                toast.success(`✅ Exibindo ${customValue} blocos por página`);
                                                            } else {
                                                                toast.error('❌ Valor inválido! Digite um número entre 1 e 999.');
                                                            }
                                                        }
                                                    }}
                                                    className="h-9 w-9 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center text-xs shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 dark:bg-transparent dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-400"
                                                    title="Editar quantidade personalizada"
                                                >
                                                    <i className="fas fa-edit text-xs"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Clear Filter Button */}
                                    {(audioFilter !== 'all' || blocksPerPage !== 'all') && (
                                        <button
                                            onClick={() => {
                                                setAudioFilter('all');
                                                setBlocksPerPage('all');
                                                setCurrentPage(1);
                                            }}
                                            className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase shadow-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 animate-in slide-in-from-left-2 duration-300"
                                            title="Limpar todos os filtros e voltar ao estado original"
                                        >
                                            <i className="fas fa-eraser text-[10px]"></i>
                                            Limpar Filtro
                                        </button>
                                    )}

                                    {isSelectionMode && (
                                        <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                                            <button
                                                onClick={selectAllBlocks}
                                                className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase bg-slate-800 dark:bg-transparent dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600/20 text-white"
                                                title="Selecionar todos os blocos"
                                            >
                                                <i className="fas fa-check-double text-[10px]"></i>
                                                Todos
                                            </button>
                                            <button
                                                onClick={deselectAllBlocks}
                                                className="h-9 px-3 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-1.5 text-[10px] uppercase bg-slate-800 dark:bg-transparent dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600/20 text-white"
                                                title="Desmarcar todos"
                                            >
                                                <i className="fas fa-times text-[10px]"></i>
                                                Limpar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isSelectionMode && selectedBlocks.size > 0 && (
                                    <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                                        <div className="h-9 px-3 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight">{selectedBlocks.size}</span>
                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">itens</span>
                                        </div>

                                        <button
                                            onClick={copySelectedBlocks}
                                            className="h-9 px-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                            title="Copiar blocos selecionados"
                                        >
                                            <i className="fas fa-copy text-[10px]"></i>
                                            Copiar
                                        </button>

                                        <button
                                            onClick={cutSelectedBlocks}
                                            className="h-9 px-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20"
                                            title="Recortar blocos selecionados"
                                        >
                                            <i className="fas fa-cut text-[10px]"></i>
                                            Recortar
                                        </button>

                                        <button
                                            onClick={deleteSelectedBlocks}
                                            className="h-9 px-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 text-[10px] uppercase bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20"
                                            title="Excluir blocos selecionados"
                                        >
                                            <i className="fas fa-trash-alt text-[10px]"></i>
                                            Excluir
                                        </button>

                                        <Divider />

                                        {/* Bulk Formatting Toolbar */}
                                        <div className="flex flex-wrap items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 ring-1 ring-slate-900/5">
                                            {/* Grupo: Tipografia em massa */}
                                            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl mr-1">
                                                <input
                                                    type="number"
                                                    min="8"
                                                    max="72"
                                                    defaultValue="12"
                                                    onChange={(e) => applyBulkFormatting('fontSize', e.target.value)}
                                                    className="w-12 h-9 rounded-lg border-none bg-white dark:bg-slate-800 text-[10px] px-1 text-center font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                                                    title="Tamanho da fonte em massa"
                                                />
                                                <select
                                                    className="w-24 h-9 rounded-lg border-none bg-white dark:bg-slate-800 text-[10px] px-1 ml-1 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                                                    onChange={(e) => applyBulkFormatting('fontName', e.target.value)}
                                                    title="Tipo de fonte em massa"
                                                >
                                                    {FONT_FAMILIES.map(font => (
                                                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                                            {font.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <Divider />

                                            {/* Grupo: Estilos em massa */}
                                            <div className="flex items-center gap-0.5">
                                                <ToolbarButton icon="bold" title="Negrito em massa" onClick={() => applyBulkFormatting('bold')} />
                                                <ToolbarButton icon="italic" title="Itálico em massa" onClick={() => applyBulkFormatting('italic')} />
                                                <ToolbarButton icon="underline" title="Sublinhado em massa" onClick={() => applyBulkFormatting('underline')} />
                                            </div>

                                            <Divider />

                                            {/* Grupo: Alinhamento em massa */}
                                            <div className="flex items-center gap-0.5">
                                                <ToolbarButton icon="align-left" title="Alinhar Esquerda" onClick={() => applyBulkFormatting('justifyLeft')} />
                                                <ToolbarButton icon="align-center" title="Alinhar Centro" onClick={() => applyBulkFormatting('justifyCenter')} />
                                                <ToolbarButton icon="align-right" title="Alinhar Direita" onClick={() => applyBulkFormatting('justifyRight')} />
                                                <ToolbarButton icon="align-justify" title="Justificado em massa" onClick={() => applyBulkFormatting('justifyFull')} />
                                            </div>

                                            <Divider />

                                            {/* Grupo: Recuos e Listas em massa */}
                                            <div className="flex items-center gap-0.5">
                                                <ToolbarButton icon="indent" title="Recuo à Direita em massa" onClick={() => applyBulkFormatting('indent')} />
                                                <ToolbarButton icon="outdent" title="Recuo à Esquerda em massa" onClick={() => applyBulkFormatting('outdent')} />
                                                <ToolbarButton icon="list-ul" title="Lista em massa" onClick={() => applyBulkFormatting('insertUnorderedList')} />
                                                <ToolbarButton icon="list-ol" title="Lista ordenada em massa" onClick={() => applyBulkFormatting('insertOrderedList')} />
                                            </div>

                                            <Divider />

                                            {/* Grupo: Espaçamento em massa (Slider) */}
                                            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl mr-1">
                                                <i className="fas fa-text-height text-xs text-slate-400"></i>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="3"
                                                    step="0.1"
                                                    defaultValue="1.6"
                                                    onChange={(e) => applyBulkFormatting('lineHeight', e.target.value)}
                                                    className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                                                    title="Ajustar Espaçamento em massa"
                                                />
                                            </div>

                                            <Divider />

                                            {/* Grupo: Links e Imagens em massa */}
                                            <div className="flex items-center gap-0.5">
                                                <ToolbarButton
                                                    icon="link"
                                                    title="Link em massa"
                                                    onClick={() => {
                                                        const url = prompt('URL para os blocos selecionados:');
                                                        if (url) applyBulkFormatting('createLink', url);
                                                    }}
                                                />
                                                <ToolbarButton
                                                    icon="image"
                                                    title="Inserir Imagem em massa (URL)"
                                                    onClick={() => {
                                                        const url = prompt('URL da Imagem para os blocos selecionados:');
                                                        if (url) {
                                                            const imgHtml = `<img src="${url}" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" /><p><br></p>`;
                                                            applyBulkFormatting('insertHTML', imgHtml);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                // Filter blocks based on audio presence
                                blocks
                                    .filter((rawBlock) => {
                                        if (audioFilter === 'all') return true;
                                        const block = typeof rawBlock === 'string'
                                            ? { id: `legacy-${blocks.indexOf(rawBlock)}`, text: rawBlock, audioUrl: '' }
                                            : rawBlock;

                                        if (audioFilter === 'with-audio') {
                                            return block.audioUrl && block.audioUrl.trim() !== '';
                                        } else if (audioFilter === 'without-audio') {
                                            return !block.audioUrl || block.audioUrl.trim() === '';
                                        }
                                        return true;
                                    })
                                    // Apply pagination
                                    .slice(
                                        blocksPerPage === 'all' ? 0 : (currentPage - 1) * blocksPerPage,
                                        blocksPerPage === 'all' ? undefined : currentPage * blocksPerPage
                                    )
                                    .map((rawBlock, filteredIndex) => {
                                        // Find original index to preserve block ID and data
                                        const originalIndex = blocks.indexOf(rawBlock);
                                        const block = typeof rawBlock === 'string'
                                            ? { id: `legacy-${originalIndex}`, text: rawBlock, audioUrl: '' }
                                            : rawBlock;

                                        return (
                                            <BlockItem
                                                key={block.id || originalIndex}
                                                block={block}
                                                index={originalIndex}
                                                isExpanded={expandedBlockId === block.id}
                                                isSelected={selectedBlocks.has(block.id)}
                                                isSelectionMode={isSelectionMode}
                                                isHovered={hoveredBlockIndex === originalIndex}
                                                isMediaMenuOpen={showMediaMenu && mediaMenuIndex === originalIndex}
                                                isActive={activeEditableElement !== null && activeEditableElement.getAttribute('data-block-id') === block.id}
                                                totalBlocks={blocks.length}
                                                handlers={{
                                                    setExpandedBlockId,
                                                    toggleBlockSelection,
                                                    setHoveredBlockIndex,
                                                    setMediaMenuIndex,
                                                    setShowMediaMenu,
                                                    addBlockAtPosition,
                                                    setShowImageModal,
                                                    setShowTableModal,
                                                    setShowVideoModal,
                                                    insertVideoEmbed,
                                                    openAudioModal,
                                                    copyBlockContent,
                                                    cutBlockContent,
                                                    removeBlock,
                                                    moveBlock,
                                                    updateBlock,
                                                    setActiveEditableElement,
                                                    saveSelection,
                                                    execCommand,
                                                    setCurrentFontSize,
                                                    currentFontSize,
                                                    activeFormats,
                                                    toggleBlockFeatured
                                                }}
                                            />
                                        );
                                    })
                            )}

                            {/* Pagination Controls */}
                            {blocksPerPage !== 'all' && blocks.length > 0 && (() => {
                                const filteredBlocks = blocks.filter((rawBlock) => {
                                    if (audioFilter === 'all') return true;
                                    const block = typeof rawBlock === 'string' ? { audioUrl: '' } : rawBlock;
                                    if (audioFilter === 'with-audio') return block.audioUrl && block.audioUrl.trim() !== '';
                                    if (audioFilter === 'without-audio') return !block.audioUrl || block.audioUrl.trim() === '';
                                    return true;
                                });
                                const totalPages = Math.ceil(filteredBlocks.length / (blocksPerPage as number));

                                return totalPages > 1 ? (
                                    <div className="mt-8 pb-4 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="h-10 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 text-xs uppercase bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                            title="Página anterior"
                                        >
                                            <i className="fas fa-chevron-left text-xs"></i>
                                            Anterior
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <div className="h-10 px-4 flex flex-col items-center justify-center bg-indigo-600 dark:bg-indigo-500/20 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 shadow-lg shadow-indigo-500/20">
                                                <span className="text-sm font-black text-white dark:text-indigo-400 leading-tight">{currentPage}</span>
                                                <span className="text-[7px] font-black text-indigo-200 dark:text-indigo-600 uppercase tracking-tighter">
                                                    de {totalPages}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-10 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 text-xs uppercase bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                            title="Próxima página"
                                        >
                                            Próxima
                                            <i className="fas fa-chevron-right text-xs"></i>
                                        </button>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Áudio Minimalista */}
            {
                editingBlockForAudio && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                        {/* Wrapper Relativo para posicionamento do Painel Lateral */}
                        <div className="relative flex items-center justify-center w-full max-w-md">

                            {/* Conteúdo do Modal (Card Principal) */}
                            <div className="bg-white dark:bg-slate-900 w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative z-20">
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

                                    {/* Botão Importar do Dropbox */}
                                    <button
                                        type="button"
                                        onClick={() => setShowDropboxBrowser(true)}
                                        className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2 font-bold text-blue-700 dark:text-blue-300"
                                    >
                                        <i className="fab fa-dropbox text-xl"></i>
                                        Importar do Dropbox
                                    </button>

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

                            {/* Sliding Panel: Dropbox Audio Browser */}
                            <DropboxAudioBrowser
                                isOpen={showDropboxBrowser}
                                onClose={() => setShowDropboxBrowser(false)}
                                onSelectAudio={handleDropboxAudioSelected}
                                appKey={import.meta.env.VITE_DROPBOX_APP_KEY || ''}
                                variant="panel"
                            />
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
                                    value={videoUrls.length > 0 ? videoUrls[0].url : ''}
                                    onChange={(e) => {
                                        const newUrl = e.target.value;
                                        if (videoUrls.length > 0) {
                                            const updated = [...videoUrls];
                                            updated[0].url = newUrl;
                                            setVideoUrls(updated);
                                        } else {
                                            setVideoUrls([{ url: newUrl, title: 'Vídeo Principal' }]);
                                        }
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="https://youtube.com/..."
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Cole a URL do vídeo ou o ID do YouTube.</p>
                        </div>

                        {/* Audio URL */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">URL do Áudio (Principal)</label>
                            <div className="relative">
                                <i className="fas fa-headphones absolute left-3 top-2.5 text-slate-400"></i>
                                <input
                                    type="text"
                                    value={audioUrl}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        val = convertGoogleDriveUrl(val);
                                        val = convertDropboxUrl(val);
                                        setAudioUrl(val);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="https://..."
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Áudio principal da aula para leitura automática.</p>
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

                        {/* Quiz Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Questionário</label>
                            <button
                                onClick={() => setShowQuizEditor(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-purple-600/20"
                            >
                                <i className="fas fa-clipboard-list text-lg"></i>
                                Gerenciar Quiz
                            </button>
                            <p className="text-[10px] text-slate-400">Adicione perguntas para validar o aprendizado.</p>
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

            {/* Modal de Upload de Material */}
            {showMaterialModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowMaterialModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Adicionar Material</h3>

                        <ResourceUploadForm
                            onSubmit={handleSaveResource}
                            isLoading={false}
                        />
                    </div>
                </div>
            )}

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

            {/* Modal de Upload de Material */}
            {showMaterialModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowMaterialModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Gerenciar Materiais e Mídia</h3>

                        {/* Layout em 2 Colunas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Coluna Esquerda: Materiais Complementares */}
                            <div className="space-y-4 h-full flex flex-col">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <i className="fas fa-paperclip text-indigo-500"></i>
                                    Materiais Complementares
                                </h4>

                                <div className="flex-1 overflow-y-auto min-h-[200px] space-y-6">
                                    <ResourceUploadForm
                                        onSubmit={handleSaveResource}
                                        isLoading={false}
                                    />

                                    {/* Lista de Materiais por Categoria */}
                                    <div className="space-y-6 mt-6">
                                        {['Material de Apoio', 'Exercícios', 'Slides', 'Leitura Complementar', 'Outros'].map(category => {
                                            const categoryResources = lessonResources.filter(r => (r.category || 'Outros') === category);
                                            if (categoryResources.length === 0) return null;

                                            return (
                                                <div key={category} className="space-y-2">
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                        {category === 'Material de Apoio' && <i className="fas fa-book text-indigo-500"></i>}
                                                        {category === 'Exercícios' && <i className="fas fa-tasks text-green-500"></i>}
                                                        {category === 'Slides' && <i className="fas fa-presentation text-orange-500"></i>}
                                                        {category === 'Leitura Complementar' && <i className="fas fa-book-open text-blue-500"></i>}
                                                        {category === 'Outros' && <i className="fas fa-box text-slate-500"></i>}
                                                        {category}
                                                    </h5>
                                                    <div className="space-y-2">
                                                        {categoryResources.map(resource => (
                                                            <div key={resource.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 group">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                                                        ${resource.resource_type === 'PDF' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                                                                            resource.resource_type === 'AUDIO' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                                                                                resource.resource_type === 'IMAGE' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                                                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                                        {resource.resource_type === 'PDF' && 'PDF'}
                                                                        {resource.resource_type === 'AUDIO' && 'MP3'}
                                                                        {resource.resource_type === 'IMAGE' && 'IMG'}
                                                                        {['LINK', 'FILE'].includes(resource.resource_type) && <i className="fas fa-link"></i>}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" title={resource.title}>
                                                                            {resource.title}
                                                                        </p>
                                                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-600 truncate block">
                                                                            Ver arquivo
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteResource(resource.id)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Remover material"
                                                                >
                                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {lessonResources.length === 0 && !isLoadingResources && (
                                            <div className="text-center py-8 text-slate-400">
                                                <i className="fas fa-folder-open text-2xl mb-2 opacity-30"></i>
                                                <p className="text-xs">Nenhum material complementar adicionado.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita: Vídeos */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <i className="fas fa-video text-indigo-500"></i>
                                    Vídeos da Aula
                                </h4>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-semibold text-slate-500">Lista de Vídeos</label>
                                        <button
                                            type="button"
                                            onClick={() => setVideoUrls([...videoUrls, { url: '', title: `Vídeo ${videoUrls.length + 1}`, image_url: '' }])}
                                            className="px-3 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <i className="fas fa-plus"></i>
                                            Adicionar Vídeo
                                        </button>
                                    </div>

                                    {videoUrls.length === 0 ? (
                                        <div className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                                            Nenhum vídeo adicionado. Clique em "Adicionar Vídeo" para começar.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                            {videoUrls.map((video, index) => (
                                                <div key={index} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <div className="flex-1 space-y-2">
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Título do Vídeo</label>
                                                                <input
                                                                    type="text"
                                                                    value={video.title}
                                                                    onChange={e => {
                                                                        const updated = [...videoUrls];
                                                                        updated[index].title = e.target.value;
                                                                        setVideoUrls(updated);
                                                                    }}
                                                                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="Ex: Introdução, Parte 1, etc."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">URL (Youtube/Vimeo)</label>
                                                                <input
                                                                    type="text"
                                                                    value={video.url}
                                                                    onChange={e => {
                                                                        const updated = [...videoUrls];
                                                                        updated[index].url = e.target.value;
                                                                        setVideoUrls(updated);
                                                                    }}
                                                                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="https://..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-slate-500 mb-1">URL da Imagem de Capa</label>
                                                                <input
                                                                    type="text"
                                                                    value={video.image_url || ''}
                                                                    onChange={e => {
                                                                        const updated = [...videoUrls];
                                                                        updated[index].image_url = e.target.value;
                                                                        setVideoUrls(updated);
                                                                    }}
                                                                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="https://..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            {index > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...videoUrls];
                                                                        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                                                                        setVideoUrls(updated);
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded transition-colors"
                                                                    title="Mover para cima"
                                                                >
                                                                    <i className="fas fa-arrow-up text-[10px]"></i>
                                                                </button>
                                                            )}
                                                            {index < videoUrls.length - 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...videoUrls];
                                                                        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                                                                        setVideoUrls(updated);
                                                                    }}
                                                                    className="w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded transition-colors"
                                                                    title="Mover para baixo"
                                                                >
                                                                    <i className="fas fa-arrow-down text-[10px]"></i>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = videoUrls.filter((_, i) => i !== index);
                                                                    setVideoUrls(updated);
                                                                }}
                                                                className="w-6 h-6 flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                title="Remover vídeo"
                                                            >
                                                                <i className="fas fa-trash text-[10px]"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <i className="fas fa-info-circle"></i>
                                                        <span>Vídeo {index + 1} de {videoUrls.length}{index === 0 ? ' (principal)' : ''}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>



                        {/* Botão Salvar no Rodapé */}
                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                <i className="fas fa-info-circle mr-1"></i>
                                Salvar aplica as alterações de vídeos, áudio e imagem à aula
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowMaterialModal(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleSave();
                                        setShowMaterialModal(false);
                                    }}
                                    disabled={isSaving}
                                    className="px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/30"
                                >
                                    {isSaving ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save"></i>
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Modal de Quiz */}
            {
                showQuizEditor && (
                    <QuizEditor
                        lessonId={lesson.id}
                        existingQuiz={existingQuiz}
                        onSave={handleCreateQuiz}
                        onClose={() => setShowQuizEditor(false)}
                        apiKey={apiKey}
                        lessonContent={(async () => {
                            // Extrair texto plano do HTML atual ou dos blocos se content estiver vazio
                            const htmlSource = content && content.trim().length > 0
                                ? content
                                : (blocks || []).map((b: any) => b.text || '').join('\n');

                            const div = document.createElement('div');
                            div.innerHTML = htmlSource;
                            const htmlText = div.textContent || div.innerText || '';

                            // Extrair texto dos PDFs
                            const pdfUrls = ((lesson as any).resources || [])
                                .filter((r: LessonResource) => r.type === 'PDF')
                                .map((r: LessonResource) => r.url);

                            if (pdfUrls.length === 0) {
                                return htmlText;
                            }

                            try {
                                const { extractTextFromMultiplePDFs } = await import('../utils/pdfExtractor');
                                const pdfText = await extractTextFromMultiplePDFs(pdfUrls);

                                return `${htmlText}\n\n--- MATERIAIS EM PDF ---\n\n${pdfText}`;
                            } catch (error) {
                                console.error('Erro ao extrair PDFs:', error);
                                return htmlText; // Fallback para apenas HTML
                            }
                        })()}
                        lessonResources={(lesson as any).resources || []}
                        courseId={courseId}
                        moduleId={moduleId}
                    />
                )
            }

            {/* Modal de Requisitos */}
            {
                showRequirementsEditor && lessonRequirements && (
                    <LessonRequirementsEditor
                        lesson={{
                            id: lesson.id,
                            title: lesson.title,
                            videoUrl: lesson.video_url || '',
                            content: lesson.content || '',
                            durationSeconds: lesson.duration_seconds || 0,
                            imageUrl: lesson.image_url || '',
                            contentBlocks: lesson.content_blocks || [],
                            resources: (lesson as any).resources || (lesson as any).lesson_resources || []
                        } as any}
                        requirements={lessonRequirements}
                        onSave={handleSaveRequirements}
                        onClose={() => setShowRequirementsEditor(false)}
                    />
                )
            }

            {/* Quiz Management Modal */}
            {showQuizManagementModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl border-b border-purple-500/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                        <i className="fas fa-clipboard-question text-2xl text-white"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">Gerenciar Quiz</h2>
                                        <p className="text-xs text-purple-100">Configure o quiz desta aula</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowQuizManagementModal(false)}
                                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Opção 1: Criar/Editar Quiz */}
                            {!loadingQuiz && (
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className={`fas ${existingQuiz ? 'fa-edit' : 'fa-plus-circle'} text-purple-600 dark:text-purple-400`}></i>
                                                <h3 className="font-bold text-slate-900 dark:text-white">
                                                    {existingQuiz ? 'Editar Quiz' : 'Criar Novo Quiz'}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {existingQuiz
                                                    ? 'Edite as perguntas e configurações do quiz existente'
                                                    : 'Crie um novo quiz com perguntas para esta aula'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowQuizEditor(true);
                                                setShowQuizManagementModal(false);
                                            }}
                                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <i className={`fas ${existingQuiz ? 'fa-edit' : 'fa-plus'}`}></i>
                                            {existingQuiz ? 'Editar' : 'Criar'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Opção 2: Liberar/Bloquear Quiz */}
                            {existingQuiz && !loadingQuiz && (
                                <div className={`bg-gradient-to-br ${existingQuiz.isManuallyReleased ? 'from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 border-emerald-200 dark:border-emerald-800' : 'from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border-orange-200 dark:border-orange-800'} border rounded-xl p-5 hover:shadow-lg transition-shadow`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className={`fas ${existingQuiz.isManuallyReleased ? 'fa-lock-open' : 'fa-lock'} ${existingQuiz.isManuallyReleased ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}></i>
                                                <h3 className="font-bold text-slate-900 dark:text-white">
                                                    {existingQuiz.isManuallyReleased ? 'Quiz Liberado' : 'Quiz Bloqueado'}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {existingQuiz.isManuallyReleased
                                                    ? 'O quiz está disponível para os alunos. Clique para bloquear o acesso.'
                                                    : 'O quiz está bloqueado. Clique para liberar e permitir que os alunos façam o quiz.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleToggleQuizRelease();
                                                setShowQuizManagementModal(false);
                                            }}
                                            disabled={isTogglingRelease}
                                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${existingQuiz.isManuallyReleased
                                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                }`}
                                        >
                                            {isTogglingRelease ? (
                                                <>
                                                    <i className="fas fa-circle-notch animate-spin"></i>
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className={`fas ${existingQuiz.isManuallyReleased ? 'fa-lock' : 'fa-lock-open'}`}></i>
                                                    {existingQuiz.isManuallyReleased ? 'Bloquear' : 'Liberar'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Opção 3: Requisitos do Quiz */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fas fa-list-check text-indigo-600 dark:text-indigo-400"></i>
                                            <h3 className="font-bold text-slate-900 dark:text-white">Requisitos do Quiz</h3>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Configure os requisitos que o aluno deve cumprir para liberar o quiz automaticamente
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setLoadingRequirements(true);
                                            setShowQuizManagementModal(false);
                                            try {
                                                const supabase = createSupabaseClient();
                                                const { data, error } = await supabase
                                                    .from('lesson_progress_requirements')
                                                    .select('*')
                                                    .eq('lesson_id', lesson.id)
                                                    .single();

                                                if (error && error.code !== 'PGRST116') {
                                                    throw error;
                                                }

                                                setLessonRequirements(data || {
                                                    lesson_id: lesson.id,
                                                    videoRequiredPercent: 80,
                                                    textBlocksRequiredPercent: 80,
                                                    requiredPdfIds: [],
                                                    requiredAudioIds: []
                                                });
                                                setShowRequirementsEditor(true);
                                            } catch (error) {
                                                console.error('Error loading requirements:', error);
                                                alert('Erro ao carregar requisitos');
                                            } finally {
                                                setLoadingRequirements(false);
                                            }
                                        }}
                                        disabled={loadingRequirements}
                                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                                    >
                                        {loadingRequirements ? (
                                            <>
                                                <i className="fas fa-circle-notch animate-spin"></i>
                                                Carregando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-cog"></i>
                                                Configurar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Status do Quiz */}
                            {existingQuiz && (
                                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status do Quiz</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-heading text-slate-400 w-4"></i>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                <span className="font-semibold">Título:</span> {existingQuiz.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-question-circle text-slate-400 w-4"></i>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                <span className="font-semibold">Questões:</span> {existingQuiz.questions?.length || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <i className={`fas ${existingQuiz.isManuallyReleased ? 'fa-check-circle text-green-500' : 'fa-times-circle text-orange-500'} w-4`}></i>
                                            <span className="text-slate-700 dark:text-slate-300">
                                                <span className="font-semibold">Acesso:</span> {existingQuiz.isManuallyReleased ? 'Liberado' : 'Bloqueado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-b-2xl border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setShowQuizManagementModal(false)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Criação em Lote */}
            {
                isBulkModalOpen && (
                    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setIsBulkModalOpen(false)}>
                        <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                        <i className="fas fa-layer-group text-indigo-400"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Criação em Lote</h3>
                                        <p className="text-xs text-slate-400">Adicione múltiplos blocos de conteúdo simultaneamente.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="mb-4">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-300">QUANTIDADE:</span>
                                        <select
                                            value={bulkCount}
                                            onChange={(e) => setBulkCount(Number(e.target.value))}
                                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-indigo-400 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                <option key={num} value={num}>{num} Bloco{num > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <i className="fas fa-info-circle text-indigo-400 mt-1"></i>
                                        <div className="text-xs text-slate-400">
                                            <p className="font-semibold text-slate-300 mb-1">Como funciona:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>Serão criados {bulkCount} novo{bulkCount > 1 ? 's' : ''} bloco{bulkCount > 1 ? 's' : ''} de conteúdo vazio{bulkCount > 1 ? 's' : ''}</li>
                                                <li>Você poderá editar cada bloco após a criação</li>
                                                <li>Os blocos serão adicionados ao final da aula</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
                                <button
                                    onClick={() => setIsBulkModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        // Criar múltiplos blocos vazios
                                        const newBlocks = Array.from({ length: bulkCount }, (_, i) => ({
                                            id: `bulk_${Date.now()}_${i}`,
                                            text: '',
                                            spacing: 0
                                        }));
                                        setBlocks([...blocks, ...newBlocks]);
                                        setIsBulkModalOpen(false);
                                    }}
                                    className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-2"
                                >
                                    <i className="fas fa-check"></i>
                                    INSERIR {bulkCount} BLOCO{bulkCount > 1 ? 'S' : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Importar/Exportar Conteúdo */}
            {showImportExportModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowImportExportModal(false)}>
                    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                                    <i className="fas fa-file-import text-teal-400"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">Configurações de Conteúdo</h3>
                                    <p className="text-xs text-slate-400 font-medium tracking-wide">Gerencie a importação e exportação da sua aula.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowImportExportModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <div
                                className={`rounded-2xl border-2 border-dashed ${isDocDragActive ? 'border-teal-500 bg-teal-500/5' : 'border-slate-800 bg-slate-900/50'} transition-all p-8`}
                                onDrop={handleDocxDrop}
                                onDragOver={handleDocxDragOver}
                                onDragLeave={handleDocxDragLeave}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Coluna 1: Importar Conteúdo */}
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <p className="text-base font-black text-white mb-1">Importar Conteúdo</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">Arraste um DOCX ou use os botões abaixo. JSON recria os blocos exatamente como salvos.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    setImportType('docx');
                                                    setImportMethod('upload');
                                                    setShowImportMethodModal(true);
                                                }}
                                                className="h-12 rounded-xl bg-[#10b981] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#059669] transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20"
                                            >
                                                <i className="fas fa-file-word text-sm"></i> DOCX
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setImportType('json');
                                                    setImportMethod('upload');
                                                    setShowImportMethodModal(true);
                                                }}
                                                disabled={isJsonImporting}
                                                className="h-12 rounded-xl bg-[#1e293b] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#334155] transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {isJsonImporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-code text-sm"></i>} Importar JSON
                                            </button>
                                            <button
                                                onClick={handleJsonExport}
                                                className="h-12 rounded-xl bg-[#4f46e5] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                                            >
                                                <i className="fas fa-download text-sm"></i> Exportar JSON
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setImportType('md');
                                                    setImportMethod('upload');
                                                    setShowImportMethodModal(true);
                                                }}
                                                className="h-12 rounded-xl bg-[#a855f7] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#9333ea] transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20"
                                            >
                                                <i className="fab fa-markdown text-sm"></i> .md
                                            </button>
                                        </div>

                                        {/* Hidden Inputs with unique IDs for modal */}
                                        <input id="docx-upload-modal" type="file" accept=".docx" ref={docUploadInputRef} onChange={handleDocFileInput} className="hidden" />
                                        <input id="markdown-upload-modal" type="file" accept=".md" onChange={handleMarkdownFileInput} className="hidden" />
                                        <input ref={jsonUploadInputRef} type="file" accept="application/json" onChange={handleJsonFileInput} className="hidden" />
                                    </div>

                                    {/* Coluna 2: Modo de Importação */}
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <p className="text-base font-black text-white mb-1">Modo de Importação</p>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">Escolha como deseja processar o conteúdo importado.</p>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => setJsonImportMode('replace')}
                                                className={`h-12 rounded-xl text-xs font-black transition-all flex items-center gap-3 px-4 active:scale-[0.98] ${jsonImportMode === 'replace'
                                                    ? 'bg-[#ef4444] text-white shadow-lg shadow-red-500/20'
                                                    : 'bg-[#1e293b] text-slate-400 hover:text-white hover:bg-[#334155]'
                                                    }`}
                                            >
                                                <i className={`fas fa-sync-alt ${jsonImportMode === 'replace' ? 'animate-spin-slow' : ''}`}></i>
                                                Substituir
                                            </button>
                                            <button
                                                onClick={() => setJsonImportMode('append')}
                                                className={`h-12 rounded-xl text-xs font-black transition-all flex items-center gap-3 px-4 active:scale-[0.98] ${jsonImportMode === 'append'
                                                    ? 'bg-[#10b981] text-white shadow-lg shadow-teal-500/20'
                                                    : 'bg-[#1e293b] text-slate-400 hover:text-white hover:bg-[#334155]'
                                                    }`}
                                            >
                                                <i className="fas fa-arrow-down"></i>
                                                Adicionar ao Final
                                            </button>
                                            <button
                                                onClick={() => setJsonImportMode('prepend')}
                                                className={`h-12 rounded-xl text-xs font-black transition-all flex items-center gap-3 px-4 active:scale-[0.98] ${jsonImportMode === 'prepend'
                                                    ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-[#1e293b] text-slate-400 hover:text-white hover:bg-[#334155]'
                                                    }`}
                                            >
                                                <i className="fas fa-arrow-up"></i>
                                                Adicionar ao Início
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alert/Feedback */}
                            {(jsonImportError || docImportError) && (
                                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-bold flex items-center gap-3">
                                    <i className="fas fa-exclamation-circle text-lg"></i>
                                    <span>{jsonImportError || docImportError}</span>
                                </div>
                            )}

                            {jsonImportSuccess && (
                                <div className="mt-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-400 font-bold flex items-center gap-3 animate-bounce">
                                    <i className="fas fa-check-circle text-lg"></i>
                                    <span>Importação concluída com sucesso!</span>
                                </div>
                            )}

                            {docPreviewHtml && (
                                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-inner">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-eye text-teal-400"></i>
                                            <p className="text-xs font-black text-white uppercase tracking-tighter">Prévia do DOCX importado</p>
                                        </div>
                                        <button
                                            onClick={() => setDocPreviewHtml(null)}
                                            className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest"
                                        >
                                            Limpar Prévia
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-auto px-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                        <div className="prose prose-invert prose-xs max-w-none text-slate-300" dangerouslySetInnerHTML={{ __html: docPreviewHtml }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setShowImportExportModal(false)}
                                className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all active:scale-95"
                            >
                                FECHAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Method Modal - Upload ou Colar */}
            {showImportMethodModal && importType && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-6 bg-slate-950/30 border-b border-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                    <i className={`fas ${importType === 'json' ? 'fa-file-code' : importType === 'docx' ? 'fa-file-word' : 'fab fa-markdown'} text-cyan-400`}></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                        Método de Importação
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Escolha como importar {importType.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImportMethodModal(false);
                                    setPastedContent('');
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="p-6 pb-0">
                            <div className="flex gap-2 border-b border-slate-800/50">
                                <button
                                    onClick={() => setImportMethod('upload')}
                                    className={`px-6 py-3 text-xs font-black transition-all relative ${importMethod === 'upload'
                                        ? 'text-cyan-400'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <i className="fas fa-upload mr-2"></i>
                                    UPLOAD DE ARQUIVO
                                    {importMethod === 'upload' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setImportMethod('paste')}
                                    disabled={importType === 'docx'} // DOCX não pode ser colado
                                    className={`px-6 py-3 text-xs font-black transition-all relative ${importMethod === 'paste'
                                        ? 'text-cyan-400'
                                        : 'text-slate-500 hover:text-slate-300'
                                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                                    title={importType === 'docx' ? 'DOCX é formato binário e não pode ser colado' : ''}
                                >
                                    <i className="fas fa-paste mr-2"></i>
                                    COLAR TEXTO
                                    {importMethod === 'paste' && importType !== 'docx' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {importMethod === 'upload' ? (
                                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/50 text-center">
                                    <i className="fas fa-cloud-upload-alt text-4xl text-slate-600 mb-4"></i>
                                    <p className="text-sm font-bold text-slate-300 mb-4">
                                        Selecione um arquivo {importType.toUpperCase()}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (importType === 'json') jsonUploadInputRef.current?.click();
                                            else if (importType === 'docx') document.getElementById('docx-upload-modal')?.click();
                                            else if (importType === 'md') document.getElementById('markdown-upload-modal')?.click();
                                            setShowImportMethodModal(false);
                                        }}
                                        className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black rounded-xl transition-all active:scale-95"
                                    >
                                        <i className="fas fa-folder-open mr-2"></i>
                                        SELECIONAR ARQUIVO
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-black text-slate-300 mb-2 uppercase tracking-wide">
                                        Cole o conteúdo {importType.toUpperCase()} abaixo:
                                    </label>
                                    <textarea
                                        value={pastedContent}
                                        onChange={(e) => setPastedContent(e.target.value)}
                                        placeholder={
                                            importType === 'json'
                                                ? '{\n  "content_blocks": [\n    ...\n  ]\n}'
                                                : '# Título\n\nConteúdo markdown...'
                                        }
                                        className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        Dica: Use Ctrl+V para colar
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-950/50 border-t border-slate-800/50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowImportMethodModal(false);
                                    setPastedContent('');
                                }}
                                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all active:scale-95"
                            >
                                CANCELAR
                            </button>
                            {importMethod === 'paste' && (
                                <button
                                    onClick={handlePastedImport}
                                    disabled={!pastedContent.trim()}
                                    className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-black transition-all active:scale-95"
                                >
                                    <i className="fas fa-file-import mr-2"></i>
                                    IMPORTAR
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Viewer Modal */}
            {showImageViewerModal && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowImageViewerModal(false)}
                >
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowImageViewerModal(false)}
                            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/20"
                            title="Fechar"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>

                        {/* Image */}
                        <img
                            src={viewerImageUrl}
                            alt="Visualização"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Image Info */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                            <p className="text-xs text-white/80 font-medium">
                                Clique fora da imagem para fechar
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Changes Diff Modal */}
            {showChangesModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                                    <i className="fas fa-code-branch text-white"></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                        Alterações Não Salvas
                                    </h2>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        {changedBlocks.size} bloco{changedBlocks.size === 1 ? '' : 's'} modificado{changedBlocks.size === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChangesModal(false)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300"
                                title="Fechar"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto space-y-4">
                            {Array.from(changedBlocks.entries()).map(([blockId, { before, after }], index) => {
                                const isDeleted = after.text === '[REMOVIDO]';
                                const isNew = before.text === '';
                                const beforeText = before.text.replace(/<[^>]*>/g, '').trim() || '[Vazio]';
                                const afterText = isDeleted ? '[REMOVIDO]' : after.text.replace(/<[^>]*>/g, '').trim() || '[Vazio]';

                                return (
                                    <div key={blockId} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        {/* Block Header */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                                                    #{index + 1}
                                                </span>
                                                {isNew && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <i className="fas fa-plus mr-1"></i>
                                                        Novo
                                                    </span>
                                                )}
                                                {isDeleted && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <i className="fas fa-trash mr-1"></i>
                                                        Removido
                                                    </span>
                                                )}
                                                {!isNew && !isDeleted && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        <i className="fas fa-edit mr-1"></i>
                                                        Modificado
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
                                                    if (blockElement) {
                                                        setShowChangesModal(false);
                                                        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        setExpandedBlockId(blockId);
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-wider"
                                            >
                                                <i className="fas fa-arrow-right mr-1"></i>
                                                Ir para bloco
                                            </button>
                                        </div>

                                        {/* Before/After Comparison */}
                                        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                                            {/* Before */}
                                            {!isNew && (
                                                <div className="p-4 bg-red-50/30 dark:bg-red-900/10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <i className="fas fa-chevron-left text-xs text-red-600 dark:text-red-400"></i>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                                            Antes
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-6">
                                                        {beforeText}
                                                    </div>
                                                    {before.audioUrl && (
                                                        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <i className="fas fa-music"></i>
                                                            Áudio: Sim
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* After */}
                                            {!isDeleted && (
                                                <div className={`p-4 ${isNew ? 'col-span-2 bg-green-50/30 dark:bg-green-900/10' : 'bg-green-50/30 dark:bg-green-900/10'}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <i className="fas fa-chevron-right text-xs text-green-600 dark:text-green-400"></i>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400">
                                                            Depois
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-6">
                                                        {afterText}
                                                    </div>
                                                    {after.audioUrl && (
                                                        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <i className="fas fa-music"></i>
                                                            Áudio: Sim
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Deleted - Full Width */}
                                            {isDeleted && (
                                                <div className="col-span-2 p-4 bg-red-50/30 dark:bg-red-900/10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <i className="fas fa-trash text-xs text-red-600 dark:text-red-400"></i>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                                            Conteúdo Removido
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-through opacity-60">
                                                        {beforeText}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {changedBlocks.size === 0 && (
                                <div className="text-center py-12">
                                    <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                        Nenhuma alteração pendente
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setShowChangesModal(false)}
                                className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all active:scale-95"
                            >
                                <i className="fas fa-times mr-2"></i>
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    setShowChangesModal(false);
                                    handleSave();
                                }}
                                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
                            >
                                <i className="fas fa-save"></i>
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Offline Connection Modal */}
            {showOfflineModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-red-500 animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                                <i className="fas fa-wifi-slash text-4xl text-white"></i>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">
                                Conexão Perdida
                            </h2>
                            <p className="text-sm text-white/90 font-medium">
                                Sem acesso à internet
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <i className="fas fa-exclamation-triangle text-red-500 text-xl mt-1"></i>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                        Não é possível salvar
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Você perdeu a conexão com a internet. Suas alterações não serão salvas até que a conexão seja restaurada.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    O que fazer:
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                    <li className="flex items-start gap-2">
                                        <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                                        <span>Verifique sua conexão Wi-Fi ou dados móveis</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                                        <span>Mantenha esta página aberta - não recarregue!</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <i className="fas fa-check text-green-500 mt-1 text-xs"></i>
                                        <span>O sistema tentará reconectar automaticamente</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Connection Status */}
                            <div className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    Aguardando conexão...
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setShowOfflineModal(false)}
                                className="w-full px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all active:scale-95"
                            >
                                Entendi, vou aguardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default LessonContentEditorPage;
