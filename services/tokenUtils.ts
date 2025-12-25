/**
 * Token generation utilities
 * Used for generating secure tokens for CV uploads and other purposes
 */

/**
 * Generate a secure random token
 * Uses crypto.getRandomValues for secure random generation
 */
export function generateSecureToken(length: number = 32): string {
  // Generate random bytes
  const array = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Browser environment
    window.crypto.getRandomValues(array);
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Node.js or other environment with crypto
    crypto.getRandomValues(array);
  } else {
    // Fallback (less secure, but better than nothing)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hexadecimal string
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a shorter token (for URLs, etc.)
 */
export function generateShortToken(length: number = 16): string {
  return generateSecureToken(length);
}




