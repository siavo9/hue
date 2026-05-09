import { defineConfig } from 'vite';
import { resolve } from 'path';

// Multi-page setup so /, /privacy, /about each ship as static HTML.
// No plugins, no extra deps — keeps the bundle tiny.
export default defineConfig({
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
  server: {
    host: true,
  },
});
