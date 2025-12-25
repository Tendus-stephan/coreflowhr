/**
 * Sound notification utilities
 * Plays a subtle notification sound when actions complete
 */

let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (required for playing sounds in browsers)
 */
function initAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a pleasant notification sound
 * Uses Web Audio API to create a simple chime sound
 */
function generateNotificationSound(): AudioBuffer | null {
  const ctx = initAudioContext();
  if (!ctx) return null;

  // Create a buffer for a short beep/chime
  const sampleRate = ctx.sampleRate;
  const duration = 0.3; // 300ms
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate a pleasant chime tone (two-tone melody)
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    // First tone (higher frequency)
    const freq1 = t < duration / 2 ? 800 : 1000;
    const wave1 = Math.sin(2 * Math.PI * freq1 * t);
    // Add a fade-out envelope
    const envelope = Math.max(0, 1 - (t / duration));
    data[i] = wave1 * envelope * 0.3; // Volume
  }

  return buffer;
}

let cachedSound: AudioBuffer | null = null;

/**
 * Play notification sound
 * This function can be called from anywhere in the app to play a completion sound
 */
export function playNotificationSound(): void {
  try {
    const ctx = initAudioContext();
    if (!ctx) {
      // Fallback: try using HTML5 Audio if Web Audio API is not available
      try {
        // Create a simple beep using data URI (very short audio)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTKH0fPTgjMGHm7A7+OZUw8PSJzf8MJzJQUwf8ry2IM5CCFywe/km1QRDEib3fDBciUFMH/K8teDNg');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Silently fail if audio playback is blocked
        });
      } catch (e) {
        // Silently fail if audio is not supported
      }
      return;
    }

    // Use Web Audio API
    if (!cachedSound) {
      cachedSound = generateNotificationSound();
    }

    if (cachedSound) {
      const source = ctx.createBufferSource();
      source.buffer = cachedSound;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (error) {
    // Silently fail if audio playback fails (e.g., user interaction required, browser restrictions)
    console.debug('Notification sound playback failed:', error);
  }
}

/**
 * Play a different sound for errors (optional)
 */
export function playErrorSound(): void {
  // For now, use the same sound or you can implement a different tone
  playNotificationSound();
}




