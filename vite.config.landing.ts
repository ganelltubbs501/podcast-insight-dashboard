import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: 'dist-landing',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'landing.html'),
    },
  },
});
