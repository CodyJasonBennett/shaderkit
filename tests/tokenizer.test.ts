import { describe, it, expect } from 'vitest'
import { tokenize, type Token, GLSL_KEYWORDS, GLSL_SYMBOLS, WGSL_KEYWORDS, WGSL_SYMBOLS } from 'shaderkit'

describe('tokenizer', () => {
  it('can handle whitespace', () => {
    expect(tokenize(' \n\t')).toStrictEqual<Token[]>([{ type: 'whitespace', value: ' \n\t' }])
  })

  it('can handle comments', () => {
    expect(tokenize('// comment')).toStrictEqual<Token[]>([{ type: 'comment', value: '// comment' }])
    expect(tokenize('/* comment */')).toStrictEqual<Token[]>([{ type: 'comment', value: '/* comment */' }])
  })

  it('can handle floats', () => {
    expect(tokenize('0.0')).toStrictEqual<Token[]>([{ type: 'float', value: '0.0' }])
    expect(tokenize('0.')).toStrictEqual<Token[]>([{ type: 'float', value: '0.' }])
    expect(tokenize('.0')).toStrictEqual<Token[]>([{ type: 'float', value: '.0' }])
    expect(tokenize('0.0f')).toStrictEqual<Token[]>([{ type: 'float', value: '0.0f' }])
    expect(tokenize('0.0F')).toStrictEqual<Token[]>([{ type: 'float', value: '0.0F' }])
    expect(tokenize('0.0h')).toStrictEqual<Token[]>([{ type: 'float', value: '0.0h' }])
    expect(tokenize('0.0H')).toStrictEqual<Token[]>([{ type: 'float', value: '0.0H' }])
    expect(tokenize('1.23e3')).toStrictEqual<Token[]>([{ type: 'float', value: '1.23e3' }])
    expect(tokenize('4e-2')).toStrictEqual<Token[]>([{ type: 'float', value: '4e-2' }])
    expect(tokenize('3E+4')).toStrictEqual<Token[]>([{ type: 'float', value: '3E+4' }])
  })

  it('can handle integers', () => {
    expect(tokenize('0')).toStrictEqual<Token[]>([{ type: 'int', value: '0' }])
    expect(tokenize('0u')).toStrictEqual<Token[]>([{ type: 'int', value: '0u' }])
    expect(tokenize('0U')).toStrictEqual<Token[]>([{ type: 'int', value: '0U' }])
    expect(tokenize('0i')).toStrictEqual<Token[]>([{ type: 'int', value: '0i' }])
    expect(tokenize('0I')).toStrictEqual<Token[]>([{ type: 'int', value: '0I' }])
    expect(tokenize('0xFF')).toStrictEqual<Token[]>([{ type: 'int', value: '0xFF' }])
    expect(tokenize('0XFF')).toStrictEqual<Token[]>([{ type: 'int', value: '0XFF' }])
  })

  it('can handle identifiers', () => {
    expect(tokenize('test')).toStrictEqual<Token[]>([{ type: 'identifier', value: 'test' }])
  })

  it('can handle booleans', () => {
    expect(tokenize('true')).toStrictEqual<Token[]>([{ type: 'bool', value: 'true' }])
    expect(tokenize('false')).toStrictEqual<Token[]>([{ type: 'bool', value: 'false' }])
  })

  it('can handle identifiers', () => {
    expect(tokenize('test')).toStrictEqual<Token[]>([{ type: 'identifier', value: 'test' }])
  })

  it('can handle reserved words', () => {
    // NOTE: language detection is context-sensitive
    for (const keyword of WGSL_KEYWORDS) {
      expect(tokenize(`var test: type;${keyword}`).slice(-1)).toStrictEqual<Token[]>([
        { type: 'keyword', value: keyword.replace('@', '') },
      ])
    }
    for (const keyword of GLSL_KEYWORDS) {
      expect(tokenize(keyword).slice(-1)).toStrictEqual<Token[]>([{ type: 'keyword', value: keyword.replace('#', '') }])
    }
  })

  it('can handle symbols', () => {
    // NOTE: language detection is context-sensitive
    const comments = /\/\/|\/\*|\*\//
    for (const symbol of WGSL_SYMBOLS.filter((s) => !comments.test(s))) {
      expect(tokenize(`var test: type;${symbol}`).slice(-1)).toStrictEqual<Token[]>([{ type: 'symbol', value: symbol }])
    }
    for (const symbol of GLSL_SYMBOLS.filter((s) => !comments.test(s))) {
      expect(tokenize(symbol).slice(-1)).toStrictEqual<Token[]>([{ type: 'symbol', value: symbol }])
    }
  })
})
