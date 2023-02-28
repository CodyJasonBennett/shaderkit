import { defineConfig } from 'vite'
import { minify } from '../src'

let code: string
let mangleMap!: Map<string, string>
let i: number = 0

export default defineConfig({
  build: {
    target: 'esnext',
    modulePreload: false,
  },
  plugins: [
    {
      name: '',
      generateBundle(_, bundle) {
        for (const key in bundle) {
          const entry = bundle[key]
          if ('code' in entry) {
            code = entry.code.replace(/`([^`]+?)`/g, (_, shader) => {
              if (!(i++ % 2)) mangleMap = new Map()
              const minified = minify(shader, { mangle: true, mangleExternals: true, mangleMap })
              return `"${minified.replaceAll('\n', '\\n')}"`
            })
            mangleMap.forEach((n, o) => (code = code.replaceAll(o, n)))
          }
          delete bundle[key]
        }
      },
      transformIndexHtml(html) {
        const [, css] = html.match(/<style>([^<]+)<\/style>/)!
        return `<style>${css.replace(/\s/g, '')}</style><script type=module>${code}</script>`
      },
    },
  ],
})
