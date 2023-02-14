import { GLSL_RESERVED, GLSL_SYMBOLS } from './constants'

export type TokenType = 'comment' | 'symbol' | 'number' | 'identifier' | 'reserved'

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

    // Skip whitespace
    if (/\s/.test(char)) {
      index++
      continue
    }

    // Parse symbols, combine if able
    if (!/\w/.test(char)) {
      let value = char
      for (const symbol of GLSL_SYMBOLS) {
        if (symbol.length > value.length && code.startsWith(symbol, index)) value = symbol
      }
      index += value.length

      // Preserve whitespace in comments
      const isComment = value === '//'
      const isMultiline = value === '/*'
      if (isComment || isMultiline) {
        while (!value.endsWith(isMultiline ? '*/' : '\n')) {
          value += code[index]
          index++
        }
        tokens.push({ type: 'comment', value })
      } else {
        // Escape newlines after directives
        // TODO: exclude inlined comments
        if (char === '#') {
          let i = index
          while (char !== '\n') char = code[i++]
          code = code.substring(0, i) + '\\' + code.substring(i + 1)
        }

        tokens.push({ type: 'symbol', value })
      }

      continue
    }

    // Parse alphanumeric tokens
    let value = ''
    while (/\w/.test(code[index])) {
      value += code[index]
      index++
    }

    if (/\d/.test(char)) {
      tokens.push({ type: 'number', value })
    } else if (GLSL_RESERVED.includes(value)) {
      tokens.push({ type: 'reserved', value })
    } else {
      tokens.push({ type: 'identifier', value })
    }
  }

  return tokens
}
