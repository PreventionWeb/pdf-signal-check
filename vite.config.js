import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets work at both a Pages project path and a custom domain.
  base: './',
  worker: { format: 'es' },
  // The app plus a lightweight forwarding entry for existing story links.
  build: { rollupOptions: { input: { main: 'index.html', story: 'story.html' } } },
  test: { include: ['test/**/*.test.js'], testTimeout: 30000 },
});
