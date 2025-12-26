import React, { useState, useEffect } from 'react';
import { serializeRange, deserializeRange } from '../utils/xpathUtils';
import { LessonNotesRepository, LessonNote } from '../repositories/LessonNotesRepository';

interface Note {
    id: string;
    title?: string;
    content: string;
    hasHighlight: boolean;
    highlightedText?: string;
    highlightColor?: 'yellow' | 'green' | 'blue' | 'pink';
    position: number;
    xpathStart?: string;
    offsetStart?: number;
    xpathEnd?: string;
    offsetEnd?: number;
    createdAt?: string;
}

interface NotesPanelProps {
    userId: string;
    lessonId: string;
    refreshTrigger?: any; // Dispara restauração quando mudar (ex: activeBlockId)
}

const NotesPanelPrototype: React.FC<NotesPanelProps> = ({ userId, lessonId, refreshTrigger }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [savedSelection, setSavedSelection] = useState<{ text: string, range: Range } | null>(null);

    // Carregar notas e restaurar destaques
    useEffect(() => {
        let isMounted = true;

        const loadNotesAndHighlights = async () => {
            if (!userId || !lessonId) return;

            // Se já temos notas carregadas e é apenas um refresh do DOM, não precisamos recarregar do banco
            // A menos que seja a primeira carga (loading is true)
            if (loading) {
                const dbNotes = await LessonNotesRepository.loadNotes(userId, lessonId);

                if (!isMounted) return;

                // Converter para formato frontend
                const frontendNotes: Note[] = dbNotes.map(n => ({
                    id: n.id,
                    title: n.title,
                    content: n.content || '',
                    hasHighlight: n.has_highlight,
                    highlightedText: n.highlighted_text,
                    highlightColor: n.highlight_color,
                    position: n.position,
                    xpathStart: n.xpath_start,
                    offsetStart: n.offset_start,
                    xpathEnd: n.xpath_end,
                    offsetEnd: n.offset_end,
                    createdAt: n.created_at
                }));

                setNotes(frontendNotes);
                setLoading(false);
                restoreDomHighlights(frontendNotes);
            } else {
                // Apenas restaurar destaques no DOM (refresh disparado)
                restoreDomHighlights(notes);
            }
        };

        const restoreDomHighlights = (notesToRestore: Note[]) => {
            // Restaurar destaques no DOM
            // Aguardar um pouco para garantir que o contúdo da aula renderizou
            setTimeout(() => {
                notesToRestore.forEach(note => {
                    if (note.hasHighlight && note.xpathStart && note.xpathEnd) {
                        try {
                            // Verificar se já existe
                            const existingMark = document.querySelector(`mark[data-note-id="${note.id}"]`);
                            if (existingMark) return;

                            const range = deserializeRange({
                                xpathStart: note.xpathStart,
                                offsetStart: note.offsetStart!,
                                xpathEnd: note.xpathEnd,
                                offsetEnd: note.offsetEnd!
                            });

                            if (range) {
                                const highlightSpan = document.createElement('mark');
                                highlightSpan.className = `highlight-${note.highlightColor}`;
                                highlightSpan.style.backgroundColor =
                                    note.highlightColor === 'yellow' ? '#fef08a' :
                                        note.highlightColor === 'green' ? '#86efac' :
                                            note.highlightColor === 'blue' ? '#93c5fd' : '#f9a8d4';
                                highlightSpan.style.padding = '2px 4px';
                                highlightSpan.style.borderRadius = '4px';
                                highlightSpan.style.cursor = 'pointer';
                                highlightSpan.setAttribute('data-note-id', note.id);

                                const contents = range.extractContents();
                                highlightSpan.appendChild(contents);
                                range.insertNode(highlightSpan);
                                console.log('✅ Destaque restaurado via XPath:', note.id);
                            }
                        } catch (e) {
                            // Silencioso se falhar, pode ser que o conteúdo mudou
                            // console.warn('⚠️ Falha ao restaurar destaque:', note.id, e);
                        }
                    }
                });
            }, 500); // Delay reduzido para 500ms
        };

        loadNotesAndHighlights();

        return () => { isMounted = false; };
    }, [userId, lessonId, refreshTrigger]); // Adicionado refreshTrigger

    const handleCreateNote = async (content: string, highlightData?: { text: string, range: Range, color: string }) => {
        try {
            const position = notes.length;
            const newNote: Omit<LessonNote, 'id' | 'created_at' | 'updated_at'> = {
                user_id: userId,
                lesson_id: lessonId,
                content: content,
                position: position,
                has_highlight: !!highlightData,
                title: highlightData ? 'Destaque' : 'Nota'
            };

            if (highlightData) {
                const rangeSerialized = serializeRange(highlightData.range);
                newNote.highlighted_text = highlightData.text;
                newNote.highlight_color = highlightData.color as any;
                newNote.xpath_start = rangeSerialized.xpathStart;
                newNote.offset_start = rangeSerialized.offsetStart;
                newNote.xpath_end = rangeSerialized.xpathEnd;
                newNote.offset_end = rangeSerialized.offsetEnd;
            }

            const savedNote = await LessonNotesRepository.saveNote(newNote);

            if (savedNote) {
                // Atualizar estado local
                const noteFrontend: Note = {
                    id: savedNote.id,
                    title: savedNote.title,
                    content: savedNote.content || '',
                    hasHighlight: savedNote.has_highlight,
                    highlightedText: savedNote.highlighted_text,
                    highlightColor: savedNote.highlight_color,
                    position: savedNote.position,
                    xpathStart: savedNote.xpath_start,
                    offsetStart: savedNote.offset_start,
                    xpathEnd: savedNote.xpath_end,
                    offsetEnd: savedNote.offset_end,
                    createdAt: savedNote.created_at
                };

                setNotes([...notes, noteFrontend]);

                // Se for destaque, aplicar visualmente no DOM (se já não estiver aplicado pelo fluxo de seleção)
                // NOTA: O fluxo de seleção no botão já aplica o visual antes de salvar? 
                // Vamos ajustar para salvar primeiro ou aplicar visual e depois salvar.
                // O fluxo ideal do botão "Adicionar Destaque":
                // 1. Aplica visualmente (para feedback imediato)
                // 2. Salva no banco
                // 3. Se erro, reverte.

                // Mas aqui estamos recebendo o range já pronto.
                // Se o componente pai/botão já aplicou o mark, precisamos apenas garantir que o ID esteja correto.
                // Como o ID vem do banco, o ideal é:
                // 1. Criar nota no banco
                // 2. Usar o ID retornado para criar o mark no DOM.

                if (highlightData) {
                    const highlightSpan = document.createElement('mark');
                    highlightSpan.className = `highlight-${highlightData.color}`;
                    highlightSpan.style.backgroundColor =
                        highlightData.color === 'yellow' ? '#fef08a' :
                            highlightData.color === 'green' ? '#86efac' :
                                highlightData.color === 'blue' ? '#93c5fd' : '#f9a8d4';
                    highlightSpan.setAttribute('data-note-id', savedNote.id);
                    highlightSpan.style.cursor = 'pointer';
                    highlightSpan.style.borderRadius = '4px';
                    highlightSpan.style.padding = '2px 4px';

                    const contents = highlightData.range.extractContents();
                    highlightSpan.appendChild(contents);
                    highlightData.range.insertNode(highlightSpan);
                }
            }
        } catch (e) {
            console.error('Erro ao criar nota:', e);
            alert('Erro ao salvar nota. Tente novamente.');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Deseja apagar esta nota?')) return;

        try {
            // Remover visualmente primeiro (optimistic update)
            const note = notes.find(n => n.id === noteId);
            if (note?.hasHighlight) {
                const markElement = document.querySelector(`mark[data-note-id="${noteId}"]`);
                if (markElement) {
                    const textNode = document.createTextNode(markElement.textContent || '');
                    markElement.parentNode?.replaceChild(textNode, markElement);
                }
            }

            setNotes(notes.filter(n => n.id !== noteId));

            // Remover do banco
            const success = await LessonNotesRepository.deleteNote(noteId);
            if (!success) {
                alert('Erro ao deletar nota do servidor. Recarregue a página.');
                // Idealmente reverteria o estado local, mas para simplificar vamos deixar assim
            }
        } catch (e) {
            console.error('Erro ao deletar:', e);
        }
    };

    const handleUpdateNote = async (noteId: string, content: string) => {
        try {
            setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n));
            await LessonNotesRepository.updateNote(noteId, { content });
            setEditingId(null);
        } catch (e) {
            console.error('Erro ao atualizar:', e);
            alert('Erro ao salvar alterações.');
        }
    };

    const handleRemoveHighlight = async (noteId: string) => {
        try {
            // Remover mark do DOM
            const markElement = document.querySelector(`mark[data-note-id="${noteId}"]`);
            if (markElement) {
                const textNode = document.createTextNode(markElement.textContent || '');
                markElement.parentNode?.replaceChild(textNode, markElement);
            }

            // Atualizar estado
            setNotes(notes.map(n =>
                n.id === noteId
                    ? { ...n, hasHighlight: false, highlightedText: undefined, highlightColor: undefined }
                    : n
            ));

            // Atualizar banco
            await LessonNotesRepository.updateNote(noteId, {
                has_highlight: false,
                highlighted_text: null as any,
                highlight_color: null as any,
                xpath_start: null as any,
                xpath_end: null as any
            });

        } catch (e) {
            console.error('Erro ao remover destaque:', e);
        }
    };

    const scrollToHighlight = (note: Note) => {
        if (!note.hasHighlight || !note.xpathStart) return;

        // Tentar encontrar pelo ID primeiro
        const mark = document.querySelector(`mark[data-note-id="${note.id}"]`);
        if (mark) {
            mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mark.classList.add('ring-2', 'ring-indigo-500');
            setTimeout(() => mark.classList.remove('ring-2', 'ring-indigo-500'), 2000);
        } else {
            console.warn('Highlight não encontrado no DOM para scroll');
        }
    };

    const highlightColorClasses = {
        yellow: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
        green: 'border-green-400 bg-green-50 dark:bg-green-900/10',
        blue: 'border-blue-400 bg-blue-50 dark:bg-blue-900/10',
        pink: 'border-pink-400 bg-pink-50 dark:bg-pink-900/10'
    };

    const colorOptions = [
        { value: 'yellow' as const, label: 'Amarelo', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-400' },
        { value: 'green' as const, label: 'Verde', bgClass: 'bg-green-400', borderClass: 'border-green-400' },
        { value: 'blue' as const, label: 'Azul', bgClass: 'bg-blue-400', borderClass: 'border-blue-400' },
        { value: 'pink' as const, label: 'Rosa', bgClass: 'bg-pink-400', borderClass: 'border-pink-400' }
    ];

    if (loading) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="text-center text-slate-500">
                    <i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                    <p className="text-sm">Carregando notas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[600px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <i className="fas fa-sticky-note text-indigo-600 dark:text-indigo-400"></i>
                        Minhas Notas
                    </h3>
                    <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-full">
                        {notes.length}
                    </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                    Clique nas notas destacadas para navegar no conteúdo
                </p>
            </div>

            {/* Lista de Notas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {notes.map((note, index) => (
                    <div
                        key={note.id}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${note.hasHighlight
                            ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
                            : 'cursor-default'
                            } ${note.hasHighlight && note.highlightColor
                                ? highlightColorClasses[note.highlightColor]
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                        onClick={() => scrollToHighlight(note)}
                    >
                        {/* Cabeçalho da Nota */}
                        <div className="flex items-start gap-2 mb-2">
                            {note.hasHighlight && (
                                <span className="w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs flex items-center justify-center font-black flex-shrink-0 shadow-sm">
                                    {index + 1}
                                </span>
                            )}
                            <div className="flex-1 min-w-0">
                                {note.title && (
                                    <span className="inline-block text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg mb-1 shadow-sm border border-slate-200 dark:border-slate-600">
                                        {note.title}
                                    </span>
                                )}
                            </div>
                            {note.hasHighlight && (
                                <i className="fas fa-highlighter text-slate-400 dark:text-slate-500 text-xs"></i>
                            )}
                        </div>

                        {/* Texto destacado */}
                        {note.hasHighlight && note.highlightedText && (
                            <div className={`text-xs italic text-slate-600 dark:text-slate-400 border-l-4 pl-3 py-1 mb-2 ${note.highlightColor === 'yellow' ? 'border-yellow-500' :
                                note.highlightColor === 'green' ? 'border-green-500' :
                                    note.highlightColor === 'blue' ? 'border-blue-500' : 'border-pink-500'
                                }`}>
                                <i className="fas fa-quote-left text-[8px] mr-1 opacity-50"></i>
                                {note.highlightedText.length > 80
                                    ? `${note.highlightedText.substring(0, 80)}...`
                                    : note.highlightedText}
                                <i className="fas fa-quote-right text-[8px] ml-1 opacity-50"></i>
                            </div>
                        )}

                        {/* Conteúdo da nota */}
                        <div className="mb-2">
                            {editingId === note.id ? (
                                <textarea
                                    defaultValue={note.content}
                                    className="w-full border border-indigo-300 dark:border-indigo-700 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    rows={4}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => handleUpdateNote(note.id, e.target.value)}
                                />
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                    {note.content}
                                </p>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2 items-center">
                            {editingId === note.id ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(null);
                                    }}
                                    className="text-xs text-green-600 dark:text-green-400 hover:underline font-bold"
                                >
                                    <i className="fas fa-check mr-1"></i>Concluir
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(note.id);
                                        }}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                                    >
                                        <i className="fas fa-edit"></i>Editar
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNote(note.id);
                                        }}
                                        className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                                    >
                                        <i className="fas fa-trash"></i>Apagar
                                    </button>
                                    {note.hasHighlight && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveHighlight(note.id);
                                            }}
                                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline ml-auto"
                                            title="Remover destaque do texto"
                                        >
                                            <i className="fas fa-unlink"></i>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Data */}
                        {note.createdAt && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                <i className="fas fa-clock"></i>
                                {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                        )}
                    </div>
                ))}

                {/* Mensagem vazia */}
                {!loading && notes.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <i className="fas fa-inbox text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm font-medium">Nenhuma nota ainda</p>
                        <p className="text-xs mt-1">Adicione sua primeira nota abaixo</p>
                    </div>
                )}
            </div>

            {/* Nova Nota */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Digite sua nota aqui... 📝"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 mb-2 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                    rows={3}
                />

                {showColorPicker && (
                    <div className="mb-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Escolha a cor do destaque:</p>
                        <div className="flex gap-2">
                            {colorOptions.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${selectedColor === color.value
                                        ? `${color.borderClass} ${color.bgClass} text-white font-bold shadow-md scale-105`
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:scale-105'
                                        }`}
                                    title={color.label}
                                >
                                    <i className="fas fa-highlighter text-sm"></i>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (newNoteContent.trim()) {
                                handleCreateNote(newNoteContent);
                                setNewNoteContent('');
                            }
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-plus-circle"></i>
                        Adicionar Nota
                    </button>
                    <button
                        onClick={() => {
                            const selection = window.getSelection();
                            const selectedText = selection?.toString().trim();

                            if (showColorPicker && savedSelection) {
                                handleCreateNote('', {
                                    text: savedSelection.text,
                                    range: savedSelection.range,
                                    color: selectedColor
                                });
                                setSavedSelection(null);
                                setShowColorPicker(false);
                                return;
                            }

                            if (!selectedText || selectedText.length === 0) {
                                setShowColorPicker(!showColorPicker);
                                setSavedSelection(null);
                                return;
                            }

                            const range = selection?.getRangeAt(0);
                            if (range) {
                                setSavedSelection({
                                    text: selectedText,
                                    range: range.cloneRange()
                                });
                                setShowColorPicker(true);
                            }
                        }}
                        className={`px-4 rounded-xl font-bold text-sm transition-all border-2 active:scale-95 ${showColorPicker
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                            : selectedColor === 'yellow' ? 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' :
                                selectedColor === 'green' ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' :
                                    selectedColor === 'blue' ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' :
                                        'bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-300 dark:border-pink-700'
                            }`}
                        title={showColorPicker ? (savedSelection ? 'Aplicar destaque' : 'Fechar seletor') : 'Selecione texto e clique para destacar'}
                    >
                        <i className="fas fa-highlighter"></i>
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                    💡 Dica: Selecione texto no conteúdo da aula e clique no destaque
                </p>
            </div>
        </div>
    );
};

export default NotesPanelPrototype;
