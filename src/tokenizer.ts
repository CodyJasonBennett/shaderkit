export type TokenType = 'directive' | 'comment' | 'symbol' | 'number' | 'identifier'

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

    // Preserve preprocessor directives and comments
    // TODO: allow nested multi-line comments (e.g. /* /* ... */ */)
    const prefix = char + code[index + 1]
    const isSpecial = char === '#' || /\/[\/\*]/.test(prefix)

    if (!isSpecial) {
      // Skip whitespace
      if (/\s/.test(char)) {
        index++
        continue
      }

      // Parse symbols
      // TODO: combine complex symbols (e.g. ==) and skip negative numbers
      if (/[^\w]/.test(char)) {
        tokens.push({ type: 'symbol', value: char })
        index++
        continue
      }
    }

    // Parse multi-line and multi-character tokens
    let value = ''
    while (isSpecial ? !value.endsWith(prefix === '/*' ? '*/' : '\n') : /\w/.test(char)) {
      value += char
      index++
      char = code[index]
    }

    if (isSpecial && value.startsWith('#')) {
      tokens.push({ type: 'directive', value })
    } else if (isSpecial) {
      tokens.push({ type: 'comment', value })
    } else if (/\d/.test(value[0])) {
      tokens.push({ type: 'number', value })
    } else {
      tokens.push({ type: 'identifier', value })
    }
  }

  return tokens
}
