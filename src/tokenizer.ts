import { GLSL_SYMBOLS, GLSL_RESERVED } from './constants'

export type TokenType = 'reserved' | 'directive' | 'comment' | 'symbol' | 'number' | 'identifier'

export interface Token<T extends TokenType = TokenType, V extends string = string> {
  type: T
  value: V
}

/**
 * Tokenizes a string of GLSL code.
 */
export function tokenize(code: string, index: number = 0): Token[] {
  const tokens: Token[] = []

  while (index < code.length) {
    let char = code[index]

    // Preserve preprocessor directives and comments
    const prefix = char + code[index + 1]
    const special = /\#\w|\/[\/\*]/.test(prefix)
    if (special) {
      // TODO: allow nested multi-line comments (e.g. /* /* ... */ */)
      const multiline = prefix === '/*'

      let value = ''
      while (multiline ? char + code[index + 1] !== '*/' : char !== '\n') {
        value += char
        index++
        char = code[index]
      }
      if (multiline) {
        value += '*/'
        index += 2
      }

      if (value.startsWith('#')) {
        tokens.push({ type: 'directive', value })
      } else {
        tokens.push({ type: 'comment', value })
      }

      continue
    }

    // Skip whitespace
    if (/\s/.test(char)) {
      index++
      continue
    }

    // Parse symbols
    const symbol = GLSL_SYMBOLS.find((symbol) => symbol === char)
    if (symbol) {
      tokens.push({ type: 'symbol', value: symbol })
      index++
      continue
    }

    // Parse identifiers and numbers, filter keywords
    let value = ''
    while (/\w/.test(char)) {
      value += char
      index++
      char = code[index]
    }

    if (/d/.test(value[0])) {
      tokens.push({ type: 'number', value })
    } else if (value.startsWith('gl_') || GLSL_RESERVED.find((keyword) => keyword === value)) {
      tokens.push({ type: 'reserved', value })
    } else {
      tokens.push({ type: 'identifier', value })
    }
  }

  return tokens
}
