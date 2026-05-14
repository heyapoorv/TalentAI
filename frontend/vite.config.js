import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],

    // ── Dev server ─────────────────────────────────────────────────────────
    server: {
      port: 5173,
      proxy: {
        // Proxy /api calls to backend in dev — avoids CORS issues locally
        '/api': {
          target: env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    // ── Production build ───────────────────────────────────────────────────
    build: {
      outDir:        'dist',
      sourcemap:     false,          // Disable in prod — expose via Sentry if needed
      chunkSizeWarningLimit: 1000,   // kB

      rollupOptions: {
        output: {
          // Split vendor code into separate chunk for better caching
          manualChunks: {
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            ui:      ['axios'],
          },
          // Content-hashed filenames for long-lived caching
          entryFileNames:  'assets/[name]-[hash].js',
          chunkFileNames:  'assets/[name]-[hash].js',
          assetFileNames:  'assets/[name]-[hash].[ext]',
        },
      },

      // Tree-shake and minify
      minify:   'esbuild',
      target:   'es2020',
    },

    // ── Preview server (docker-local testing) ──────────────────────────────
    preview: {
      port: 4173,
    },
  };
});
