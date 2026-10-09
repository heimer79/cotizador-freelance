import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// T067: Vite build optimizations for Core Web Vitals (FR-050)
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
    // Split large deps into separate chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue'],
          'vendor-pdf': ['jspdf']
        }
      }
    },
    // Inline small assets to reduce HTTP requests
    assetsInlineLimit: 4096,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify with terser for smaller bundles
    minify: 'esbuild'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
