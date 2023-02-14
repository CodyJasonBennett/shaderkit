import { createHash } from 'node:crypto'
import { type Token, tokenize } from './tokenizer'

export type MangleMatcher = (token: Token, index: number, tokens: Token[]) => boolean

export interface MinifyOptions {
  /** Whether to rename variables. Will call a {@link MangleMatcher} if specified. Default is `false`. */
  mangle: boolean | MangleMatcher
  /** A map to read and write renamed variables to when mangling. */
  mangleMap: Map<string, string>
  /** Whether to rename external variables such as uniforms or varyings. Default is `false`. */
  mangleExternals: boolean
}

/**
 * Minifies a string of GLSL code.
 */
export function minify(
  code: string,
  { mangle = false, mangleMap = new Map(), mangleExternals = false }: Partial<MinifyOptions> = {},
): string {
  const tokens = tokenize(code)

  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    switch (token.type) {
      case 'comment':
        continue
      case 'directive': {
        if (tokens[i - 1]?.type !== 'directive') minified += '\n'
        minified += `${token.value.trim()}\n`
        continue
      }
      case 'identifier':
      case 'reserved': {
        if (/identifier|reserved/.test(tokens[i - 1]?.type)) minified += ' '

        let renamed = mangleMap.get(token.value)
        if (
          token.value !== renamed &&
          token.value !== 'main' &&
          (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens)) &&
          token.type === 'identifier' &&
          tokens[i - 1]?.type === 'reserved' &&
          (mangleExternals || !/(uniform|in|out|attribute|varying)/.test(tokens[i - 2]?.value))
        ) {
          renamed = createHash('sha256').update(token.value).digest('hex').slice(0, 8)
          mangleMap.set(token.value, renamed)
        }
        token.value = renamed ?? token.value
      }
      default: {
        minified += token.value
        continue
      }
    }
  }

  return minified.trim()
}
