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

// 5.1 Operators
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
  '~': Precedence.UNARY_PREFIX,
  '!': Precedence.UNARY_PREFIX,
  '--': Precedence.UNARY_PREFIX,
  '++': Precedence.UNARY_PREFIX,
  '-': Precedence.UNARY_PREFIX,
  '+': Precedence.UNARY_PREFIX,
}

const POSTFIX_OPERATOR_PRECEDENCE: Record<string, Precedence> = {
  '--': Precedence.UNARY_POSTFIX,
  '++': Precedence.UNARY_POSTFIX,
  '(': Precedence.LOWEST,
  '[': Precedence.MEMBER,
  '.': Precedence.MEMBER,
}

const INFIX_OPERATOR_PRECEDENCE_LEFT: Record<string, Precedence> = {
  '||': Precedence.LOGICAL_OR,
  '^^': Precedence.LOGICAL_XOR,
  '&&': Precedence.LOGICAL_AND,
  '|': Precedence.BITWISE_OR,
  '^': Precedence.BITWISE_XOR,
  '&': Precedence.BITWISE_AND,
  '==': Precedence.COMPARE,
  '>': Precedence.COMPARE,
  '>=': Precedence.COMPARE,
  '<': Precedence.COMPARE,
  '<=': Precedence.COMPARE,
  '!=': Precedence.COMPARE,
  '<<': Precedence.SHIFT,
  '>>': Precedence.SHIFT,
  '+': Precedence.ADD,
  '-': Precedence.ADD,
  '*': Precedence.MULTIPLY,
  '/': Precedence.MULTIPLY,
  '%': Precedence.MULTIPLY,
}

const INFIX_OPERATOR_PRECEDENCE_RIGHT: Record<string, Precedence> = {
  '=': Precedence.ASSIGN,
  '+=': Precedence.ASSIGN,
  '&=': Precedence.ASSIGN,
  '|=': Precedence.ASSIGN,
  '^=': Precedence.ASSIGN,
  '/=': Precedence.ASSIGN,
  '*=': Precedence.ASSIGN,
  '%=': Precedence.ASSIGN,
  '<<=': Precedence.ASSIGN,
  '>>=': Precedence.ASSIGN,
  '-=': Precedence.ASSIGN,
  '?': Precedence.TERNARY,
}

// TODO: this is GLSL-only, separate language constants
const TYPE_REGEX = /^(void|bool|float|u?int|[uib]?vec\d|mat\d(x\d)?)$/
// TODO: must be ordered: invariant interpolation storage precision storage parameter precision
// const cannot be used with storage or parameter qualifiers
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
  } else if (token.type === 'symbol' && token.value === '(') {
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

      if (token.value === '(') {
        const args: AST[] = []

        while (tokens[0]?.value !== ')') {
          args.push(parseExpression(tokens, 0))
          if (tokens[0]?.value !== ')') consume(tokens, ',')
        }
        consume(tokens, ')')

        if (lhs instanceof MemberExpression) {
          const type = new Type((lhs.object as Identifier).value, [lhs.property as Literal])
          lhs = new ArrayExpression(type, args)
        } else {
          lhs = new CallExpression(lhs, args)
        }
      } else if (token.value === '[') {
        const rhs = parseExpression(tokens, 0)
        consume(tokens, ']')
        lhs = new MemberExpression(lhs, rhs)
      } else if (token.value === '.') {
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

      if (token.value === '?') {
        const mhs = parseExpression(tokens, 0)
        consume(tokens, ':')
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

  if (tokens[0]?.value === '[') {
    consume(tokens, '[')
    value = new ArrayExpression(new Type(type.name, [parseExpression(tokens) as Literal | Identifier]), [])
    consume(tokens, ']')
  }

  if (tokens[0]?.value === '=') {
    consume(tokens, '=')
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
  // TODO: 4.1.8 Structures; handle named/inline struct as type
  // TODO: 4.8 Empty Declarations; `int;`
  const type = new Type(consume(tokens).value, null)

  const declarations: VariableDeclarator[] = []

  if (tokens[0]?.value !== ';') {
    while (tokens.length) {
      declarations.push(parseVariableDeclarator(tokens, type))

      if (tokens[0]?.value === ',') {
        consume(tokens, ',')
      } else {
        break
      }
    }
  }

  consume(tokens, ';')

  return new VariableDeclaration(layout, qualifiers, kind, type, declarations)
}

function parseFunction(tokens: Token[], qualifiers: string[]): FunctionDeclaration {
  const type = new Type(consume(tokens).value, null)
  const name = consume(tokens).value

  consume(tokens, '(')

  const args: VariableDeclaration[] = []
  while (tokens[0] && tokens[0].value !== ')') {
    // TODO: only the following qualifiers are valid (in order): const in/out/inout precision
    const qualifiers: string[] = []
    while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
      qualifiers.push(consume(tokens).value)
    }
    const kind = null // TODO: WGSL
    const type = new Type(consume(tokens).value, null)

    const declarations: VariableDeclarator[] = [parseVariableDeclarator(tokens, type)]

    args.push(new VariableDeclaration(null, qualifiers, kind, type, declarations))

    if (tokens[0]?.value === ',') consume(tokens, ',')
  }

  consume(tokens, ')')

  let body = null
  if (tokens[0].value === ';') consume(tokens, ';')
  else body = parseBlock(tokens)

  return new FunctionDeclaration(name, type, qualifiers, args, body)
}

function parseIndeterminate(tokens: Token[]): VariableDeclaration | FunctionDeclaration {
  let layout: Record<string, string | boolean> | null = null
  if (tokens[0].value === 'layout') {
    consume(tokens, 'layout')
    consume(tokens, '(')

    layout = {}

    while (tokens[0] && (tokens[0] as Token).value !== ')') {
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

      if (tokens[0] && (tokens[0] as Token).value !== ')') consume(tokens, ',')
    }

    consume(tokens, ')')
  }

  // TODO: only precision qualifier valid for function return type
  const qualifiers: string[] = []
  while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
    qualifiers.push(consume(tokens).value)
  }

  return tokens[2]?.value === '(' ? parseFunction(tokens, qualifiers) : parseVariable(tokens, qualifiers, layout)
}

function parseStruct(tokens: Token[]): StructDeclaration {
  consume(tokens, 'struct')
  const name = consume(tokens).value
  consume(tokens, '{')
  const members: VariableDeclaration[] = []
  while (tokens[0] && tokens[0].value !== '}') {
    members.push(parseIndeterminate(tokens) as VariableDeclaration)
  }
  consume(tokens, '}')
  consume(tokens, ';')

  return new StructDeclaration(name, members)
}

function parseContinue(tokens: Token[]): ContinueStatement {
  consume(tokens, 'continue')
  const statement = new ContinueStatement()
  consume(tokens, ';')

  return statement
}

function parseBreak(tokens: Token[]): BreakStatement {
  consume(tokens, 'break')
  const statement = new BreakStatement()
  consume(tokens, ';')

  return statement
}

function parseDiscard(tokens: Token[]): DiscardStatement {
  consume(tokens, 'discard')
  const statement = new DiscardStatement()
  consume(tokens, ';')

  return statement
}

function parseReturn(tokens: Token[]): ReturnStatement {
  consume(tokens, 'return')

  let argument: Expression | null = null
  if (tokens[0]?.value !== ';') argument = parseExpression(tokens)
  consume(tokens, ';')

  return new ReturnStatement(argument)
}

function parseIf(tokens: Token[]): IfStatement {
  consume(tokens, 'if')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')

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
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlock(tokens)

  return new WhileStatement(test, body)
}

function parseFor(tokens: Token[]): ForStatement {
  consume(tokens, 'for')
  consume(tokens, '(')
  const init = parseVariable(tokens)
  // consume(tokens, ';')
  const test = parseExpression(tokens)
  consume(tokens, ';')
  const update = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlock(tokens)

  return new ForStatement(init, test, update, body)
}

function parseDoWhile(tokens: Token[]): DoWhileStatement {
  consume(tokens, 'do')
  const body = parseBlock(tokens)
  consume(tokens, 'while')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  consume(tokens, ';')

  return new DoWhileStatement(test, body)
}

function parseSwitch(tokens: Token[]): SwitchStatement {
  consume(tokens, 'switch')
  const discriminant = parseExpression(tokens)

  const cases: SwitchCase[] = []
  while (tokens.length) {
    const token = consume(tokens)
    if (token.value === '}') break

    if (token.value === 'case') {
      const test = parseExpression(tokens)
      consume(tokens, ':')
      const consequent = parseStatements(tokens)
      cases.push(new SwitchCase(test, consequent))
    } else if (token.value === 'default') {
      consume(tokens, ':')
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
  consume(tokens, ';')
  return new PrecisionStatement(precision as any, type)
}

function parsePreprocessor(tokens: Token[]): PreprocessorStatement {
  consume(tokens, '#')

  let name = '' // name can be unset for the # directive which is ignored
  let value: AST[] | null = null

  if (tokens[0]?.value !== '\\') {
    name = consume(tokens).value

    if (name === 'define') {
      const left = parseExpression(tokens)
      if (tokens[0]?.value === '\\') value = [left]
      else value = [left, parseExpression(tokens)]
    } else if (name === 'extension') {
      // TODO: extension directives must be before declarations
      const left = parseExpression(tokens)
      consume(tokens, ':')
      const right = parseExpression(tokens)
      value = [left, right]
    } else if (name === 'include') {
      consume(tokens, '<')
      value = [new Identifier(consume(tokens).value)]
      consume(tokens, '>')
    } else if (name !== 'else' && name !== 'endif') {
      value = [parseExpression(tokens)]
    }
  }

  consume(tokens, '\\')

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
    else if (token.value === '#') statement = parsePreprocessor(tokens)
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
      consume(tokens, ';')
    }

    body.push(statement)
  }

  return body
}

// TODO: allow block versus sub-statements for GLSL/WGSL
function parseBlock(tokens: Token[]): BlockStatement {
  consume(tokens, '{')
  const body = parseStatements(tokens)
  consume(tokens, '}')
  return new BlockStatement(body)
}

const NEWLINE_REGEX = /\\\n/gm
const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

/**
 * Parses a string of GLSL (WGSL WIP) code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): AST[] {
  // Remove (implicit) version header
  code = code.replace('#version 300 es', '')

  // Fold newlines
  code = code.replace(NEWLINE_REGEX, '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  // TODO: preserve
  const tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  return parseStatements(tokens)
}
