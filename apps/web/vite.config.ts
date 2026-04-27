import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion')) return 'motion-vendor'
          if (id.includes('@tanstack/react-query')) return 'query-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('react-dom')) return 'react-dom-vendor'
          if (id.includes('react')) return 'react-vendor'
          return 'vendor-misc'
        },
      },
    },
  },
  optimizeDeps: {
    /** Évite les erreurs de pré-bundle sur le workspace `@omjep/shared` après changement d’exports. */
    include: ['@omjep/shared'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
