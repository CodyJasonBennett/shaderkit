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
  const tokens = tokenize(code).filter((token) => token.type !== 'comment')

  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'identifier' || token.type === 'reserved') {
      if (tokens[i - 1]?.type === 'identifier' || tokens[i - 1]?.type === 'reserved') minified += ' '

      // Mangle declarations and their references
      let renamed = mangleMap.get(token.value)
      if (
        // no-op
        token.value !== renamed &&
        // Filter variable names
        token.value !== 'main' &&
        (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens)) &&
        // Is declaration or reference
        token.type === 'identifier' &&
        tokens[i - 1]?.type === 'reserved' &&
        // Skip shader externals when disabled
        (mangleExternals || !/(uniform|in|out|attribute|varying)/.test(tokens[i - 2]?.value))
      ) {
        renamed = createHash('sha256').update(token.value).digest('hex').slice(0, 8)
        mangleMap.set(token.value, renamed)
      }

      minified += renamed ?? token.value
    } else if (token.value === '#') {
      // Don't pad consecutive directives
      if (tokens[i - 1]?.value !== '\\') minified += '\n'

      // Join preprocessor directives
      while (tokens[i].value !== '\\') {
        if (tokens[i].type !== 'symbol' && tokens[i - 1]?.type !== 'symbol') minified += ' '
        minified += tokens[i].value
        i++
      }

      minified += '\n'
    } else {
      minified += token.value
    }
  }

  return minified.trim()
}
