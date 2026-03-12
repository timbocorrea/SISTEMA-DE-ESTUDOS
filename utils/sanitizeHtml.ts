import DOMPurify from 'dompurify';

/**
 * Sanitizes an HTML string using DOMPurify.
 * Allows common formatting tags, iframes from YouTube/Vimeo, and strips
 * dangerous protocols (javascript:, data:) and event handlers.
 *
 * @param html The raw HTML string to sanitize.
 * @returns A safe HTML string.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    // Hook 1: Block javascript: URIs in href/src
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName === 'href' || data.attrName === 'src') {
            const val = data.attrValue.toLowerCase().trim();
            if (val.startsWith('javascript:') || val.startsWith('data:text/html')) {
                data.keepAttr = false;
            }
        }
    });

    // Hook 2: Allow iframes ONLY from YouTube and Vimeo
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
        // Do NOT use USE_PROFILES — it resets ALLOWED_TAGS/ATTR to fixed presets
        FORCE_BODY: true,
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'img', 'svg', 'path', 'mark', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'iframe', 'video', 'source'
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
            'width', 'height', 'd', 'viewBox', 'fill', 'xmlns', 'data-note-id',
            'frameborder', 'allow', 'allowfullscreen', 'controls', 'scrolling',
            'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'poster',
            'referrerpolicy', 'loading', 'sandbox'
        ],
        ALLOW_DATA_ATTR: true,
        FORBID_ATTR: [
            'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
            'onkeydown', 'onkeyup', 'onkeypress', 'ondrag', 'ondrop', 'onclick',
            'oncontextmenu', 'onscroll', 'onwheel', 'onresize'
        ],
        FORBID_TAGS: ['script', 'style', 'object', 'embed', 'base', 'form', 'input', 'button']
    });

    // Remove hooks to avoid duplicates on next call
    DOMPurify.removeHook('uponSanitizeAttribute');
    DOMPurify.removeHook('uponSanitizeElement');

    return cleanHtml as string;
}
