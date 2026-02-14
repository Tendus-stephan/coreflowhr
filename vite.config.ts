import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3002,
        host: '0.0.0.0',
        hmr: {
          port: 3002,
        },
        // Proxy API requests to scraper server if it's running (for scraper-ui testing)
        // Main app uses Supabase directly, so this is only for scraper-ui compatibility
        proxy: {
          '/api': {
            target: 'http://localhost:3005',
            changeOrigin: true,
            secure: false,
            // Only proxy if scraper server is running, otherwise let it fail gracefully
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                // Silently ignore proxy errors - main app doesn't use /api endpoints
                // This prevents console spam when scraper-ui server isn't running
                if (err.code === 'ECONNREFUSED') {
                  return; // Ignore connection refused errors
                }
                console.error('Proxy error:', err);
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        // Support both GEMINI_API_KEY and VITE_API_KEY for backward compatibility
        'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
