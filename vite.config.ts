import * as path from 'node:path'
import * as vite from 'vite'

export default vite.defineConfig({
  root: process.argv[2] ? undefined : 'demo',
  resolve: {
    alias: {
      shaderkit: path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    lib: {
      formats: ['es'],
      entry: 'src/index.ts',
      fileName: '[name]',
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        sourcemapExcludeSources: true,
      },
    },
  },
  plugins: [
    {
      name: 'vite-tsc',
      generateBundle(options) {
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src/index.ts'` })
      },
    },
    {
      name: 'vite-minify',
      renderChunk: {
        order: 'post',
        async handler(code, { fileName }) {
          // Preserve pure annotations, but remove all other comments and whitespace
          code = code.replaceAll('/* @__PURE__ */', '__PURE__ || ')
          const result = await vite.transformWithEsbuild(code, fileName, { minify: true, target: 'es2020' })
          result.code = result.code.replaceAll('__PURE__||', '/*@__PURE__*/')
          return result
        },
      },
    },
  ],
})
