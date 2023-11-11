import {
  type AST,
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
} from './ast'
import { type Token, tokenize } from './tokenizer'

const UNARY_OPERATORS = ['+', '-', '~', '!', '++', '--']

const BINARY_OPERATORS = [
  ',',
  '>>=',
  '<<=',
  '|=',
  '&=',
  '^=',
  '%=',
  '/=',
  '*=',
  '-=',
  '+=',
  '=',
  '?',
  '||',
  '^^',
  '&&',
  '|',
  '^',
  '&',
  '!=',
  '==',
  '>=',
  '<=',
  '>',
  '<',
  '>>',
  '<<',
  '+',
  '-',
  '%',
  '/',
  '*',
]

// TODO: this is GLSL-only, separate language constants
const TYPE_REGEX = /void|bool|float|u?int|[uib]?vec\d|mat\d(x\d)?/
const QUALIFIER_REGEX = /in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp/
const VARIABLE_REGEX = new RegExp(`${TYPE_REGEX.source}|${QUALIFIER_REGEX.source}|const|uniform`)

const isVariable = RegExp.prototype.test.bind(VARIABLE_REGEX)

const isOpen = RegExp.prototype.test.bind(/^[\(\[\{]$/)
const isClose = RegExp.prototype.test.bind(/^[\)\]\}]$/)

function getScopeDelta(token: Token): number {
  if (isOpen(token.value)) return 1
  if (isClose(token.value)) return -1
  return 0
}

let tokens: Token[] = []
let i: number = 0

function readUntil(value: string, body: Token[], offset: number = 0): Token[] {
  const output: Token[] = []
  let scopeIndex = 0

  while (offset < body.length) {
    const token = body[offset++]
    output.push(token)

    scopeIndex += getScopeDelta(token)
    if (scopeIndex === 0 && token.value === value) break
  }

  return output
}

function consumeUntil(value: string): Token[] {
  const output = readUntil(value, tokens, i)
  i += output.length
  return output
}

function parseExpression(body: Token[]): AST | null {
  if (body.length === 0) return null

  let scopeIndex = 0

  for (const operator of BINARY_OPERATORS) {
    for (let i = 1; i < body.length - 1; i++) {
      const token = body[i]
      if (token.type !== 'symbol') continue

      scopeIndex += getScopeDelta(token)

      if (scopeIndex === 0 && token.value === operator) {
        if (operator === '?') {
          const testBody = body.slice(0, i)
          const consequentBody = readUntil(':', body, i + 1).slice(0, -1)
          const alternateBody = body.slice(i + consequentBody.length + 2)

          const test = parseExpression(testBody)!
          const consequent = parseExpression(consequentBody)!
          const alternate = parseExpression(alternateBody)!

          return new TernaryExpression(test, consequent, alternate)
        } else {
          const left = parseExpression(body.slice(0, i))!
          const right = parseExpression(body.slice(i + 1, body.length))!

          return new BinaryExpression(operator, left, right)
        }
      }

      if (scopeIndex < 0) {
        return parseExpression(body.slice(0, i))
      }
    }
  }

  const first = body[0]
  const last = body[body.length - 1]
  if (UNARY_OPERATORS.includes(first.value)) {
    const right = parseExpression(body.slice(1))!
    return new UnaryExpression(first.value, right)
  } else if (UNARY_OPERATORS.includes(last.value)) {
    const argument = parseExpression(body.slice(0, body.length - 1))!
    return new UnaryExpression(last.value, argument)
  }

  if (first.value === '(') {
    const leftBody = readUntil(')', body)
    const left = parseExpression(leftBody.slice(1, leftBody.length - 1))!

    const operator = body[leftBody.length]
    if (operator) {
      const rightBody = body.slice(leftBody.length + 1)
      const right = parseExpression(rightBody)!

      return new BinaryExpression(operator.value, left, right)
    }

    return left
  }

  if (first.type === 'bool' || first.type === 'int' || first.type === 'float') {
    return new Literal(first.value)
  } else if (first.type === 'identifier' || first.type === 'keyword') {
    const second = body[1]

    if (!second) {
      return new Identifier(first.value)
    } else if (second.value === '(') {
      const args: VariableDeclaration[] = []
      let i = 1

      while (i < body.length) {
        const line = readUntil(',', body, i)
        i += line.length
        if (line.at(-1)?.value === ',') line.pop() // skip ,

        args.push(parseExpression(line) as VariableDeclaration)
      }

      return new CallExpression(first.value, args)
    } else if (second.value === '.' || second.value === '[') {
      const third = body[2]
      return new MemberExpression(first.value, third.value)
    }
  }

  return null
}

function parseVariable(): VariableDeclaration {
  i-- // TODO: remove backtrack hack
  const qualifiers: string[] = []
  while (tokens[i] && tokens[i].type !== 'identifier') {
    qualifiers.push(tokens[i++].value)
  }
  const type = qualifiers.pop()!

  const body = consumeUntil(';') // TODO: comma-separated lists
  const name = body.shift()!.value
  body.pop() // skip ;

  const value = parseExpression(body)

  return new VariableDeclaration(name, type, value, qualifiers)
}

function parseFunction(): FunctionDeclaration {
  const type = tokens[i - 1].value // TODO: remove backtrack hack
  const name = tokens[i++].value
  const args: VariableDeclaration[] = []

  const header = consumeUntil(')').slice(1, -1)
  let j = 0
  while (j < header.length) {
    const qualifiers: string[] = []
    while (header[j] && header[j].type !== 'identifier') {
      qualifiers.push(header[j++].value)
    }
    const type = qualifiers.pop()!

    const line = readUntil(',', header, j)
    j += line.length

    const name = line.shift()!.value
    if (line.at(-1)?.value === ',') line.pop() // skip ,

    const value = parseExpression(line)

    args.push(new VariableDeclaration(name, type, value, qualifiers))
  }

  let body = null
  if (tokens[i].value === ';') i++ // skip ;
  else body = parseBlock()

  return new FunctionDeclaration(name, type, args, body)
}

function parseStruct(): StructDeclaration {
  const name = tokens[i++].value
  i++ // skip {
  const members: VariableDeclaration[] = []
  while (tokens[i] && tokens[i].value !== '}') {
    i++ // TODO: remove backtrack hack
    members.push(parseVariable())
  }
  i++ // skip }
  i++ // skip ;

  return new StructDeclaration(name, members)
}

function parseReturn(): ReturnStatement {
  const body = consumeUntil(';')
  body.pop() // skip ;

  const argument = parseExpression(body)

  return new ReturnStatement(argument as any)
}

function parseIf(): IfStatement {
  const test = parseExpression(consumeUntil(')'))!
  const consequent = parseBlock()

  let alternate = null
  if (tokens[i].value === 'else') {
    i++ // TODO: remove backtrack hack

    if (tokens[i].value === 'if') {
      i++
      alternate = parseIf()
    } else {
      alternate = parseBlock()
    }
  }

  return new IfStatement(test, consequent, alternate)
}

function parseWhile(): WhileStatement {
  const test = parseExpression(consumeUntil(')'))!
  const body = parseBlock()

  return new WhileStatement(test, body)
}

function parseFor(): ForStatement {
  const tests: [init: Token[], test: Token[], update: Token[]] = [[], [], []]
  let j = 0

  const loop = consumeUntil(')').slice(1, -1)
  while (loop.length) {
    const next = loop.shift()!
    if (next.value === ';') {
      j++
    } else {
      tests[j].push(next)
    }
  }

  const init = parseExpression(tests[0])
  const test = parseExpression(tests[1])
  const update = parseExpression(tests[2])

  const body = parseBlock()

  return new ForStatement(init, test, update, body)
}

function parseDoWhile(): DoWhileStatement {
  const body = parseBlock()
  i++ // skip while
  const test = parseExpression(consumeUntil(')'))!
  i++ // skip ;

  return new DoWhileStatement(test, body)
}

function parseSwitch(): SwitchStatement {
  const discriminant = parseExpression(consumeUntil(')'))
  const body = consumeUntil('}').slice(1, -1)

  let j = -1
  const cases: SwitchCase[] = []
  while (body.length) {
    const token = body.shift()!
    if (token.value === 'case' || token.value === 'default') {
      const test = token.value === 'case' ? parseExpression([body.shift()!]) : null
      cases.push(new SwitchCase(test, []))
      j++
    } else {
      // TODO: parse scope
      cases[j].consequent.push(token)
    }
  }

  return new SwitchStatement(discriminant!, cases)
}

function parseStatements(): AST[] {
  const body: AST[] = []
  let scopeIndex = 0

  while (i < tokens.length) {
    const token = tokens[i++]

    scopeIndex += getScopeDelta(token)
    if (scopeIndex < 0) break

    let statement: AST | null = null

    if (token.type === 'keyword') {
      if (isVariable(token.value) && tokens[i + 1]?.value === '(') statement = parseFunction()
      else if (isVariable(token.value) && tokens[i]?.value !== '(') statement = parseVariable()
      else if (token.value === 'struct') statement = parseStruct()
      else if (token.value === 'continue') (statement = new ContinueStatement()), i++
      else if (token.value === 'break') (statement = new BreakStatement()), i++
      else if (token.value === 'discard') (statement = new DiscardStatement()), i++
      else if (token.value === 'return') statement = parseReturn()
      else if (token.value === 'if') statement = parseIf()
      else if (token.value === 'while') statement = parseWhile()
      else if (token.value === 'for') statement = parseFor()
      else if (token.value === 'do') statement = parseDoWhile()
      else if (token.value === 'switch') statement = parseSwitch()
    }

    if (statement) {
      body.push(statement)
    } else {
      const expression = parseExpression([token, ...consumeUntil(';').slice(0, -1)])
      if (expression) body.push(expression)
    }
  }

  return body
}

function parseBlock(): BlockStatement {
  i++ // skip {
  const body = parseStatements()
  return new BlockStatement(body)
}

/**
 * Parses a string of GLSL or WGSL code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): AST[] {
  // TODO: preserve
  tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')
  i = 0

  return parseStatements()
}

const glsl = /* glsl */ `
  flat in mat4 test;

  struct foo {
    bool isStruct;
    vec4 color;
  };

  if (true) {
    discard;
  } else if (false) {
    //
  } else {
    //
  }

  for (int i = 0; i < 10; i++) {
    //
  }

  while(true) {
    //
  }

  do {
    //
  } while (true);

  switch(true) {
    case 0:
      break;
    case 1:
      break;
    default:
      //
  }

  void method(const bool foo);

  void main() {
    gl_FragColor = vec4(1, 0, 0, 1); // red
  }

  method(true);
`

console.log(glsl)
console.log(...parse(glsl))
