import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string using DOMPurify with secure defaults.
 * Allows common formatting tags but strips out dangerous protocols (javascript:, data:)
 * and event handlers (onclick, onerror, etc.).
 *
 * @param html The raw HTML string to sanitize.
 * @returns A safe HTML string.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    // Add a hook to ensure no javascript URIs sneak through even if DOMPurify allows them.
    DOMPurify.addHook('uponSanitizeAttribute', function (node, data) {
        if (data.attrName === 'href' || data.attrName === 'src') {
            const val = data.attrValue.toLowerCase();
            if (val.trim().startsWith('javascript:')) {
                data.keepAttr = false;
            }
        }
    });

    // Hook to allow only specific safe domains for iframes
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'iframe') {
            const el = node as Element;
            const src = el.getAttribute('src') || '';
            const isSafeDomain = 
                src.startsWith('https://www.youtube.com/embed/') || 
                src.startsWith('https://www.youtube-nocookie.com/embed/') ||
                src.startsWith('https://player.vimeo.com/video/');

            if (!isSafeDomain) {
                node.parentNode?.removeChild(node);
            }
        }
    });

    const cleanHtml = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'img', 'svg', 'path', 'mark', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'iframe', 'video', 'object', 'embed', 'source'
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
            'width', 'height', 'd', 'viewBox', 'fill', 'xmlns', 'data-note-id',
            'frameborder', 'allow', 'allowfullscreen', 'controls', 'scrolling'
        ],
        ALLOW_DATA_ATTR: true,
        FORBID_ATTR: ['onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress', 'ondrag', 'ondrop', 'onclick'],
        FORBID_TAGS: ['script', 'object', 'embed', 'style']
    });

    // Remove hooks so they don't duplicate/pollute for future calls
    DOMPurify.removeHook('uponSanitizeAttribute');
    DOMPurify.removeHook('uponSanitizeElement');

    return cleanHtml as string;
}
