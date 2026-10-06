import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at both a Pages project path and a custom domain.
  base: './',
  worker: { format: 'es' },
  test: { include: ['test/**/*.test.js'], testTimeout: 30000 },
});
