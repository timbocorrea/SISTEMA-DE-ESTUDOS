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

    return DOMPurify.sanitize(html, {
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
            'frameborder', 'allow', 'allowfullscreen', 'controls'
        ],
        ALLOW_DATA_ATTR: true,
        // Block dangerous protocols specifically
        FORBID_ATTR: ['onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress', 'ondrag', 'ondrop'],
    });
}
