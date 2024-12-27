import {
  type AST,
  Type,
  Identifier,
  Literal,
  CallExpression,
  UnaryExpression,
  MemberExpression,
  TernaryExpression,
  BinaryExpression,
  BlockStatement,
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  ContinueStatement,
  BreakStatement,
  DiscardStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  DoWhileStatement,
  SwitchStatement,
  SwitchCase,
  StructDeclaration,
  PrecisionStatement,
  ArrayExpression,
  PreprocessorStatement,
} from './ast'
import { type Token, tokenize } from './tokenizer'

// https://engineering.desmos.com/articles/pratt-parser
// https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html

// TODO: AssignmentExpression
type Expression =
  | Literal
  | Identifier
  | UnaryExpression
  | BinaryExpression
  | TernaryExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression

enum Operators {
  // Unary
  COMPLEMENT = '~',
  DECREMENT = '--',
  INCREMENT = '++',
  NOT = '!',

  // Binary
  BITWISE_AND = '&',
  BITWISE_OR = '|',
  BITWISE_XOR = '^',
  DIVIDE = '/',
  EQUAL = '==',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  LOGICAL_AND = '&&',
  LOGICAL_OR = '||',
  LOGICAL_XOR = '^^',
  MINUS = '-',
  MULTIPLY = '*',
  NOT_EQUAL = '!=',
  PLUS = '+',
  REMAINDER = '%',
  SHIFT_LEFT = '<<',
  SHIFT_RIGHT = '>>',

  // Binary assignment
  ASSIGN = '=',
  ASSIGN_ADD = '+=',
  ASSIGN_BITWISE_AND = '&=',
  ASSIGN_BITWISE_OR = '|=',
  ASSIGN_BITWISE_XOR = '^=',
  ASSIGN_DIVIDE = '/=',
  ASSIGN_MULTIPLY = '*=',
  ASSIGN_REMAINDER = '%=',
  ASSIGN_SHIFT_LEFT = '<<=',
  ASSIGN_SHIFT_RIGHT = '>>=',
  ASSIGN_SUBTRACT = '-=',

  // Other
  COLON = ':',
  COMMA = ',',
  DOT = '.',
  LEFT_BRACE = '{',
  LEFT_BRACKET = '[',
  LEFT_PARENTHESIS = '(',
  QUESTION = '?',
  RIGHT_BRACE = '}',
  RIGHT_BRACKET = ']',
  RIGHT_PARENTHESIS = ')',
  SEMICOLON = ';',
  PREPROCESSOR = '#',
  NEWLINE = '\\',
  ATTRIBUTE = '@', // WGSL
}

enum Precedence {
  LOWEST,
  COMMA,
  ASSIGN,
  LOGICAL_OR,
  LOGICAL_XOR,
  LOGICAL_AND,
  BITWISE_OR,
  BITWISE_XOR,
  BITWISE_AND,
  TERNARY,
  COMPARE,
  SHIFT,
  ADD,
  MULTIPLY,
  UNARY_PREFIX,
  UNARY_POSTFIX,
  MEMBER,
}

const PREFIX_OPERATOR_PRECEDENCE: Record<string, Precedence> = {
  [Operators.COMPLEMENT]: Precedence.UNARY_PREFIX,
  [Operators.NOT]: Precedence.UNARY_PREFIX,
  [Operators.DECREMENT]: Precedence.UNARY_PREFIX,
  [Operators.INCREMENT]: Precedence.UNARY_PREFIX,
  [Operators.MINUS]: Precedence.UNARY_PREFIX,
  [Operators.PLUS]: Precedence.UNARY_PREFIX,
}

const POSTFIX_OPERATOR_PRECEDENCE: Record<string, Precedence> = {
  [Operators.DECREMENT]: Precedence.UNARY_POSTFIX,
  [Operators.INCREMENT]: Precedence.UNARY_POSTFIX,
  [Operators.LEFT_PARENTHESIS]: Precedence.LOWEST,
  [Operators.LEFT_BRACKET]: Precedence.MEMBER,
  [Operators.DOT]: Precedence.MEMBER,
}

const INFIX_OPERATOR_PRECEDENCE_LEFT: Record<string, Precedence> = {
  [Operators.LOGICAL_OR]: Precedence.LOGICAL_OR,
  [Operators.LOGICAL_XOR]: Precedence.LOGICAL_XOR,
  [Operators.LOGICAL_AND]: Precedence.LOGICAL_AND,
  [Operators.BITWISE_OR]: Precedence.BITWISE_OR,
  [Operators.BITWISE_XOR]: Precedence.BITWISE_XOR,
  [Operators.BITWISE_AND]: Precedence.BITWISE_AND,
  [Operators.EQUAL]: Precedence.COMPARE,
  [Operators.GREATER_THAN]: Precedence.COMPARE,
  [Operators.GREATER_THAN_OR_EQUAL]: Precedence.COMPARE,
  [Operators.LESS_THAN]: Precedence.COMPARE,
  [Operators.LESS_THAN_OR_EQUAL]: Precedence.COMPARE,
  [Operators.NOT_EQUAL]: Precedence.COMPARE,
  [Operators.SHIFT_LEFT]: Precedence.SHIFT,
  [Operators.SHIFT_RIGHT]: Precedence.SHIFT,
  [Operators.PLUS]: Precedence.ADD,
  [Operators.MINUS]: Precedence.ADD,
  [Operators.MULTIPLY]: Precedence.MULTIPLY,
  [Operators.DIVIDE]: Precedence.MULTIPLY,
  [Operators.REMAINDER]: Precedence.MULTIPLY,
}

const INFIX_OPERATOR_PRECEDENCE_RIGHT: Record<string, Precedence> = {
  [Operators.ASSIGN]: Precedence.ASSIGN,
  [Operators.ASSIGN_ADD]: Precedence.ASSIGN,
  [Operators.ASSIGN_BITWISE_AND]: Precedence.ASSIGN,
  [Operators.ASSIGN_BITWISE_OR]: Precedence.ASSIGN,
  [Operators.ASSIGN_BITWISE_XOR]: Precedence.ASSIGN,
  [Operators.ASSIGN_DIVIDE]: Precedence.ASSIGN,
  [Operators.ASSIGN_MULTIPLY]: Precedence.ASSIGN,
  [Operators.ASSIGN_REMAINDER]: Precedence.ASSIGN,
  [Operators.ASSIGN_SHIFT_LEFT]: Precedence.ASSIGN,
  [Operators.ASSIGN_SHIFT_RIGHT]: Precedence.ASSIGN,
  [Operators.ASSIGN_SUBTRACT]: Precedence.ASSIGN,
  [Operators.QUESTION]: Precedence.TERNARY,
}

// TODO: this is GLSL-only, separate language constants
const TYPE_REGEX = /^(void|bool|float|u?int|[uib]?vec\d|mat\d(x\d)?)$/
const QUALIFIER_REGEX = /^(const|uniform|in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp)$/
const VARIABLE_REGEX = new RegExp(`${TYPE_REGEX.source}|${QUALIFIER_REGEX.source}|layout`)

const isDeclaration = RegExp.prototype.test.bind(VARIABLE_REGEX)

function getScopeDelta(token: Token): number {
  if (
    token.value === Operators.LEFT_PARENTHESIS ||
    token.value === Operators.LEFT_BRACKET ||
    token.value === Operators.LEFT_BRACE
  )
    return 1

  if (
    token.value === Operators.RIGHT_PARENTHESIS ||
    token.value === Operators.RIGHT_BRACKET ||
    token.value === Operators.RIGHT_BRACE
  )
    return -1

  return 0
}

function consume(tokens: Token[], expected?: string): Token {
  const token = tokens.shift()

  if (token === undefined && expected !== undefined) {
    throw new SyntaxError(`Expected "${expected}"`)
  } else if (token === undefined) {
    throw new SyntaxError('Unexpected end of input')
  } else if (expected !== undefined && token.value !== expected) {
    throw new SyntaxError(`Expected "${expected}" got "${token.value}"`)
  }

  return token
}

function parseExpression(tokens: Token[], minBindingPower: number = 0): Expression {
  let token = consume(tokens)

  let lhs: Expression
  if (token.type === 'identifier' || token.type === 'keyword') {
    lhs = new Identifier(token.value)
  } else if (token.type === 'bool' || token.type === 'float' || token.type === 'int') {
    lhs = new Literal(token.value)
  } else if (token.type === 'symbol' && token.value === Operators.LEFT_PARENTHESIS) {
    lhs = parseExpression(tokens, 0)
    consume(tokens, ')')
  } else if (token.type === 'symbol' && token.value in PREFIX_OPERATOR_PRECEDENCE) {
    const rightBindingPower = PREFIX_OPERATOR_PRECEDENCE[token.value]
    const rhs = parseExpression(tokens, rightBindingPower)
    lhs = new UnaryExpression(token.value, null, rhs)
  } else {
    throw new SyntaxError(`Unexpected token: "${token.value}"`)
  }

  while (tokens.length) {
    token = tokens[0]

    if (token.value in POSTFIX_OPERATOR_PRECEDENCE) {
      const leftBindingPower = POSTFIX_OPERATOR_PRECEDENCE[token.value]
      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === Operators.LEFT_PARENTHESIS) {
        const args: AST[] = []

        while (tokens[0]?.value !== Operators.RIGHT_PARENTHESIS) {
          args.push(parseExpression(tokens, 0))
          if (tokens[0]?.value !== Operators.RIGHT_PARENTHESIS) consume(tokens, Operators.COMMA)
        }
        consume(tokens, Operators.RIGHT_PARENTHESIS)

        if (lhs instanceof MemberExpression) {
          const type = new Type((lhs.object as Identifier).value, [lhs.property as Literal])
          lhs = new ArrayExpression(type, args)
        } else {
          lhs = new CallExpression(lhs, args)
        }
      } else if (token.value === Operators.LEFT_BRACKET) {
        const rhs = parseExpression(tokens, 0)
        consume(tokens, Operators.RIGHT_BRACKET)
        lhs = new MemberExpression(lhs, rhs)
      } else if (token.value === Operators.DOT) {
        const rhs = parseExpression(tokens, 0)
        lhs = new MemberExpression(lhs, rhs)
      } else {
        lhs = new UnaryExpression(token.value, lhs, null)
      }
    } else if (token.value in INFIX_OPERATOR_PRECEDENCE_LEFT || token.value in INFIX_OPERATOR_PRECEDENCE_RIGHT) {
      let leftBindingPower: number
      let rightBindingPower: number

      if (token.value in INFIX_OPERATOR_PRECEDENCE_LEFT) {
        const precedence = INFIX_OPERATOR_PRECEDENCE_LEFT[token.value]
        leftBindingPower = precedence - 1
        rightBindingPower = precedence
      } else {
        const precedence = INFIX_OPERATOR_PRECEDENCE_RIGHT[token.value]
        leftBindingPower = precedence
        rightBindingPower = precedence - 1
      }

      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === Operators.QUESTION) {
        const mhs = parseExpression(tokens, 0)
        consume(tokens, Operators.COLON)
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = new TernaryExpression(lhs, mhs, rhs)
      } else {
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = new BinaryExpression(token.value, lhs, rhs)
      }
    } else {
      break
    }
  }

  return lhs
}

function parseVariableDeclarator(tokens: Token[], type: Type): VariableDeclarator {
  const name = consume(tokens).value

  let value: AST | null = null

  if (tokens[0]?.value === Operators.LEFT_BRACKET) {
    consume(tokens, Operators.LEFT_BRACKET)
    value = new ArrayExpression(new Type(type.name, [parseExpression(tokens) as Literal | Identifier]), [])
    consume(tokens, Operators.RIGHT_BRACKET)
  }

  if (tokens[0]?.value === Operators.ASSIGN) {
    consume(tokens, Operators.ASSIGN)
    value = parseExpression(tokens)
  }

  return new VariableDeclarator(name, value)
}

function parseVariable(
  tokens: Token[],
  qualifiers: string[] = [],
  layout: Record<string, string | boolean> | null = null,
): VariableDeclaration {
  const kind = null // TODO: WGSL
  const type = new Type(consume(tokens).value, null)

  const declarations: VariableDeclarator[] = []

  while (tokens.length) {
    declarations.push(parseVariableDeclarator(tokens, type))

    if (tokens[0]?.value === Operators.COMMA) {
      consume(tokens, Operators.COMMA)
    } else {
      break
    }
  }

  consume(tokens, Operators.SEMICOLON)

  return new VariableDeclaration(layout, qualifiers, kind, type, declarations)
}

function parseFunction(tokens: Token[], qualifiers: string[]): FunctionDeclaration {
  const type = new Type(consume(tokens).value, null)
  const name = consume(tokens).value

  consume(tokens, Operators.LEFT_PARENTHESIS)

  const args: VariableDeclaration[] = []
  while (tokens[0] && tokens[0].value !== Operators.RIGHT_PARENTHESIS) {
    const qualifiers: string[] = []
    while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
      qualifiers.push(consume(tokens).value)
    }
    const kind = null // TODO: WGSL
    const type = new Type(consume(tokens).value, null)

    const declarations: VariableDeclarator[] = [parseVariableDeclarator(tokens, type)]

    args.push(new VariableDeclaration(null, qualifiers, kind, type, declarations))

    if (tokens[0]?.value === Operators.COMMA) consume(tokens, Operators.COMMA)
  }

  consume(tokens, Operators.RIGHT_PARENTHESIS)

  let body = null
  if (tokens[0].value === Operators.SEMICOLON) consume(tokens, Operators.SEMICOLON)
  else body = parseBlock(tokens)

  return new FunctionDeclaration(name, type, qualifiers, args, body)
}

function parseIndeterminate(tokens: Token[]): VariableDeclaration | FunctionDeclaration {
  let layout: Record<string, string | boolean> | null = null
  if (tokens[0].value === 'layout') {
    consume(tokens, 'layout')
    consume(tokens, Operators.LEFT_PARENTHESIS)

    layout = {}

    while (tokens[0] && (tokens[0] as Token).value !== Operators.RIGHT_PARENTHESIS) {
      const expression = parseExpression(tokens)

      if (
        expression instanceof BinaryExpression &&
        expression.left instanceof Identifier &&
        expression.right instanceof Literal
      ) {
        layout[expression.left.value] = expression.right.value
      } else if (expression instanceof Identifier) {
        layout[expression.value] = true
      } else {
        throw new TypeError('Unexpected expression')
      }

      if (tokens[0] && (tokens[0] as Token).value !== Operators.RIGHT_PARENTHESIS) consume(tokens, Operators.COMMA)
    }

    consume(tokens, Operators.RIGHT_PARENTHESIS)
  }

  const qualifiers: string[] = []
  while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
    qualifiers.push(consume(tokens).value)
  }

  return tokens[2]?.value === Operators.LEFT_PARENTHESIS
    ? parseFunction(tokens, qualifiers)
    : parseVariable(tokens, qualifiers, layout)
}

function parseStruct(tokens: Token[]): StructDeclaration {
  consume(tokens, 'struct')
  const name = consume(tokens).value
  consume(tokens, Operators.LEFT_BRACE)
  const members: VariableDeclaration[] = []
  while (tokens[0] && tokens[0].value !== Operators.RIGHT_BRACE) {
    members.push(parseIndeterminate(tokens) as VariableDeclaration)
  }
  consume(tokens, Operators.RIGHT_BRACE)
  consume(tokens, Operators.SEMICOLON)

  return new StructDeclaration(name, members)
}

function parseContinue(tokens: Token[]): ContinueStatement {
  consume(tokens, 'continue')
  const statement = new ContinueStatement()
  consume(tokens, Operators.SEMICOLON)

  return statement
}

function parseBreak(tokens: Token[]): BreakStatement {
  consume(tokens, 'break')
  const statement = new BreakStatement()
  consume(tokens, Operators.SEMICOLON)

  return statement
}

function parseDiscard(tokens: Token[]): DiscardStatement {
  consume(tokens, 'discard')
  const statement = new DiscardStatement()
  consume(tokens, Operators.SEMICOLON)

  return statement
}

function parseReturn(tokens: Token[]): ReturnStatement {
  consume(tokens, 'return')

  let argument: Expression | null = null
  if (tokens[0]?.value !== Operators.SEMICOLON) argument = parseExpression(tokens)
  consume(tokens, Operators.SEMICOLON)

  return new ReturnStatement(argument)
}

function parseIf(tokens: Token[]): IfStatement {
  consume(tokens, 'if')
  consume(tokens, Operators.LEFT_PARENTHESIS)
  const test = parseExpression(tokens)
  consume(tokens, Operators.RIGHT_PARENTHESIS)

  const consequent = parseBlock(tokens)

  let alternate = null
  if (tokens[0] && tokens[0].value === 'else') {
    consume(tokens, 'else')

    if (tokens[0] && (tokens[0] as Token).value === 'if') {
      alternate = parseIf(tokens)
    } else {
      alternate = parseBlock(tokens)
    }
  }

  return new IfStatement(test, consequent, alternate)
}

function parseWhile(tokens: Token[]): WhileStatement {
  consume(tokens, 'while')
  consume(tokens, Operators.LEFT_PARENTHESIS)
  const test = parseExpression(tokens)
  consume(tokens, Operators.RIGHT_PARENTHESIS)
  const body = parseBlock(tokens)

  return new WhileStatement(test, body)
}

function parseFor(tokens: Token[]): ForStatement {
  consume(tokens, 'for')
  consume(tokens, Operators.LEFT_PARENTHESIS)
  const init = parseVariable(tokens)
  // consume(tokens, Operators.SEMICOLON)
  const test = parseExpression(tokens)
  consume(tokens, Operators.SEMICOLON)
  const update = parseExpression(tokens)
  consume(tokens, Operators.RIGHT_PARENTHESIS)
  const body = parseBlock(tokens)

  return new ForStatement(init, test, update, body)
}

function parseDoWhile(tokens: Token[]): DoWhileStatement {
  consume(tokens, 'do')
  const body = parseBlock(tokens)
  consume(tokens, 'while')
  consume(tokens, Operators.LEFT_PARENTHESIS)
  const test = parseExpression(tokens)
  consume(tokens, Operators.RIGHT_PARENTHESIS)
  consume(tokens, Operators.SEMICOLON)

  return new DoWhileStatement(test, body)
}

function parseSwitch(tokens: Token[]): SwitchStatement {
  consume(tokens, 'switch')
  const discriminant = parseExpression(tokens)

  const cases: SwitchCase[] = []
  while (tokens.length) {
    const token = consume(tokens)
    if (token.value === Operators.RIGHT_BRACE) break

    if (token.value === 'case') {
      const test = parseExpression(tokens)
      consume(tokens, Operators.COLON)
      const consequent = parseStatements(tokens)
      cases.push(new SwitchCase(test, consequent))
    } else if (token.value === 'default') {
      consume(tokens, Operators.COLON)
      const consequent = parseStatements(tokens)
      cases.push(new SwitchCase(null, consequent))
    }
  }

  return new SwitchStatement(discriminant, cases)
}

function parsePrecision(tokens: Token[]): PrecisionStatement {
  consume(tokens, 'precision')
  const precision = consume(tokens).value
  const type = new Type(consume(tokens).value, null)
  consume(tokens, Operators.SEMICOLON)
  return new PrecisionStatement(precision as any, type)
}

function parsePreprocessor(tokens: Token[]): PreprocessorStatement {
  consume(tokens, Operators.PREPROCESSOR)
  const name = consume(tokens).value

  let value: AST[] | null = null
  if (name === 'define') {
    const left = parseExpression(tokens)
    const right = parseExpression(tokens)
    value = [left, right]
  } else if (name === 'extension') {
    const left = parseExpression(tokens)
    consume(tokens, Operators.COLON)
    const right = parseExpression(tokens)
    value = [left, right]
  } else if (name === 'include') {
    consume(tokens, Operators.LESS_THAN)
    value = [new Identifier(consume(tokens).value)]
    consume(tokens, Operators.GREATER_THAN)
  } else if (name !== 'else' && name !== 'endif') {
    value = [parseExpression(tokens)]
  }
  consume(tokens, Operators.NEWLINE)

  return new PreprocessorStatement(name, value)
}

function parseStatements(tokens: Token[]): AST[] {
  const body: AST[] = []
  let scopeIndex = 0

  while (tokens.length) {
    const token = tokens[0]

    scopeIndex += getScopeDelta(token)
    if (scopeIndex < 0) break

    let statement: AST | null = null

    if (token.value === 'case' || token.value === 'default') break
    else if (token.value === Operators.PREPROCESSOR) statement = parsePreprocessor(tokens)
    else if (token.value === 'struct') statement = parseStruct(tokens)
    else if (token.value === 'continue') statement = parseContinue(tokens)
    else if (token.value === 'break') statement = parseBreak(tokens)
    else if (token.value === 'discard') statement = parseDiscard(tokens)
    else if (token.value === 'return') statement = parseReturn(tokens)
    else if (token.value === 'if') statement = parseIf(tokens)
    else if (token.value === 'while') statement = parseWhile(tokens)
    else if (token.value === 'for') statement = parseFor(tokens)
    else if (token.value === 'do') statement = parseDoWhile(tokens)
    else if (token.value === 'switch') statement = parseSwitch(tokens)
    else if (token.value === 'precision') statement = parsePrecision(tokens)
    else if (isDeclaration(token.value) && tokens[1].value !== '[') statement = parseIndeterminate(tokens)
    else {
      statement = parseExpression(tokens)
      consume(tokens, Operators.SEMICOLON)
    }

    body.push(statement)
  }

  return body
}

function parseBlock(tokens: Token[]): BlockStatement {
  consume(tokens, Operators.LEFT_BRACE)
  const body = parseStatements(tokens)
  consume(tokens, Operators.RIGHT_BRACE)
  return new BlockStatement(body)
}

const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

/**
 * Parses a string of GLSL (WGSL WIP) code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): AST[] {
  // Remove (implicit) version header
  code = code.replace('#version 300 es', '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  // TODO: preserve
  const tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  return parseStatements(tokens)
}
