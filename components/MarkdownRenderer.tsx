import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, className = '' }) => {
    // Memoize the parsed HTML to avoid re-parsing on every render
    const htmlContent = useMemo(() => {
        try {
            // Configure marked for basic security and formatting (optional if you want to set global defaults)
            // marked.use({ breaks: true, gfm: true }); 

            // Parse markdown
            const parsed = marked.parse(content || '', { async: false }) as string;
            return parsed;
        } catch (error) {
            console.error('Error parsing markdown:', error);
            return content || '';
        }
    }, [content]);

    return (
        <div
            className={`markdown-content ${className} [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>strong]:font-bold [&>em]:italic`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
});

export default MarkdownRenderer;
