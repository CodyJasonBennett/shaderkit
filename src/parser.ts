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

type Expression =
  | Literal
  | Identifier
  | UnaryExpression
  | BinaryExpression
  | TernaryExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression

// TODO: complete precedence tables

const PREFIX_BINDING_POWERS: Record<string, [left: null, right: number]> = {
  '+': [null, 9],
  '-': [null, 9],
  '~': [null, 9],
  '!': [null, 9],
}

const POSTFIX_BINDING_POWERS: Record<string, [left: number, right: null]> = {
  '[': [11, null],
  '(': [11, null],
  '.': [11, null],
  '++': [11, null],
  '--': [11, null],
}

const INFIX_BINDING_POWERS: Record<string, [left: number, right: number]> = {
  '=': [2, 1], // TODO: AssignmentExpression
  '==': [2, 1],
  '?': [4, 3],
  '+': [5, 6],
  '-': [5, 6],
  '*': [7, 8],
  '/': [7, 8],
  '<': [14, 13],
  '>': [14, 13],
}

// TODO: this is GLSL-only, separate language constants
const TYPE_REGEX = /^(void|bool|float|u?int|[uib]?vec\d|mat\d(x\d)?)$/
const QUALIFIER_REGEX = /^(const|uniform|in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp)$/
const VARIABLE_REGEX = new RegExp(`${TYPE_REGEX.source}|${QUALIFIER_REGEX.source}|layout`)

const isDeclaration = RegExp.prototype.test.bind(VARIABLE_REGEX)

const isOpen = RegExp.prototype.test.bind(/^[\(\[\{]$/)
const isClose = RegExp.prototype.test.bind(/^[\)\]\}]$/)

function getScopeDelta(token: Token): number {
  if (isOpen(token.value)) return 1
  if (isClose(token.value)) return -1
  return 0
}

let tokens: Token[] = []
let i: number = 0

function consume(expected?: string): Token {
  const token = tokens[i++]

  if (token === undefined && expected !== undefined) {
    throw new SyntaxError(`Expected "${expected}"`)
  } else if (token === undefined) {
    throw new SyntaxError('Unexpected end of input')
  } else if (expected !== undefined && token.value !== expected) {
    throw new SyntaxError(`Expected "${expected}" got "${token.value}"`)
  }

  return token
}

function parseExpression(minBindingPower: number = 0): Expression {
  let token = consume()

  let lhs: Expression
  if (token.type === 'identifier' || token.type === 'keyword') {
    lhs = new Identifier(token.value)
  } else if (token.type === 'bool' || token.type === 'float' || token.type === 'int') {
    lhs = new Literal(token.value)
  } else if (token.type === 'symbol' && token.value === '(') {
    lhs = parseExpression(0)
    consume(')')
  } else if (token.type === 'symbol' && token.value in PREFIX_BINDING_POWERS) {
    const [_, rightBindingPower] = PREFIX_BINDING_POWERS[token.value]
    const rhs = parseExpression(rightBindingPower)
    lhs = new UnaryExpression(token.value, null, rhs)
  } else {
    throw new SyntaxError(`Unexpected token: "${token.value}"`)
  }

  while (i < tokens.length) {
    token = tokens[i]

    const bindingPower = POSTFIX_BINDING_POWERS[token.value] || INFIX_BINDING_POWERS[token.value]
    if (!bindingPower) break

    const [leftBindingPower, rightBindingPower] = bindingPower
    if (leftBindingPower < minBindingPower) break

    consume()

    if (rightBindingPower === null) {
      if (token.value === '(') {
        const args: AST[] = []

        while (tokens[i]?.value !== ')') {
          args.push(parseExpression(0))
          if (tokens[i]?.value !== ')') consume(',')
        }
        consume(')')

        if (lhs instanceof MemberExpression) {
          const type = new Type((lhs.object as Identifier).value, [lhs.property as Literal])
          lhs = new ArrayExpression(type, args)
        } else {
          lhs = new CallExpression(lhs, args)
        }
      } else if (token.value === '[') {
        const rhs = parseExpression(0)
        consume(']')
        lhs = new MemberExpression(lhs, rhs)
      } else if (token.value === '.') {
        const rhs = parseExpression(0)
        lhs = new MemberExpression(lhs, rhs)
      } else {
        lhs = new UnaryExpression(token.value, lhs, null)
      }
    } else {
      if (token.value === '?') {
        const mhs = parseExpression(0)
        consume(':')
        const rhs = parseExpression(rightBindingPower)
        lhs = new TernaryExpression(lhs, mhs, rhs)
      } else {
        const rhs = parseExpression(rightBindingPower)
        lhs = new BinaryExpression(token.value, lhs, rhs)
      }
    }
  }

  return lhs
}

function parseVariableDeclarator(type: Type): VariableDeclarator {
  const name = consume().value

  let value: AST | null = null

  if (tokens[i]?.value === '[') {
    consume('[')
    value = new ArrayExpression(new Type(type.name, [parseExpression() as Literal | Identifier]), [])
    consume(']')
  }

  if (tokens[i]?.value === '=') {
    consume('=')
    value = parseExpression()
  }

  return new VariableDeclarator(name, value)
}

function parseVariable(
  qualifiers: string[] = [],
  layout: Record<string, string | boolean> | null = null,
): VariableDeclaration {
  const kind = null // TODO: WGSL
  const type = new Type(consume().value, null)

  const declarations: VariableDeclarator[] = []

  while (i < tokens.length) {
    declarations.push(parseVariableDeclarator(type))

    if (tokens[i]?.value === ',') {
      consume(',')
    } else {
      break
    }
  }

  consume(';')

  return new VariableDeclaration(layout, qualifiers, kind, type, declarations)
}

function parseFunction(qualifiers: string[]): FunctionDeclaration {
  const type = new Type(consume().value, null)
  const name = consume().value

  consume('(')

  const args: VariableDeclaration[] = []
  while (tokens[i] && tokens[i].value !== ')') {
    const qualifiers: string[] = []
    while (tokens[i] && QUALIFIER_REGEX.test(tokens[i].value)) {
      qualifiers.push(consume().value)
    }
    const kind = null // TODO: WGSL
    const type = new Type(consume().value, null)

    const declarations: VariableDeclarator[] = [parseVariableDeclarator(type)]

    args.push(new VariableDeclaration(null, qualifiers, kind, type, declarations))

    if (tokens[i]?.value === ',') consume(',')
  }

  consume(')')

  let body = null
  if (tokens[i].value === ';') consume(';')
  else body = parseBlock()

  return new FunctionDeclaration(name, type, qualifiers, args, body)
}

function parseIndeterminate(): VariableDeclaration | FunctionDeclaration {
  let layout: Record<string, string | boolean> | null = null
  if (tokens[i].value === 'layout') {
    consume('layout')
    consume('(')

    layout = {}

    while (tokens[i] && tokens[i].value !== ')') {
      const expression = parseExpression()

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

      if (tokens[i]?.value !== ')') consume(',')
    }

    consume(')')
  }

  const qualifiers: string[] = []
  while (tokens[i] && QUALIFIER_REGEX.test(tokens[i].value)) {
    qualifiers.push(consume().value)
  }

  return tokens[i + 2]?.value === '(' ? parseFunction(qualifiers) : parseVariable(qualifiers, layout)
}

function parseStruct(): StructDeclaration {
  consume('struct')
  const name = consume().value
  consume('{')
  const members: VariableDeclaration[] = []
  while (tokens[i] && tokens[i].value !== '}') {
    members.push(parseIndeterminate() as VariableDeclaration)
  }
  consume('}')
  consume(';')

  return new StructDeclaration(name, members)
}

function parseContinue(): ContinueStatement {
  consume('continue')
  const statement = new ContinueStatement()
  consume(';')

  return statement
}

function parseBreak(): BreakStatement {
  consume('break')
  const statement = new BreakStatement()
  consume(';')

  return statement
}

function parseDiscard(): DiscardStatement {
  consume('discard')
  const statement = new DiscardStatement()
  consume(';')

  return statement
}

function parseReturn(): ReturnStatement {
  consume('return')

  let argument: Expression | null = null
  if (tokens[i]?.value !== ';') argument = parseExpression()
  consume(';')

  return new ReturnStatement(argument)
}

function parseIf(): IfStatement {
  consume('if')
  consume('(')
  const test = parseExpression()
  consume(')')

  const consequent = parseBlock()

  let alternate = null
  if (tokens[i].value === 'else') {
    consume('else')

    if (tokens[i].value === 'if') {
      alternate = parseIf()
    } else {
      alternate = parseBlock()
    }
  }

  return new IfStatement(test, consequent, alternate)
}

function parseWhile(): WhileStatement {
  consume('while')
  consume('(')
  const test = parseExpression()
  consume(')')
  const body = parseBlock()

  return new WhileStatement(test, body)
}

function parseFor(): ForStatement {
  consume('for')

  consume('(')
  const init = parseVariable()
  // consume(';')
  const test = parseExpression()
  consume(';')
  const update = parseExpression()
  consume(')')

  const body = parseBlock()

  return new ForStatement(init, test, update, body)
}

function parseDoWhile(): DoWhileStatement {
  consume('do')
  const body = parseBlock()
  consume('while')
  consume('(')
  const test = parseExpression()
  consume(')')
  consume(';')

  return new DoWhileStatement(test, body)
}

function parseSwitch(): SwitchStatement {
  consume('switch')
  const discriminant = parseExpression()

  const cases: SwitchCase[] = []
  while (i < tokens.length) {
    const token = consume()
    if (token.value === '}') break

    if (token.value === 'case') {
      const test = parseExpression()
      consume(':')
      const consequent = parseStatements()
      cases.push(new SwitchCase(test, consequent))
    } else if (token.value === 'default') {
      consume(':')
      const consequent = parseStatements()
      cases.push(new SwitchCase(null, consequent))
    }
  }

  return new SwitchStatement(discriminant, cases)
}

function parsePrecision(): PrecisionStatement {
  consume('precision')
  const precision = consume().value
  const type = new Type(consume().value, null)
  consume(';')
  return new PrecisionStatement(precision as any, type)
}

function parsePreprocessor(): PreprocessorStatement {
  consume('#')
  const name = consume().value

  let value: AST[] | null = null
  if (name === 'define') {
    const left = parseExpression()
    const right = parseExpression()
    value = [left, right]
  } else if (name === 'extension') {
    const left = parseExpression()
    consume(':')
    const right = parseExpression()
    value = [left, right]
  } else if (name === 'include') {
    consume('<')
    value = [new Identifier(consume().value)]
    consume('>')
  } else if (name !== 'else' && name !== 'endif') {
    value = [parseExpression()]
  }
  consume('\\')

  return new PreprocessorStatement(name, value)
}

function parseStatements(): AST[] {
  const body: AST[] = []
  let scopeIndex = 0

  while (i < tokens.length) {
    const token = tokens[i]

    scopeIndex += getScopeDelta(token)
    if (scopeIndex < 0) break

    let statement: AST | null = null

    if (token.value === 'case' || token.value === 'default') break
    else if (token.value === '#') statement = parsePreprocessor()
    else if (token.value === 'struct') statement = parseStruct()
    else if (token.value === 'continue') statement = parseContinue()
    else if (token.value === 'break') statement = parseBreak()
    else if (token.value === 'discard') statement = parseDiscard()
    else if (token.value === 'return') statement = parseReturn()
    else if (token.value === 'if') statement = parseIf()
    else if (token.value === 'while') statement = parseWhile()
    else if (token.value === 'for') statement = parseFor()
    else if (token.value === 'do') statement = parseDoWhile()
    else if (token.value === 'switch') statement = parseSwitch()
    else if (token.value === 'precision') statement = parsePrecision()
    else if (isDeclaration(token.value) && tokens[i + 1].value !== '[') statement = parseIndeterminate()
    else {
      statement = parseExpression()
      consume(';')
    }

    body.push(statement)
  }

  return body
}

function parseBlock(): BlockStatement {
  consume('{')
  const body = parseStatements()
  consume('}')
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
  tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')
  i = 0

  return parseStatements()
}
