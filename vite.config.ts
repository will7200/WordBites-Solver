import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/WordBites-Solver/',
  plugins: [react()],
  worker: { format: 'es' },
  build: { outDir: 'build', target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
