import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets work at both a Pages project path and a custom domain.
  base: './',
  worker: { format: 'es' },
  test: { include: ['test/**/*.test.js'], testTimeout: 30000 },
});
