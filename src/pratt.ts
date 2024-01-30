import { type AST, BinaryExpression, Literal, UnaryExpression } from './ast'
import { type Token, tokenize } from './tokenizer'

const OPERATOR_PRECEDENCE = {
  '(': 1,
  ')': 1,
  '[': 2,
  ']': 2,
  // function call
  '.': 2,
  '++': 2, // postfix
  '--': 2, // postfix
  // '++': 3, // prefix
  // '--': 3, // prefix
  // '+': 3, // unary
  // '-': 3, // unary
  '!': 3,
  '*': 4,
  '/': 4,
  '%': 4,
  '+': 5,
  '-': 5,
  '<<': 6,
  '>>': 6,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  '&=': 8,
  '|=': 8,
  '^=': 8,
  '%=': 8,
  '<<=': 8,
  '>>=': 8,
  '==': 8,
  '!=': 8,
  '&': 9,
  '^': 10,
  '|': 11,
  '&&': 12,
  '^^': 13,
  '||': 14,
  '?': 15,
  ':': 15,
  '=': 16,
  '+=': 16,
  '-=': 16,
  '*=': 16,
  '/=': 16,
  ',': 17,
} as const

class PrattParser {
  tokens: Token[] = []
  index: number = 0

  parse(tokens: Token[]) {
    this.tokens = tokens.filter((token) => token.type !== 'whitespace' && token.type !== 'comment')
    this.index = 0
    return this.parseExpression(0)
  }

  parseExpression(precedence: number): AST {
    let token = this.tokens[this.index++]
    let left = this.parseToken(token)

    while (this.index < this.tokens.length && precedence < this.getPrecedence()) {
      token = this.tokens[this.index++]
      left = this.parseBinary(token, left)
    }

    return left
  }

  parseBinary(operator: Token, left: AST): BinaryExpression {
    const precedence = this.getPrecedence(operator.value)
    const right = this.parseExpression(precedence)

    return new BinaryExpression(operator.value, left, right)
  }

  parseToken(token: Token): AST {
    if (token.type === 'float' || token.type === 'int' || token.type === 'bool') {
      return new Literal(token.value)
    } else if (token.type === 'symbol') {
      return new UnaryExpression(token.value, this.parseExpression(this.getPrecedence(token.value)), null)
    }

    throw new Error('Unexpected token: ' + token.value)
  }

  getPrecedence(operator: string = this.tokens[this.index].value) {
    return OPERATOR_PRECEDENCE[operator as keyof typeof OPERATOR_PRECEDENCE] ?? 0
  }
}

const glsl = /* glsl */ `5 + 3 * ++2 ? true : false`
const tokens = tokenize(glsl)

const result = new PrattParser().parse(tokens)

console.log(glsl)
console.log(result)
