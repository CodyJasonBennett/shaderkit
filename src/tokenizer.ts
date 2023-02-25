import { SYMBOLS, WGSL_KEYWORDS, GLSL_KEYWORDS } from './constants'

export type TokenType = 'comment' | 'symbol' | 'bool' | 'float' | 'int' | 'identifier' | 'keyword'

export interface Token<T = TokenType, V = string> {
  type: T
  value: V
}

// Checks for WGSL-specific `fn foo(`, `var bar =`, and `let baz =`
const WGSL_REGEX = /\bfn\s+\w+\s*\(|\b(var|let)\s+\w+\s*=/

/**
 * Tokenizes a string of GLSL or WGSL code.
 */
export function tokenize(code: string, index: number = 0): Token[] {
  const tokens: Token[] = []

  const KEYWORDS = WGSL_REGEX.test(code) ? WGSL_KEYWORDS : GLSL_KEYWORDS
  while (index < code.length) {
    let char = code[index]
    let value = ''

    // Skip whitespace
    if (/\s/.test(char)) {
      index++
      continue
    }

    // Escape newlines after directives, skip comments
    if (char === '#') {
      let j = index
      while (code[j] !== '\n' && !/\/[\/\*]/.test(code[j] + code[j + 1])) j++
      code = code.substring(0, j) + '\\' + code.substring(j)
    }

    // Parse values and identifiers
    while ((/\d/.test(char) ? /[\d\.\-\w]/ : /\w/).test(code[index])) value += code[index++]

    // Parse symbols, combine if able
    if (!value) {
      value = char
      for (const symbol of SYMBOLS) {
        if (symbol.length > value.length && code.startsWith(symbol, index)) value = symbol
      }
      index += value.length
    }

    // Label and add token
    if (/\/[\/\*]/.test(value)) {
      const isMultiline = value === '/*'
      while (!value.endsWith(isMultiline ? '*/' : '\n')) value += code[index++]
      tokens.push({ type: 'comment', value })
    } else if (!/\w/.test(char)) {
      tokens.push({ type: 'symbol', value })
    } else if (/\d/.test(char)) {
      if (/\.|[eEpP][-+]?\d|[fFhH]$/.test(value)) tokens.push({ type: 'float', value })
      else tokens.push({ type: 'int', value })
    } else if (/^(true|false)$/.test(value)) {
      tokens.push({ type: 'bool', value })
    } else if (KEYWORDS.includes(value)) {
      tokens.push({ type: 'keyword', value })
    } else {
      tokens.push({ type: 'identifier', value })
    }
  }

  return tokens
}
