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
              proxy.on('error', (err: NodeJS.ErrnoException, _req, _res) => {
                // Silently ignore proxy errors - main app doesn't use /api endpoints
                // This prevents console spam when scraper-ui server isn't running
                if (err?.code === 'ECONNREFUSED') {
                  return; // Ignore connection refused errors
                }
                console.error('Proxy error:', err);
              });
            },
          },
        },
      },
      plugins: [react()],
      // No AI API keys injected — all AI calls go through the server-side ai-assistant edge function
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
