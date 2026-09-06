import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '#server': fileURLToPath(new URL('./server', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/dashboard*.test.ts'] },
})
