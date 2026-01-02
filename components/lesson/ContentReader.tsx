import React, { useEffect, useRef } from 'react';
import Highlighter from 'react-highlight-words';
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
}

const ContentReader: React.FC<ContentReaderProps> = ({
    lesson,
    highlights,
    onBlockClick,
    onTrackAction
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

    const highlightRenderer = ({ children, highlightIndex }: any) => {
        const highlight = highlights[highlightIndex];
        if (!highlight) return <span>{children}</span>;

        return (
            <mark
                className={`highlight-${highlight.color}`}
                style={{
                    backgroundColor: getBackgroundColor(highlight.color),
                    padding: '2px 4px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    highlight.onClick?.();
                }}
                data-note-id={highlight.id}
            >
                {children}
            </mark>
        );
    };

    const renderContent = () => {
        if (lesson.contentBlocks && lesson.contentBlocks.length > 0) {
            return lesson.contentBlocks.map((block, index) => {
                const hasAudio = !!block.audioUrl;
                const isActive = activeBlockId === block.id;

                return (
                    <div
                        key={block.id}
                        data-block-id={block.id}
                        className={`content-block ${isActive ? 'active-block' : ''} ${hasAudio ? 'has-audio' : ''}`}
                        style={{
                            marginBottom: `${block.spacing || 1.5}rem`,
                            fontSize: `${fontSize}px`,
                            lineHeight: 1.8,
                            padding: hasAudio ? '1rem' : '0',
                            borderLeft: hasAudio ? '4px solid #6366f1' : 'none',
                            backgroundColor: isActive ? (contentTheme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)') : 'transparent',
                            borderRadius: hasAudio ? '8px' : '0',
                            cursor: hasAudio ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => {
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
                            dangerouslySetInnerHTML={{ __html: block.text }}
                            style={{ display: 'inline' }}
                        />
                    </div>
                );
            });
        } else if (lesson.content) {
            // Fallback to HTML content if no blocks
            return (
                <div
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
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
                padding: '2rem',
                maxWidth: '100%',
                margin: '0 auto',
                color: contentTheme === 'dark' ? '#e2e8f0' : '#1e293b',
                backgroundColor: contentTheme === 'dark' ? '#0f172a' : '#ffffff',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
            }}
        >
            <h2 style={{
                fontSize: `${fontSize + 8}px`,
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
