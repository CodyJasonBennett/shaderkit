import {
  type AST,
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
} from './ast'
import { type Token, tokenize } from './tokenizer'

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

function getTokensUntil(value: string): Token[] {
  const output: Token[] = []
  let scopeIndex = 0

  while (i < tokens.length) {
    const token = tokens[i++]
    output.push(token)

    scopeIndex += getScopeDelta(token)
    if (scopeIndex === 0 && token.value === value) break
  }

  return output
}

function parseFunction(): FunctionDeclaration {
  const type = tokens[i].value
  const name = tokens[i++].value
  // TODO: parse
  const args = getTokensUntil(')') as any
  const body = getTokensUntil('}') as any
  return new FunctionDeclaration(name, type, args, body)
}

function parseVariable(): VariableDeclaration {
  const qualifiers: string[] = []
  while (tokens[i] && tokens[i].type !== 'identifier') {
    qualifiers.push(tokens[i++].value)
  }
  const type = qualifiers.pop()!

  const body = getTokensUntil(';')
  const name = body.shift()!.value
  body.pop() // skip ;

  let value = null
  if (body.length) {
    // TODO: parse expression
  }

  return new VariableDeclaration(name, type, value, qualifiers)
}

function parseReturn(): ReturnStatement {
  const body = getTokensUntil(';')
  body.pop() // skip ;

  let argument = null
  if (body.length) {
    // TODO: parse expression
  }

  return new ReturnStatement(argument)
}

function parseIf(): IfStatement {
  // TODO: parse expression
  const test = getTokensUntil(')')
  const consequent = getTokensUntil('}')

  let alternate = null
  if (tokens[i].value === 'else') {
    i++

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
  // TODO: parse expression
  const test = getTokensUntil(')')
  const body = getTokensUntil('}')

  return new WhileStatement(test, body)
}

function parseFor(): ForStatement {
  const tests: (AST | null)[] = [null, null, null]
  let j = 0

  const loop = getTokensUntil(')')
  loop.shift() // skip (
  loop.pop() // skip )

  let next = loop.shift()
  while (next) {
    if (next.value === ';') {
      j++
    } else {
      // TODO: parse expressions
      // @ts-ignore
      tests[j] ??= []
      // @ts-ignore
      tests[j].push(next)
    }

    next = loop.shift()
  }

  const [init, test, update] = tests
  const body = getTokensUntil('}')

  return new ForStatement(init, test, update, body)
}

function parseDoWhile(): DoWhileStatement {
  // TODO: parse expression
  const body = getTokensUntil('}')
  i++ // skip while
  const test = getTokensUntil(')')

  return new DoWhileStatement(test, body)
}

function parseSwitch(): SwitchStatement {
  const discriminant = getTokensUntil(')')
  const body = getTokensUntil('}').slice(1, -1)

  let j = -1
  const cases: SwitchCase[] = []
  while (body.length) {
    const token = body.shift()!
    if (token.value === 'case' || token.value === 'default') {
      const test = body.shift() ?? null
      if (test) body.shift() // skip :
      cases.push(new SwitchCase(test, []))
      j++
    } else {
      cases[j].consequent.push(token)
    }
  }

  return new SwitchStatement(discriminant, cases)
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
      else if (isVariable(token.value)) statement = parseVariable()
      else if (token.value === 'continue') statement = new ContinueStatement()
      else if (token.value === 'break') statement = new BreakStatement()
      else if (token.value === 'discard') statement = new DiscardStatement()
      else if (token.value === 'return') statement = parseReturn()
      else if (token.value === 'if') statement = parseIf()
      else if (token.value === 'while') statement = parseWhile()
      else if (token.value === 'for') statement = parseFor()
      else if (token.value === 'do') statement = parseDoWhile()
      else if (token.value === 'switch') statement = parseSwitch()
    }

    if (statement) body.push(statement)
  }

  return body
}

function parseBlock(): BlockStatement {
  if (tokens[i].value === '{') i++
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

  void main() {
    gl_FragColor = vec4(1, 0, 0, 1); // red
  }
`

console.log(glsl)
console.log(...parse(glsl))
