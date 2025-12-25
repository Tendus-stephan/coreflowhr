/**
 * HTML Sanitizer for email content
 * Removes potentially dangerous HTML while preserving safe formatting
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 */
export function sanitizeHtml(html: string): string {
  // List of allowed HTML tags
  const allowedTags = ['br', 'p', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  // List of allowed attributes
  const allowedAttributes: Record<string, string[]> = {
    'a': ['href', 'style'],
  };

  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, ''); // Remove data URIs

  // Create a temporary DOM element to parse HTML
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'text/html');
      
      // Remove disallowed tags and attributes
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      const nodesToRemove: Node[] = [];
      
      let node;
      while (node = walker.nextNode()) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        
        if (!allowedTags.includes(tagName)) {
          nodesToRemove.push(node);
        } else {
          // Remove disallowed attributes
          const allowedAttrs = allowedAttributes[tagName] || [];
          Array.from(element.attributes).forEach(attr => {
            if (!allowedAttrs.includes(attr.name.toLowerCase())) {
              element.removeAttribute(attr.name);
            }
          });
          
          // Sanitize href attributes
          if (tagName === 'a' && element.hasAttribute('href')) {
            const href = element.getAttribute('href') || '';
            if (href.startsWith('javascript:') || href.startsWith('data:')) {
              element.removeAttribute('href');
            }
          }
        }
      }
      
      // Remove disallowed nodes
      nodesToRemove.forEach(node => node.parentNode?.removeChild(node));
      
      sanitized = doc.body.innerHTML;
    } catch (error) {
      console.error('Error sanitizing HTML:', error);
      // Fallback: strip all HTML tags except allowed ones
      sanitized = stripHtmlTags(sanitized, allowedTags);
    }
  } else {
    // Fallback for environments without DOMParser
    sanitized = stripHtmlTags(sanitized, allowedTags);
  }

  return sanitized;
}

/**
 * Strip all HTML tags except allowed ones
 */
function stripHtmlTags(html: string, allowedTags: string[]): string {
  const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\b)[^>]+>`, 'gi');
  return html.replace(tagPattern, '');
}

/**
 * Sanitize plain text by escaping HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}


