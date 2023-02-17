import { GLSL_SYMBOLS, GLSL_KEYWORDS } from './constants'

export type TokenType = 'comment' | 'symbol' | 'number' | 'identifier' | 'keyword'

export interface Token<T = TokenType, V = string> {
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
    while (/\w/.test(code[index])) value += code[index++]

    // Parse symbols, combine if able
    if (!value) {
      value = char
      for (const symbol of GLSL_SYMBOLS) {
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
      tokens.push({ type: 'number', value })
    } else if (GLSL_KEYWORDS.includes(tokens[tokens.length - 1]?.value === '#' ? `#${value}` : value)) {
      tokens.push({ type: 'keyword', value })
    } else {
      tokens.push({ type: 'identifier', value })
    }
  }

  return tokens
}
