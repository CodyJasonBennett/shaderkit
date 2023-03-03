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

const isWord = RegExp.prototype.test.bind(/^\w/)
const isName = RegExp.prototype.test.bind(/^[_A-Za-z]/)
const isStorage = RegExp.prototype.test.bind(/^(uniform|in|out|attribute|varying|,)$/)

/**
 * Minifies a string of GLSL or WGSL code.
 */
export function minify(
  code: string,
  { mangle = false, mangleMap = new Map(), mangleExternals = false }: Partial<MinifyOptions> = {},
): string {
  // Escape newlines after directives, skip comments
  code = code.replace(/(^\s*#[^\\]*?)(\n|\/[\/\*])/gm, '$1\\$2')

  const exclude = new Set<string>(mangleMap.values())
  const tokens: Token[] = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  let mangleIndex: number = 0
  let blockIndex: number | null = null
  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Pad alphanumeric tokens
    if (isWord(token.value) && isWord(tokens[i - 1]?.value)) minified += ' '

    // Mark enter/leave block-scope
    if (token.value === '{' && isName(tokens[i - 1]?.value)) blockIndex = i - 1
    else if (token.value === '}') blockIndex = null

    // Mangle declarations and their references
    if (isName(token.value)) {
      let renamed = mangleMap.get(token.value)
      if (
        // no-op
        !renamed &&
        // Skip struct properties
        blockIndex == null &&
        // Filter variable names
        token.value !== 'main' &&
        (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens)) &&
        // Is declaration, reference, namespace, or comma-separated list
        token.type === 'identifier' &&
        (isName(tokens[i - 1]?.value) || /}|,/.test(tokens[i - 1]?.value) || tokens[i + 1]?.value === ':') &&
        // Skip shader externals when disabled
        (mangleExternals || (!isStorage(tokens[i - 1]?.value) && !isStorage(tokens[i - 2]?.value)))
      ) {
        while (!renamed || exclude.has(renamed)) {
          renamed = ''
          mangleIndex++

          let j = mangleIndex
          while (j > 0) {
            renamed = String.fromCharCode(97 + ((j % 26) - 1)) + renamed
            j = Math.floor(j / 26)
          }
        }

        mangleMap.set(token.value, renamed)
      }

      minified += renamed ?? token.value

      // three.js has a white-space sensitive RegExp
      // https://github.com/mrdoob/three.js/blob/dev/src/renderers/webgl/WebGLProgram.js#L206
      if (token.value === 'include') minified += ' '
    } else {
      if (token.value === '#' && tokens[i - 1]?.value !== '\\') minified += '\n#'
      else if (token.value === '\\') minified += '\n'
      else minified += token.value
    }
  }

  return minified.trim()
}
