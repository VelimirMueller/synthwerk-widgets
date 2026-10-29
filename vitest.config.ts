import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/env.d.ts'],
      // Fleet floor (CI-UNIT-02, CI-UNIT-03).
      thresholds: { lines: 80, branches: 70 }
    }
  }
})
