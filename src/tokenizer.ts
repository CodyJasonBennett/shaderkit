import { WGSL_KEYWORDS, WGSL_SYMBOLS, GLSL_KEYWORDS, GLSL_SYMBOLS } from './constants.js'

export type TokenType = 'whitespace' | 'comment' | 'symbol' | 'bool' | 'float' | 'int' | 'identifier' | 'keyword'

export interface Token<T = TokenType, V = string> {
  type: T
  value: V
}

// Checks for WGSL-specific `fn foo(`, `var bar =`, `let baz =`, `const qux =`
const isWGSL = /* @__PURE__ */ RegExp.prototype.test.bind(/\bfn\s+\w+\s*\(|\b(var|let|const)\s+\w+\s*[:=]/)

const isFloat = /* @__PURE__ */ RegExp.prototype.test.bind(/^(\d+\.\d*|\d*\.\d+)([eEpP][-+]?\d+)?[fFhH]?$/)
const isInt = /* @__PURE__ */ RegExp.prototype.test.bind(/^(0[xX][\w\d]+|\d+)[iIuU]?$/)
const isBool = /* @__PURE__ */ RegExp.prototype.test.bind(/^(true|false)$/)

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

const isDigit = (c: number) => ZERO <= c && c <= NINE
const isAlpha = (c: number) => ((c &= ~32), A <= c && c <= Z)
const isLine = (c: number) => c === LF || c === CR
const isSpace = (c: number) => isLine(c) || c === TAB || c === SPACE
const isIdent = (c: number) => isAlpha(c) || isDigit(c) || c === UNDERSCORE
const isMacro = (c: number) => c === HASH || c === AT

/**
 * Tokenizes a string of GLSL or WGSL code.
 */
export function tokenize(code: string, index: number = 0): Token[] {
  const tokens: Token[] = []

  let prev: number = -1
  const [KEYWORDS, SYMBOLS] = isWGSL(code) ? [WGSL_KEYWORDS, WGSL_SYMBOLS] : [GLSL_KEYWORDS, GLSL_SYMBOLS]
  while (index < code.length) {
    let value = code[index]
    const char = code.charCodeAt(index++)

    if (isSpace(char)) {
      while (isSpace(code.charCodeAt(index))) value += code[index++]
      tokens.push({ type: 'whitespace', value })
    } else if (isDigit(char) || (char === DOT && isDigit(code.charCodeAt(index)))) {
      while (isFloat(value + code[index]) || isInt(value + code[index])) value += code[index++]
      if (isFloat(value)) tokens.push({ type: 'float', value })
      else tokens.push({ type: 'int', value })
    } else if (isIdent(char)) {
      while (isIdent(code.charCodeAt(index))) value += code[index++]
      if (isBool(value)) tokens.push({ type: 'bool', value })
      else if (KEYWORDS.includes(isMacro(prev) ? String.fromCharCode(prev) + value : value))
        tokens.push({ type: 'keyword', value })
      else tokens.push({ type: 'identifier', value })
    } else if (char === SLASH && (code.charCodeAt(index) === SLASH || code.charCodeAt(index) === STAR)) {
      const terminator = code.charCodeAt(index) === STAR ? '*/' : '\n'
      while (index < code.length && !value.endsWith(terminator)) value += code[index++]
      tokens.push({ type: 'comment', value: value.trim() })
    } else {
      for (const symbol of SYMBOLS) {
        if (symbol.length > value.length && code.startsWith(symbol, index - 1)) value = symbol
      }
      index += value.length - 1
      tokens.push({ type: 'symbol', value })
    }
    prev = char
  }

  return tokens
}
