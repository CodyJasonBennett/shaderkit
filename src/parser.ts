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
  ForStatement,
} from './ast'
import { type Token, tokenize } from './tokenizer'

// TODO: this is GLSL-only, separate language constants
const isType = RegExp.prototype.test.bind(/^(void|bool|float|u?int|[uib]?vec\d|mat\d(x\d)?)$/)
const isQualifier = RegExp.prototype.test.bind(/^(in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp)$/)

const isOpen = RegExp.prototype.test.bind(/^[\(\[\{]$/)
const isClose = RegExp.prototype.test.bind(/^[\)\]\}]$/)

let tokens: Token[] = []
let i = 0

function getTokensUntil(value: string): Token[] {
  const output: Token[] = []
  let scopeIndex = 0

  while (i < tokens.length) {
    const token = tokens[i++]
    output.push(token)

    if (isOpen(token.value)) scopeIndex++
    if (isClose(token.value)) scopeIndex--

    if (scopeIndex === 0 && token.value === value) break
  }

  return output
}

function parseFunction() {
  const type = tokens[i].value
  const name = tokens[i++].value
  // TODO: parse
  const args = getTokensUntil(')') as any
  const body = getTokensUntil('}') as any
  return new FunctionDeclaration(name, type, args, body)
}

function parseVariable() {
  const qualifiers: string[] = []
  while (tokens[i].type !== 'identifier') qualifiers.push(tokens[i++].value)
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

function parseReturn() {
  const body = getTokensUntil(';')
  body.pop() // skip ;

  let argument = null
  if (body.length) {
    // TODO: parse expression
  }

  return new ReturnStatement(argument)
}

function parseIf() {
  // TODO: parse expression
  const test = getTokensUntil(')')
  const consequent = getTokensUntil('}')
  const alternate = null

  return new IfStatement(test, consequent, alternate)
}

function parseFor() {
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

function parseBlock<T extends BlockStatement>(node: T): T {
  while (i < tokens.length) {
    const token = tokens[i++]

    let statement: AST | null = null

    if (token.type === 'keyword') {
      if (isQualifier(token.value) || isType(token.value) || token.value === 'const' || token.value === 'uniform') {
        if (tokens[i + 1]?.value === '(') {
          statement = parseFunction()
        } else {
          statement = parseVariable()
        }
      } else if (token.value === 'continue') {
        statement = new ContinueStatement()
      } else if (token.value === 'break') {
        statement = new BreakStatement()
      } else if (token.value === 'discard') {
        statement = new DiscardStatement()
      } else if (token.value === 'return') {
        statement = parseReturn()
      } else if (token.value === 'if') {
        statement = parseIf()
      } else if (token.value === 'for') {
        statement = parseFor()
      }
    }

    if (statement) node.body.push(statement)
  }

  return node
}

/**
 * Parses a string of GLSL or WGSL code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): AST[] {
  // TODO: preserve
  tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')
  i = 0

  const program = new BlockStatement([])
  parseBlock(program)

  return program.body
}

const glsl = /* glsl */ `
  flat in mat4 test;

  if (true) {
    discard;
  }

  for (int i = 0; i < 10; i++) {
    //
  }

  void main() {
    gl_FragColor = vec4(1, 0, 0, 1); // red
  }
`

console.log(glsl)
console.log(...parse(glsl))
