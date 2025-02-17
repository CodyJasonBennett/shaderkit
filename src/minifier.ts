import { type Token, tokenize } from './tokenizer.js'
import { GLSL_KEYWORDS, WGSL_KEYWORDS } from './constants.js'

export type MangleMatcher = (token: Token, index: number, tokens: Token[]) => boolean

export interface MinifyOptions {
  /** Whether to rename variables. Will call a {@link MangleMatcher} if specified. Default is `false`. */
  mangle: boolean | MangleMatcher
  /** A map to read and write renamed variables to when mangling. */
  mangleMap: Map<string, string>
  /** Whether to rename external variables such as uniforms or varyings. Default is `false`. */
  mangleExternals: boolean
}

const isWord = /* @__PURE__ */ RegExp.prototype.test.bind(/^\w/)
const isSymbol = /* @__PURE__ */ RegExp.prototype.test.bind(/[^\w\\]/)
const isName = /* @__PURE__ */ RegExp.prototype.test.bind(/^[_A-Za-z]/)
const isScoped = /* @__PURE__ */ RegExp.prototype.test.bind(/[;{}\\@]/)
const isStorage = /* @__PURE__ */ RegExp.prototype.test.bind(
  /^(binding|group|layout|uniform|in|out|attribute|varying)$/,
)

// Checks for WGSL-specific `fn foo(`, `var bar =`, `let baz =`, `const qux =`
const WGSL_REGEX = /\bfn\s+\w+\s*\(|\b(var|let|const)\s+\w+\s*[:=]/

const NEWLINE_REGEX = /\\\s+/gm
const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

/**
 * Minifies a string of GLSL or WGSL code.
 */
export function minify(
  code: string,
  { mangle = false, mangleMap = new Map(), mangleExternals = false }: Partial<MinifyOptions> = {},
): string {
  // Fold newlines
  code = code.replace(NEWLINE_REGEX, '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  const KEYWORDS = WGSL_REGEX.test(code) ? WGSL_KEYWORDS : GLSL_KEYWORDS

  const mangleCache = new Map()
  const tokens: Token[] = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  let mangleIndex: number = -1
  let lineIndex: number = -1
  let blockIndex: number = -1
  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Track possibly external scopes
    if (isStorage(token.value) || isScoped(tokens[i - 1]?.value)) lineIndex = i

    // Mark enter/leave block-scope
    if (token.value === '{' && isName(tokens[i - 1]?.value)) blockIndex = i - 1
    else if (token.value === '}') blockIndex = -1

    // Pad alphanumeric tokens
    if (isWord(token.value) && isWord(tokens[i - 1]?.value)) minified += ' '

    // Pad symbols around #define and three.js #include (white-space sensitive)
    if (
      isSymbol(token.value) &&
      ((tokens[i - 2]?.value === '#' && tokens[i - 1]?.value === 'include') ||
        (tokens[i - 2]?.value === '#' && tokens[i - 1]?.value === 'if') ||
        (tokens[i - 2]?.value === '#' && tokens[i - 1]?.value === 'elif') ||
        (tokens[i - 3]?.value === '#' && tokens[i - 2]?.value === 'define'))
    ) {
      // Move padding after #define arguments
      if (token.value === '(') {
        while (i < tokens.length) {
          const next = tokens[i++]
          minified += next.value

          if (next.value === ')') break
        }

        minified += ' ' + tokens[i].value

        continue
      } else {
        minified += ' '
      }
    }

    let prefix = token.value
    if (tokens[i - 1]?.value === '.') {
      prefix = `${tokens[i - 2]?.value}.` + prefix
    }

    // Mangle declarations and their references
    if (
      token.type === 'identifier' &&
      // Filter variable names
      prefix !== 'main' &&
      (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens))
    ) {
      const namespace = tokens[i - 1]?.value === '}' && tokens[i + 1]?.value === ';'
      const storage = isStorage(tokens[lineIndex]?.value)
      const list = storage && tokens[i - 1]?.value === ','
      let renamed = mangleMap.get(prefix) ?? mangleCache.get(prefix)
      if (
        // no-op
        !renamed &&
        // Skip struct properties
        blockIndex === -1 &&
        // Is declaration, reference, namespace, or comma-separated list
        (isName(tokens[i - 1]?.value) ||
          // uniform Type { ... } name;
          namespace ||
          // uniform float foo, bar;
          list ||
          // fn (arg: type) -> void
          (tokens[i - 1]?.type === 'symbol' && tokens[i + 1]?.value === ':')) &&
        // Skip shader externals when disabled
        (mangleExternals || !storage)
      ) {
        // Write shader externals and preprocessor defines to mangleMap for multiple passes
        // TODO: do so via scope tracking
        const isExternal =
          // Shader externals
          (mangleExternals && storage) ||
          // Defines
          tokens[i - 2]?.value === '#' ||
          // Namespaced uniform structs
          namespace ||
          // Comma-separated list of uniforms
          list ||
          // WGSL entrypoints via @stage or @workgroup_size(...)
          (tokens[i - 1]?.value === 'fn' && (tokens[i - 2]?.value === ')' || tokens[i - 3]?.value === '@'))
        const cache = isExternal ? mangleMap : mangleCache

        while (!renamed || cache.has(renamed) || KEYWORDS.includes(renamed)) {
          renamed = ''
          mangleIndex++

          let j = mangleIndex
          while (j > 0) {
            renamed = String.fromCharCode(97 + ((j - 1) % 26)) + renamed
            j = Math.floor(j / 26)
          }
        }

        cache.set(prefix, renamed)
      }

      minified += renamed ?? token.value
    } else {
      if (token.value === '#' && tokens[i - 1]?.value !== '\\') minified += '\n#'
      else if (token.value === '\\') minified += '\n'
      else minified += token.value
    }
  }

  return minified.trim()
}
