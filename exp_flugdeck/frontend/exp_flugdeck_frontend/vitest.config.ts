import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    // Backend-Handler werden mit derselben Vitest-Installation geprüft (das Backend hat kein eigenes package.json).
    include: ['tests/**/*.test.ts', '../../backend/exp_flugdeck_backend/tests/**/*.test.ts'],
  },
})
