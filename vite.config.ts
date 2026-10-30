import { defineConfig } from 'vite'

// One self-contained ES module per widget: Vue, the SDK and the styles are inside. No
// chunks, no eval, no inline style elements (CSP-friendly). No env value reaches the bundle.
// `vite build` makes dist/synthwerk-chat.js, `vite build --mode vision` dist/synthwerk-vision.js:
// a page loads only the widget it uses.
const bundles: Record<string, { entry: string; file: string }> = {
  production: { entry: 'src/index.ts', file: 'synthwerk-chat.js' },
  vision: { entry: 'src/vision-entry.ts', file: 'synthwerk-vision.js' }
}

export default defineConfig(({ command, mode }) => {
  // A build with an unknown mode fails; `vite` (dev) and `vite preview` use the chat entry.
  const bundle = bundles[mode] ?? (command === 'build' ? undefined : bundles.production)
  if (!bundle) throw new Error(`no widget bundle for mode "${mode}": use production or vision`)
  return {
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
      // `pnpm build` runs both: the chat build empties dist/, the vision build adds its file.
      emptyOutDir: mode !== 'vision',
      lib: {
        entry: bundle.entry,
        formats: ['es'],
        fileName: () => bundle.file
      },
      // Lib mode keeps whitespace in ES output; minify the one embed file fully.
      rolldownOptions: {
        output: { codeSplitting: false, minify: true }
      }
    }
  }
})
