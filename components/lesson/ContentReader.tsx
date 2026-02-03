import React, { useEffect, useRef } from 'react';

import { Lesson } from '../../domain/entities';
import { useLessonStore } from '../../stores/useLessonStore';

interface HighlightData {
    id: string;
    text: string;
    color: 'yellow' | 'green' | 'blue' | 'pink';
    onClick?: () => void;
}

interface ContentReaderProps {
    lesson: Lesson;
    highlights: HighlightData[];
    onBlockClick?: (blockId: string, index: number) => void;
    onTrackAction?: (action: string) => void;
    currentProgress?: number; // 0 to 100
}

const ContentReader: React.FC<ContentReaderProps> = ({
    lesson,
    highlights,
    onBlockClick,
    onTrackAction,
    currentProgress = 0
}) => {
    const { activeBlockId, fontSize, contentTheme } = useLessonStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Scroll to active block when it changes
    useEffect(() => {
        if (activeBlockId && contentRef.current) {
            const activeElement = contentRef.current.querySelector(`[data-block-id="${activeBlockId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeBlockId]);

    const getBackgroundColor = (color: string) => {
        switch (color) {
            case 'yellow': return '#fef08a';
            case 'green': return '#86efac';
            case 'blue': return '#93c5fd';
            case 'pink': return '#f9a8d4';
            default: return '#fef08a';
        }
    };

    /**
     * Applies highlights to HTML content by replacing text occurrences with <mark> tags.
     * Uses a regex that attempts to avoid replacing text inside HTML tags.
     */
    const applyHighlights = (html: string, highlights: HighlightData[]) => {
        if (!highlights || highlights.length === 0) return html;

        let enhancedHtml = html;

        // Sort highlights by length (descending) to prioritize longer phrases
        const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

        sortedHighlights.forEach(highlight => {
            if (!highlight.text || highlight.text.trim() === '') return;

            // Escape special regex characters
            const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Regex to match text NOT inside HTML tags (lookahead check)
            // Matches the text only if it's NOT followed by a closing '>' without a preceding '<'
            // This is a robust way to match content text vs tag attributes/names
            const regex = new RegExp(`(${escapedText})(?![^<]*>)`, 'gi');

            enhancedHtml = enhancedHtml.replace(regex, (match) => {
                const colorHex = getBackgroundColor(highlight.color);
                return `<mark class="highlight-${highlight.color}" data-note-id="${highlight.id}" style="background-color: ${colorHex}; padding: 2px 4px; border-radius: 4px; cursor: pointer;">${match}</mark>`;
            });
        });

        return enhancedHtml;
    };

    const renderContent = () => {
        if (lesson.contentBlocks && lesson.contentBlocks.length > 0) {
            return lesson.contentBlocks.map((block, index) => {
                const hasAudio = !!block.audioUrl;
                const isActive = activeBlockId === block.id;

                // Apply highlights to the block text
                const htmlWithHighlights = applyHighlights(block.text, highlights);

                return (
                    <div
                        key={block.id}
                        data-block-id={block.id}
                        className={`content-block ${isActive ? 'active-block' : ''} ${hasAudio ? 'has-audio' : ''}`}
                        style={{
                            marginBottom: `${block.spacing || (window.innerWidth < 640 ? 1.25 : 1.5)}rem`,
                            fontSize: window.innerWidth < 640 ? '1.125rem' : (window.innerWidth < 1024 ? '1rem' : '1rem'), // Responsive base size
                            lineHeight: (block as any).lineHeight ? parseFloat((block as any).lineHeight) : (window.innerWidth < 640 ? 1.6 : 1.8),
                            padding: (hasAudio || (block as any).featured) ? '1rem' : '0',
                            borderLeft: hasAudio ? '4px solid #6366f1' : ((block as any).featured ? `4px solid ${(block as any).featuredColor || '#eab308'}` : 'none'),
                            backgroundColor: isActive ? (contentTheme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)') : ((block as any).featured ? `${(block as any).featuredColor || '#eab308'}15` : 'transparent'),
                            borderRadius: hasAudio ? '8px' : '0',
                            cursor: hasAudio ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={(e) => {
                            // Check if user is selecting text - Ignore click if there is a selection
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                                return;
                            }

                            // Check if a highlight was clicked
                            const target = e.target as HTMLElement;
                            const mark = target.closest('mark');

                            if (mark && mark.dataset.noteId) {
                                e.stopPropagation();
                                const noteId = mark.dataset.noteId;
                                const highlight = highlights.find(h => h.id === noteId);
                                highlight?.onClick?.();
                                return;
                            }

                            // Normal block click (Audio)
                            if (hasAudio && onBlockClick) {
                                onBlockClick(block.id, index);
                                onTrackAction?.(`Clicou no bloco de áudio ${index + 1}`);
                            }
                        }}
                    >
                        {hasAudio && (
                            <div className="audio-indicator" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#6366f1',
                            }}>
                                <i className={`fas ${isActive ? 'fa-volume-up' : 'fa-headphones'}`}></i>
                                <span>{isActive ? 'Tocando...' : 'Clique para ouvir'}</span>
                            </div>
                        )}
                        <div
                            dangerouslySetInnerHTML={{ __html: htmlWithHighlights }}
                            style={{ display: 'inline' }}
                        />

                        {/* Audio Progress Bar for Active Block */}
                        {isActive && hasAudio && (
                            <div className="mt-3 w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-200 ease-linear"
                                    style={{
                                        width: `${currentProgress}%`,
                                    }}
                                ></div>
                            </div>
                        )}
                    </div>
                );
            });
        } else if (lesson.content) {
            // Apply highlights to the full content fallback
            const htmlWithHighlights = applyHighlights(lesson.content, highlights);

            return (
                <div
                    dangerouslySetInnerHTML={{ __html: htmlWithHighlights }}
                    style={{ fontSize: '1rem', lineHeight: 1.8 }}
                    onClick={(e) => {
                        // Check if a highlight was clicked
                        const target = e.target as HTMLElement;
                        const mark = target.closest('mark');

                        if (mark && mark.dataset.noteId) {
                            e.stopPropagation();
                            const noteId = mark.dataset.noteId;
                            const highlight = highlights.find(h => h.id === noteId);
                            highlight?.onClick?.();
                        }
                    }}
                />
            );
        }

        return <p style={{ color: '#94a3b8', textAlign: 'center' }}>Sem conteúdo disponível</p>;
    };

    return (
        <div
            ref={contentRef}
            className={`content-reader ${contentTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}
            style={{
                padding: window.innerWidth < 640 ? '1.25rem' : (window.innerWidth < 1024 ? '1.5rem' : '2rem'),
                maxWidth: '100%',
                margin: '0 auto',
                color: contentTheme === 'dark' ? '#e2e8f0' : '#1e293b',
                backgroundColor: contentTheme === 'dark' ? '#0f172a' : '#ffffff',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                // Use zoom for robust scaling of all content (including external HTML/Tailwind classes)
                // @ts-ignore - Zoom is non-standard but widely supported in browsers for this use case
                zoom: fontSize / 100
            }}
        >
            <h2 style={{
                fontSize: window.innerWidth < 640 ? '1.5rem' : (window.innerWidth < 1024 ? '1.625rem' : '1.75rem'), // Responsive title size
                fontWeight: 800,
                marginBottom: '1.5rem',
                color: contentTheme === 'dark' ? '#fff' : '#0f172a',
            }}>
                {lesson.title}
            </h2>
            {renderContent()}
        </div>
    );
};

export default ContentReader;
