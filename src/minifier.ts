import { tokenize } from './tokenizer'

/**
 * Minifies a string of GLSL code.
 */
export function minify(code: string): string {
  const tokens = tokenize(code)

  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    switch (token.type) {
      case 'comment':
        continue
      case 'directive': {
        minified += `\n${token.value.trim()}\n`
        continue
      }
      case 'identifier':
      case 'reserved': {
        if (/identifier|reserved/.test(tokens[i - 1]?.type)) minified += ' '
      }
      default: {
        minified += token.value
        continue
      }
    }
  }

  return minified.trim()
}
