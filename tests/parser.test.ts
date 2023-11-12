import { describe, it, expect } from 'vitest'
import {
  parse,
  Identifier,
  Literal,
  UnaryExpression,
  BinaryExpression,
  TernaryExpression,
  CallExpression,
  MemberExpression,
} from 'shaderkit'

describe('parser', () => {
  describe('GLSL', () => {
    it('parses identifiers', () => {
      const identifier = parse('identifier')[0] as Identifier
      expect(identifier).toBeInstanceOf(Identifier)
      expect(identifier.value).toBe('identifier')
    })

    it('parses literals', () => {
      for (const value of ['true', 'false', '0', '0.0']) {
        const literal = parse(value)[0] as Literal
        expect(literal).toBeInstanceOf(Literal)
        expect(literal.value).toBe(value)
      }
    })

    it('parses unary expressions', () => {
      for (const operator of ['+', '-', '~', '!', '++', '--']) {
        const left = parse(`0${operator}`)[0] as UnaryExpression
        expect(left).toBeInstanceOf(UnaryExpression)
        expect(left.operator).toBe(operator)
        expect(left.argument).toBeInstanceOf(Literal)
        expect((left.argument as Literal).value).toBe('0')

        const right = parse(`${operator}1`)[0] as UnaryExpression
        expect(right).toBeInstanceOf(UnaryExpression)
        expect(right.operator).toBe(operator)
        expect(right.argument).toBeInstanceOf(Literal)
        expect((right.argument as Literal).value).toBe('1')
      }
    })

    it('parses binary expressions', () => {
      const expression = parse('0 == 1')[0] as BinaryExpression
      expect(expression).toBeInstanceOf(BinaryExpression)
      expect(expression.operator).toBe('==')
      expect(expression.left).toBeInstanceOf(Literal)
      expect((expression.left as Literal).value).toBe('0')
      expect(expression.right).toBeInstanceOf(Literal)
      expect((expression.right as Literal).value).toBe('1')
    })

    it('parses ternary expressions', () => {
      const expression = parse('true ? 0 : 1')[0] as TernaryExpression
      expect(expression).toBeInstanceOf(TernaryExpression)
      expect(expression.test).toBeInstanceOf(Literal)
      expect((expression.test as Literal).value).toBe('true')
      expect(expression.consequent).toBeInstanceOf(Literal)
      expect((expression.consequent as Literal).value).toBe('0')
      expect(expression.alternate).toBeInstanceOf(Literal)
      expect((expression.alternate as Literal).value).toBe('1')
    })

    it('parses call expressions', () => {
      {
        const expression = parse('main()')[0] as CallExpression
        expect(expression).toBeInstanceOf(CallExpression)
        expect(expression.callee).toBeInstanceOf(Identifier)
        expect((expression.callee as Identifier).value).toBe('main')
        expect(expression.args.length).toBe(0)
      }

      {
        const expression = parse('all(true, false)')[0] as CallExpression
        expect(expression).toBeInstanceOf(CallExpression)
        expect(expression.callee).toBeInstanceOf(Identifier)
        expect((expression.callee as Identifier).value).toBe('all')
        expect(expression.args.length).toBe(2)
        expect(expression.args[0]).toBeInstanceOf(Literal)
        expect((expression.args[0] as Literal).value).toBe('true')
        expect(expression.args[1]).toBeInstanceOf(Literal)
        expect((expression.args[1] as Literal).value).toBe('false')
      }
    })

    it('parses member expressions', () => {
      const expression = parse('foo.bar')[0] as MemberExpression
      expect(expression).toBeInstanceOf(MemberExpression)
      expect(expression.object).toBeInstanceOf(Identifier)
      expect((expression.object as Identifier).value).toBe('foo')
      expect(expression.property).toBeInstanceOf(Identifier)
      expect((expression.property as Identifier).value).toBe('bar')
    })
  })
})
