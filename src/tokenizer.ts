import { SYMBOLS, WGSL_KEYWORDS, GLSL_KEYWORDS } from './constants'

export type TokenType = 'whitespace' | 'comment' | 'symbol' | 'bool' | 'float' | 'int' | 'identifier' | 'keyword'

export interface Token<T = TokenType, V = string> {
  type: T
  value: V
}

// Checks for WGSL-specific `fn foo(`, `var bar =`, and `let baz =`
const isWGSL = RegExp.prototype.test.bind(/\bfn\s+\w+\s*\(|\b(var|let)\b/)

const isFloat = RegExp.prototype.test.bind(/\.|[eEpP][-+]?\d|[fFhH]$/)
const isBool = RegExp.prototype.test.bind(/^(true|false)$/)

const ZERO = 48
const NINE = 57
const A = 65
const Z = 90
const LF = 10
const CR = 13
const TAB = 9
const SPACE = 32
const PLUS = 43
const MINUS = 45
const DOT = 46
const UNDERSCORE = 95
const SLASH = 47
const STAR = 42

const isDigit = (c: number) => ZERO <= c && c <= NINE
const isAlpha = (c: number) => ((c &= ~32), A <= c && c <= Z)
const isLine = (c: number) => c === LF || c === CR
const isSpace = (c: number) => isLine(c) || c === TAB || c === SPACE
const isNumber = (c: number) => isAlpha(c) || isDigit(c) || c === PLUS || c === MINUS || c === DOT
const isIdent = (c: number) => isAlpha(c) || isDigit(c) || c === UNDERSCORE

/**
 * Tokenizes a string of GLSL or WGSL code.
 */
export function tokenize(code: string, index: number = 0): Token[] {
  const tokens: Token[] = []

  const KEYWORDS = isWGSL(code) ? WGSL_KEYWORDS : GLSL_KEYWORDS
  while (index < code.length) {
    let value = code[index]
    const char = code.charCodeAt(index++)

    if (isSpace(char)) {
      while (isSpace(code.charCodeAt(index))) value += code[index++]
      tokens.push({ type: 'whitespace', value })
    } else if (isDigit(char)) {
      while (isNumber(code.charCodeAt(index))) value += code[index++]
      if (isFloat(value)) tokens.push({ type: 'float', value })
      else tokens.push({ type: 'int', value })
    } else if (isAlpha(char)) {
      while (isIdent(code.charCodeAt(index))) value += code[index++]
      if (isBool(value)) tokens.push({ type: 'bool', value })
      else if (KEYWORDS.includes(value)) tokens.push({ type: 'keyword', value })
      else tokens.push({ type: 'identifier', value })
    } else if (char === SLASH && (code.charCodeAt(index) === SLASH || code.charCodeAt(index) === STAR)) {
      const isMultiline = code.charCodeAt(index) === STAR
      while (!value.endsWith(isMultiline ? '*/' : '\n')) value += code[index++]
      tokens.push({ type: 'comment', value })
    } else {
      for (const symbol of SYMBOLS) {
        if (symbol.length > value.length && code.startsWith(symbol, index - 1)) value = symbol
      }
      index += value.length - 1
      tokens.push({ type: 'symbol', value })
    }
  }

  return tokens
}
