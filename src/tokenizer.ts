import { WGSL_KEYWORDS, WGSL_SYMBOLS, GLSL_KEYWORDS, GLSL_SYMBOLS } from './constants.js'

export type TokenType = 'whitespace' | 'comment' | 'symbol' | 'bool' | 'float' | 'int' | 'identifier' | 'keyword'

export interface Token<T = TokenType, V = string> {
  type: T
  value: V
}

// Checks for WGSL-specific `fn foo(`, `var bar =`, `let baz =`, `const qux =`
const WGSL_REGEX = /\bfn\s+\w+\s*\(|\b(var|let|const)\s+\w+\s*[:=]/

const FLOAT_REGEX = /((\d+\.\d*|\d*\.\d+)([eEpP][-+]?\d+)?|\d+[eEpP][-+]?\d+)[fFhH]?/y
const INT_REGEX = /(0[xX][\w\d]+|\d+)[iIuU]?/y
const BOOL_REGEX = /^(true|false)$/

const ZERO = 48
const NINE = 57
const A = 65
const Z = 90
const LF = 10
const CR = 13
const TAB = 9
const SPACE = 32
const UNDERSCORE = 95
const DOT = 46
const SLASH = 47
const STAR = 42
const HASH = 35
const AT = 64

const isDigit = (c: number): boolean => ZERO <= c && c <= NINE
const isAlpha = (c: number): boolean => ((c &= ~32), A <= c && c <= Z)
const isLine = (c: number): boolean => c === LF || c === CR
const isSpace = (c: number): boolean => isLine(c) || c === TAB || c === SPACE
const isIdent = (c: number): boolean => isAlpha(c) || isDigit(c) || c === UNDERSCORE
const isMacro = (c: number): boolean => c === HASH || c === AT

// https://mrale.ph/blog/2016/11/23/making-less-dart-faster.html
function matchAsPrefix(regex: RegExp, string: string, start: number): string | undefined {
  regex.lastIndex = start
  return regex.exec(string)?.[0]
}

/**
 * Tokenizes a string of GLSL or WGSL code.
 */
export function tokenize(code: string, index: number = 0): Token[] {
  const [KEYWORDS, SYMBOLS] = WGSL_REGEX.test(code) ? [WGSL_KEYWORDS, WGSL_SYMBOLS] : [GLSL_KEYWORDS, GLSL_SYMBOLS]

  const KEYWORDS_LIST = new Set(KEYWORDS)
  const SYMBOLS_REGEX = new RegExp(
    SYMBOLS.sort((a, b) => b.length - a.length)
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'y',
  )

  const tokens: Token[] = []

  let value: string | undefined
  let start: number
  let char: number

  while (index < code.length) {
    start = index
    char = code.charCodeAt(index++)

    if (isSpace(char)) {
      while (isSpace(code.charCodeAt(index))) index++
      value = code.slice(start, index)
      tokens.push({ type: 'whitespace', value })
    } else if (isDigit(char) || (char === DOT && isDigit(code.charCodeAt(index)))) {
      if ((value = matchAsPrefix(FLOAT_REGEX, code, start))) {
        index = FLOAT_REGEX.lastIndex
        tokens.push({ type: 'float', value })
      } else if ((value = matchAsPrefix(INT_REGEX, code, start))) {
        index = INT_REGEX.lastIndex
        tokens.push({ type: 'int', value })
      }
    } else if (isIdent(char)) {
      while (isIdent(code.charCodeAt(index))) index++
      value = code.slice(start, index)
      if (BOOL_REGEX.test(value)) tokens.push({ type: 'bool', value })
      else if (KEYWORDS_LIST.has(isMacro(code.charCodeAt(start - 1)) ? code[start - 1] + value : value))
        tokens.push({ type: 'keyword', value })
      else tokens.push({ type: 'identifier', value })
    } else if (char === SLASH && code.charCodeAt(index) === SLASH) {
      while (index < code.length && code.charCodeAt(index) !== LF) index++
      value = code.slice(start, index)
      index++ // consume LF
      tokens.push({ type: 'comment', value })
    } else if (char === SLASH && code.charCodeAt(index) === STAR) {
      while (index < code.length && (code.charCodeAt(index - 2) !== STAR || code.charCodeAt(index - 1) !== SLASH))
        index++
      value = code.slice(start, index)
      tokens.push({ type: 'comment', value })
    } else if ((value = matchAsPrefix(SYMBOLS_REGEX, code, start))) {
      index += value.length - 1
      tokens.push({ type: 'symbol', value })
    }
  }

  return tokens
}
