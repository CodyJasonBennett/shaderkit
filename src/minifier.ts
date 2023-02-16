import { type Token, tokenize } from './tokenizer'

export type MangleMatcher = (token: Token, index: number, tokens: Token[]) => boolean

export interface MinifyOptions {
  /** Whether to rename variables. Will call a {@link MangleMatcher} if specified. Default is `false`. */
  mangle: boolean | MangleMatcher
  /** A map to read and write renamed variables to when mangling. */
  mangleMap: Map<string, string>
  /** Whether to rename external variables such as uniforms or varyings. Default is `false`. */
  mangleExternals: boolean
  /** Whether to rename properties in structs or uniform buffers. Default is `false`. */
  mangleProperties: boolean
}

/**
 * Minifies a string of GLSL code.
 */
export function minify(
  code: string,
  {
    mangle = false,
    mangleMap = new Map(),
    mangleExternals = false,
    mangleProperties = false,
  }: Partial<MinifyOptions> = {},
): string {
  const tokens = tokenize(code).filter((token) => token.type !== 'comment')

  let mangleIndex = 0
  let prefix: string | null = null
  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (/keyword|identifier/.test(token.type)) {
      if (/keyword|identifier/.test(tokens[i - 1]?.type)) minified += ' '

      // Resolve nested keys from members or accessors
      let key = token.value
      if (prefix) {
        key = `${prefix}.${token.value}`
      } else if (tokens[i - 1]?.value === '.' && tokens[i - 2]?.type !== 'symbol') {
        key = `${tokens[i - 2]?.value}.${token.value}`
      }

      // Mangle declarations and their references
      let renamed = mangleMap.get(key)
      if (
        // no-op
        !renamed &&
        // Filter variable names
        key !== 'main' &&
        (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens)) &&
        // Is declaration, reference, or namespace
        token.type === 'identifier' &&
        (/keyword|identifier/.test(tokens[i - 1]?.type) || tokens[i - 1]?.value === '}') &&
        // Skip shader externals when disabled
        (mangleExternals || !/(uniform|in|out|attribute|varying)/.test(tokens[i - 2]?.value))
      ) {
        // Start capturing namespaces, prefer UBO suffix if specified.
        // If UBOs don't specify a suffix, their inner declarations are global
        if (tokens[i + 1]?.value === '{') {
          let j = i
          while (tokens[j].value !== '}') j++
          const suffix = tokens[j + 1].value
          if (suffix !== ';') prefix = suffix
        }

        // Skip struct properties when specified
        if (!prefix || mangleProperties) {
          renamed = ''
          mangleIndex++

          let j = mangleIndex
          while (j > 0) {
            renamed = String.fromCharCode(97 + ((j % 26) - 1)) + renamed
            j = Math.floor(j / 26)
          }

          mangleMap.set(key, renamed)
        }

        // End capturing namespaces
        if (tokens[i + 2]?.value === '}') prefix = null
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
