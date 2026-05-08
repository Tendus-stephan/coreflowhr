/**
 * Darkens a hex color by subtracting `amount` from each RGB channel (0–255).
 * Clamps each channel to a minimum of 0.
 */
export const darkenHex = (hex: string, amount: number): string => {
    const h = hex.replace('#', '');
    const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
};
