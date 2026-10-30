import { defineConfig } from 'vite'

// One self-contained ES module: Vue, the SDK and the styles are inside. No chunks,
// no eval, no inline style elements (CSP-friendly). No env value reaches the bundle.
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __VUE_OPTIONS_API__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  },
  envPrefix: 'SYNTHWERK_WIDGET_PUBLIC_',
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'synthwerk-chat.js'
    },
    // Lib mode keeps whitespace in ES output; minify the one embed file fully.
    rolldownOptions: {
      output: { codeSplitting: false, minify: true }
    }
  }
})
