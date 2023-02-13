import * as path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      shaderkit: path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: false,
    target: 'es2018',
    sourcemap: true,
    lib: {
      formats: ['es', 'cjs'],
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
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'index.d.ts', source: `export * from '../src'` })
      },
    },
  ],
})
