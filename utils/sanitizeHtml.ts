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
    // DOMPurify strips javascript: by default, but this adds a mandatory check layer.
    DOMPurify.addHook('uponSanitizeAttribute', function (node, data) {
        if (data.attrName === 'href' || data.attrName === 'src') {
            const val = data.attrValue.toLowerCase();
            if (val.trim().startsWith('javascript:')) {
                data.keepAttr = false;
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
            'frameborder', 'allow', 'allowfullscreen', 'controls'
        ],
        ALLOW_DATA_ATTR: true,
        FORBID_ATTR: ['onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress', 'ondrag', 'ondrop', 'onclick'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style']
    });

    // Remove the hook so it doesn't duplicate/pollute for future calls
    DOMPurify.removeHook('uponSanitizeAttribute');

    return cleanHtml as string;
}
