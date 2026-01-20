import {
  ArraySpecifier,
  AssignmentOperator,
  BinaryOperator,
  BlockStatement,
  BreakStatement,
  ConstantQualifier,
  ContinueStatement,
  DiscardStatement,
  DoWhileStatement,
  Expression,
  ForStatement,
  FunctionDeclaration,
  FunctionParameter,
  Identifier,
  IfStatement,
  InterpolationQualifier,
  InvariantQualifierStatement,
  LayoutQualifier,
  Literal,
  LogicalOperator,
  ParameterQualifier,
  PrecisionQualifier,
  PrecisionQualifierStatement,
  PreprocessorStatement,
  Program,
  ReturnStatement,
  Statement,
  StorageQualifier,
  StructDeclaration,
  SwitchCase,
  SwitchStatement,
  UnaryOperator,
  StructuredBufferDeclaration,
  UpdateOperator,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
  LayoutQualifierStatement,
} from './ast.js'
import { hoistPreprocessorDirectives } from './hoister.js'
import { type Token, tokenize } from './tokenizer.js'

// https://engineering.desmos.com/articles/pratt-parser
// https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html

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
  CALL,
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
  '(': Precedence.CALL,
  '[': Precedence.MEMBER,
  '.': Precedence.MEMBER,
}

const INFIX_OPERATOR_PRECEDENCE_LEFT: Record<string, Precedence> = {
  ',': Precedence.COMMA,
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

const QUALIFIER_REGEX =
  /^(const|buffer|uniform|in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp|coherent|volatile|restrict|readonly|writeonly|attribute|varying)$/

const SCOPE_DELTAS: Record<string, number> = {
  // Open
  '(': 1,
  '[': 1,
  '{': 1,
  // Close
  ')': -1,
  ']': -1,
  '}': -1,
}
function getScopeDelta(token: Token): number {
  return SCOPE_DELTAS[token.value] ?? 0
}

interface Tokens {
  list: Token[]
  /**
   * Starts at 0, points at the next token yet to be consumed.
   */
  cursor: number
  /**
   * If a macro (or preprocessor statement) was encountered
   * during parsing. Used to workaround expression-level macros
   * and transform them into statements.
   */
  encounteredMacro?: boolean | undefined
}

function hasNextToken(tokens: Tokens): boolean {
  return tokens.cursor < tokens.list.length
}

function skipIrrelevant(tokens: Tokens, ignorePreprocessor: boolean = true): void {
  let preprocessorScope = 0
  for (; hasNextToken(tokens); tokens.cursor++) {
    const token = tokens.list[tokens.cursor]

    if (ignorePreprocessor && token.value === '#') {
      tokens.encounteredMacro = true
      let name = ''
      const nameToken = tokens.list[++tokens.cursor]
      if (nameToken.value !== '\\') {
        name = nameToken.value
      }

      if (name === 'if' || name === 'ifdef' || name === 'ifndef') {
        preprocessorScope++
      } else if (name === 'endif') {
        preprocessorScope--
        tokens.cursor++
      } else {
        // Ignoring everything up until the end of the directive
        while (hasNextToken(tokens) && tokens.list[tokens.cursor].value !== '\\') tokens.cursor++
        tokens.cursor++
      }

      continue
    }

    if (preprocessorScope > 0) {
      continue
    }

    if (token.type === 'whitespace' || token.type === 'comment') {
      continue
    }

    // Something relevant
    return
  }
}

function peek(tokens: Tokens, offset: number = 0, ignorePreprocessor: boolean = true): Token | null {
  const prevCursor = tokens.cursor
  while (hasNextToken(tokens)) {
    skipIrrelevant(tokens, ignorePreprocessor)

    if (offset === 0) {
      const token = tokens.list[tokens.cursor]
      tokens.cursor = prevCursor
      return token
    } else {
      offset--
      tokens.cursor++
    }
  }

  tokens.cursor = prevCursor
  return null
}

function consume(tokens: Tokens, expected?: string, ignorePreprocessor: boolean = true): Token {
  // TODO: use store for sourcemaps
  skipIrrelevant(tokens, ignorePreprocessor)
  const token = tokens.list[tokens.cursor++]

  if (token === undefined && expected !== undefined) {
    throw new SyntaxError(`Expected "${expected}"`)
  } else if (token === undefined) {
    throw new SyntaxError('Unexpected end of input')
  } else if (expected !== undefined && token.value !== expected) {
    throw new SyntaxError(`Expected "${expected}" got "${token.value}"`)
  }

  return token
}

function parseExpression(tokens: Tokens, minBindingPower: number = 0): Expression {
  let token = consume(tokens)

  let lhs: Expression
  if (token.type === 'identifier' || token.type === 'keyword') {
    lhs = { type: 'Identifier', name: token.value }
  } else if (token.type === 'bool' || token.type === 'float' || token.type === 'int') {
    lhs = { type: 'Literal', value: token.value }
  } else if (token.type === 'symbol' && token.value === '(') {
    lhs = parseExpression(tokens, 0)
    consume(tokens, ')')
  } else if (token.type === 'symbol' && token.value in PREFIX_OPERATOR_PRECEDENCE) {
    const rightBindingPower = PREFIX_OPERATOR_PRECEDENCE[token.value]
    const rhs = parseExpression(tokens, rightBindingPower)
    if (token.value === '--' || token.value === '++') {
      lhs = { type: 'UpdateExpression', operator: token.value, prefix: true, argument: rhs }
    } else {
      lhs = { type: 'UnaryExpression', operator: token.value as UnaryOperator, prefix: true, argument: rhs }
    }
  } else {
    throw new SyntaxError(`Unexpected token: "${token.value}"`)
  }

  while (hasNextToken(tokens)) {
    token = peek(tokens)!

    if (token.value in POSTFIX_OPERATOR_PRECEDENCE) {
      const leftBindingPower = POSTFIX_OPERATOR_PRECEDENCE[token.value]
      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === '(') {
        const args: Expression[] = []

        while (peek(tokens)?.value !== ')') {
          args.push(parseExpression(tokens, Precedence.COMMA))
          if (peek(tokens)?.value !== ')') consume(tokens, ',')
        }
        consume(tokens, ')')

        lhs = { type: 'CallExpression', callee: lhs, arguments: args }
      } else if (token.value === '[') {
        const rhs = peek(tokens)?.value !== ']' ? parseExpression(tokens, 0) : null
        consume(tokens, ']')

        if (peek(tokens)?.value === '(') {
          consume(tokens, '(')
          const elements: Expression[] = []

          while (peek(tokens)?.value !== ')') {
            elements.push(parseExpression(tokens, Precedence.COMMA))
            if (peek(tokens)?.value !== ')') consume(tokens, ',')
          }
          consume(tokens, ')')

          const typeSpecifier: ArraySpecifier = {
            type: 'ArraySpecifier',
            typeSpecifier: lhs as Identifier,
            dimensions: [rhs as Literal | null],
          }
          lhs = { type: 'ArrayExpression', typeSpecifier, elements }
        } else {
          lhs = { type: 'MemberExpression', object: lhs, property: rhs!, computed: true }
        }
      } else if (token.value === '.') {
        const rhs = parseExpression(tokens, leftBindingPower)
        lhs = { type: 'MemberExpression', object: lhs, property: rhs, computed: false }
      } else if (token.value === '--' || token.value === '++') {
        lhs = { type: 'UpdateExpression', operator: token.value as UpdateOperator, prefix: false, argument: lhs }
      } else {
        lhs = { type: 'UnaryExpression', operator: token.value as UnaryOperator, prefix: false, argument: lhs }
      }
    } else if (token.value in INFIX_OPERATOR_PRECEDENCE_LEFT) {
      const precedence = INFIX_OPERATOR_PRECEDENCE_LEFT[token.value]
      const leftBindingPower = precedence - 1
      const rightBindingPower = precedence

      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === '||' || token.value === '&&' || token.value === '^^') {
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = { type: 'LogicalExpression', operator: token.value, left: lhs, right: rhs }
      } else {
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = { type: 'BinaryExpression', operator: token.value as BinaryOperator, left: lhs, right: rhs }
      }
    } else if (token.value in INFIX_OPERATOR_PRECEDENCE_RIGHT) {
      const precedence = INFIX_OPERATOR_PRECEDENCE_RIGHT[token.value]
      const leftBindingPower = precedence
      const rightBindingPower = precedence - 1

      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === '?') {
        const mhs = parseExpression(tokens, 0)
        consume(tokens, ':')
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = { type: 'ConditionalExpression', test: lhs, alternate: mhs, consequent: rhs }
      } else {
        const rhs = parseExpression(tokens, rightBindingPower)
        lhs = { type: 'AssignmentExpression', operator: token.value as AssignmentOperator, left: lhs, right: rhs }
      }
    } else {
      break
    }
  }

  return lhs
}

function parseTypeSpecifier(tokens: Tokens): Identifier | ArraySpecifier {
  let typeSpecifier: Identifier | ArraySpecifier = { type: 'Identifier', name: consume(tokens).value }

  if (peek(tokens)?.value === '[') {
    const dimensions: (Literal | Identifier | null)[] = []

    while (peek(tokens)?.value === '[') {
      consume(tokens, '[')

      if (peek(tokens)?.value !== ']') {
        dimensions.push(parseExpression(tokens) as Literal | Identifier)
      } else {
        dimensions.push(null)
      }

      consume(tokens, ']')
    }

    typeSpecifier = {
      type: 'ArraySpecifier',
      typeSpecifier,
      dimensions,
    }
  }

  return typeSpecifier
}

function parseVariableDeclarator(
  tokens: Tokens,
  typeSpecifier: Identifier | ArraySpecifier,
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[],
  layout: Record<string, string | boolean> | null,
): VariableDeclarator {
  const id = parseTypeSpecifier(tokens) as Identifier

  let init: Expression | null = null

  if (peek(tokens)?.value === '=') {
    consume(tokens, '=')
    init = parseExpression(tokens, Precedence.COMMA)
  }

  return { type: 'VariableDeclarator', id, qualifiers, typeSpecifier, layout, init }
}

function parseVariable(
  tokens: Tokens,
  typeSpecifier: Identifier | ArraySpecifier,
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[] = [],
  layout: Record<string, string | boolean> | null = null,
): VariableDeclaration {
  const declarations: VariableDeclarator[] = []

  if (peek(tokens)?.value !== ';') {
    while (hasNextToken(tokens)) {
      declarations.push(parseVariableDeclarator(tokens, typeSpecifier, qualifiers, layout))

      if (peek(tokens)?.value === ',') {
        consume(tokens, ',')
      } else {
        break
      }
    }
  }

  consume(tokens, ';')

  return { type: 'VariableDeclaration', declarations }
}

function parseBufferInterface(
  tokens: Tokens,
  typeSpecifier: Identifier | ArraySpecifier,
  qualifiers: LayoutQualifier[] = [],
  layout: Record<string, string | boolean> | null = null,
): StructuredBufferDeclaration {
  const members = parseBlock(tokens).body as VariableDeclaration[]

  let id: Identifier | null = null
  if (peek(tokens)?.value !== ';') id = parseExpression(tokens) as Identifier
  consume(tokens, ';')

  return { type: 'StructuredBufferDeclaration', id, qualifiers, typeSpecifier, layout, members }
}

function parseFunction(
  tokens: Tokens,
  typeSpecifier: ArraySpecifier | Identifier,
  qualifiers: PrecisionQualifier[] = [],
): FunctionDeclaration {
  const id: Identifier = { type: 'Identifier', name: consume(tokens).value }

  consume(tokens, '(')

  const params: FunctionParameter[] = []
  while (true) {
    const token = peek(tokens)
    if (!token || token.value === ')') break

    const qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[] = []
    while (peek(tokens) && QUALIFIER_REGEX.test(peek(tokens)!.value)) {
      qualifiers.push(consume(tokens).value as ConstantQualifier | ParameterQualifier | PrecisionQualifier)
    }
    const typeSpecifier = parseTypeSpecifier(tokens)

    let id: Identifier | null = null
    if (peek(tokens)?.type !== 'symbol') id = parseTypeSpecifier(tokens) as Identifier

    params.push({ type: 'FunctionParameter', id, qualifiers, typeSpecifier })

    if (peek(tokens)?.value === ',') consume(tokens, ',')
  }

  consume(tokens, ')')

  let body = null
  if (peek(tokens)?.value === ';') consume(tokens, ';')
  else body = parseBlock(tokens)

  return { type: 'FunctionDeclaration', id, qualifiers, typeSpecifier, params, body }
}

function parseLayoutQualifier(tokens: Tokens, layout: Record<string, string | boolean>): LayoutQualifierStatement {
  const qualifier = consume(tokens).value as StorageQualifier
  consume(tokens, ';')
  return { type: 'LayoutQualifierStatement', layout, qualifier }
}

function parseInvariant(tokens: Tokens): InvariantQualifierStatement {
  consume(tokens, 'invariant')
  const typeSpecifier = parseExpression(tokens) as Identifier
  consume(tokens, ';')
  return { type: 'InvariantQualifierStatement', typeSpecifier }
}

function parseIndeterminate(
  tokens: Tokens,
):
  | VariableDeclaration
  | FunctionDeclaration
  | StructuredBufferDeclaration
  | LayoutQualifierStatement
  | InvariantQualifierStatement {
  let layout: Record<string, string | boolean> | null = null
  if (peek(tokens)?.value === 'layout') {
    consume(tokens, 'layout')
    consume(tokens, '(')

    layout = {}

    while (peek(tokens) && peek(tokens)!.value !== ')') {
      const expression = parseExpression(tokens, Precedence.COMMA)

      if (
        expression.type === 'AssignmentExpression' &&
        expression.left.type === 'Identifier' &&
        expression.right.type === 'Literal'
      ) {
        layout[expression.left.name] = expression.right.value
      } else if (expression.type === 'Identifier') {
        layout[expression.name] = true
      } else {
        throw new TypeError('Unexpected expression')
      }

      if (peek(tokens) && peek(tokens)!.value !== ')') consume(tokens, ',')
    }

    consume(tokens, ')')
  }

  // Input qualifiers will suddenly terminate
  if (layout !== null && peek(tokens, 1)?.value === ';') {
    return parseLayoutQualifier(tokens, layout)
  }

  // Invariant qualifiers will terminate with an identifier
  if (
    layout === null &&
    peek(tokens)?.value === 'invariant' &&
    (peek(tokens, 1)?.type === 'identifier' || (peek(tokens, 1)?.type === 'keyword' && peek(tokens, 2)?.value === ';'))
  ) {
    return parseInvariant(tokens)
  }

  // TODO: only precision qualifier valid for function return type
  const qualifiers: string[] = []
  while (peek(tokens) && QUALIFIER_REGEX.test(peek(tokens)!.value)) {
    qualifiers.push(consume(tokens).value)
  }

  const typeSpecifier = parseTypeSpecifier(tokens)

  if (peek(tokens)?.value === '{') {
    return parseBufferInterface(tokens, typeSpecifier, qualifiers as LayoutQualifier[], layout)
  } else if (peek(tokens, 1)?.value === '(') {
    return parseFunction(tokens, typeSpecifier, qualifiers as PrecisionQualifier[])
  } else {
    return parseVariable(
      tokens,
      typeSpecifier,
      qualifiers as (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[],
      layout,
    )
  }
}

function parseStruct(tokens: Tokens): StructDeclaration {
  consume(tokens, 'struct')
  const id: Identifier = { type: 'Identifier', name: consume(tokens).value }
  consume(tokens, '{')
  const members: VariableDeclaration[] = []
  while (peek(tokens, 0, false) && peek(tokens, 0, false)!.value !== '}') {
    members.push(...(parseStatements(tokens) as unknown as VariableDeclaration[]))
  }
  consume(tokens, '}')

  // Hack to append a separate variable declaration in the next iterator
  // `struct a {} name;` is parsed as `struct a {}; a name;`
  if (peek(tokens)?.type === 'identifier') {
    const type = id.name
    const name = consume(tokens).value
    tokens.list.push(
      { type: 'identifier', value: type },
      { type: 'identifier', value: name },
      { type: 'symbol', value: ';' },
    )
  }

  consume(tokens, ';')

  return { type: 'StructDeclaration', id, members }
}

function parseContinue(tokens: Tokens): ContinueStatement {
  consume(tokens, 'continue')
  consume(tokens, ';')

  return { type: 'ContinueStatement' }
}

function parseBreak(tokens: Tokens): BreakStatement {
  consume(tokens, 'break')
  consume(tokens, ';')

  return { type: 'BreakStatement' }
}

function parseDiscard(tokens: Tokens): DiscardStatement {
  consume(tokens, 'discard')
  consume(tokens, ';')

  return { type: 'DiscardStatement' }
}

function parseReturn(tokens: Tokens): ReturnStatement {
  consume(tokens, 'return')

  let argument: Expression | null = null
  if (peek(tokens)?.value !== ';') argument = parseExpression(tokens)
  consume(tokens, ';')

  return { type: 'ReturnStatement', argument }
}

function parseIf(tokens: Tokens): IfStatement {
  consume(tokens, 'if')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')

  const consequent = parseBlockOrStatement(tokens)

  let alternate = null
  const elseToken = peek(tokens)
  if (elseToken && elseToken.value === 'else') {
    consume(tokens, 'else')

    if (peek(tokens) && peek(tokens)!.value === 'if') {
      alternate = parseIf(tokens)
    } else {
      alternate = parseBlockOrStatement(tokens)
    }
  }

  return { type: 'IfStatement', test, consequent, alternate }
}

function parseWhile(tokens: Tokens): WhileStatement {
  consume(tokens, 'while')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlockOrStatement(tokens)

  return { type: 'WhileStatement', test, body }
}

function parseFor(tokens: Tokens): ForStatement {
  consume(tokens, 'for')
  consume(tokens, '(')
  const typeSpecifier = parseExpression(tokens) as Identifier | ArraySpecifier
  const init = parseVariable(tokens, typeSpecifier)
  // consume(tokens, ';')
  const test = parseExpression(tokens)
  consume(tokens, ';')
  const update = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlockOrStatement(tokens)

  return { type: 'ForStatement', init, test, update, body }
}

function parseDoWhile(tokens: Tokens): DoWhileStatement {
  consume(tokens, 'do')
  const body = parseBlockOrStatement(tokens)
  consume(tokens, 'while')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  consume(tokens, ';')

  return { type: 'DoWhileStatement', test, body }
}

function parseSwitch(tokens: Tokens): SwitchStatement {
  consume(tokens, 'switch')
  const discriminant = parseExpression(tokens)

  const cases: SwitchCase[] = []
  while (hasNextToken(tokens)) {
    const token = consume(tokens)
    if (token.value === '}') break

    if (token.value === 'case') {
      const test = parseExpression(tokens)
      consume(tokens, ':')
      const consequent = parseStatements(tokens)
      cases.push({ type: 'SwitchCase', test, consequent })
    } else if (token.value === 'default') {
      const test = null
      consume(tokens, ':')
      const consequent = parseStatements(tokens)
      cases.push({ type: 'SwitchCase', test, consequent })
    }
  }

  return { type: 'SwitchStatement', discriminant, cases }
}

function parsePrecision(tokens: Tokens): PrecisionQualifierStatement {
  consume(tokens, 'precision')
  const precision = consume(tokens).value as PrecisionQualifier
  const typeSpecifier: Identifier = { type: 'Identifier', name: consume(tokens).value }
  consume(tokens, ';')
  return { type: 'PrecisionQualifierStatement', precision, typeSpecifier }
}

function parsePreprocessor(tokens: Tokens): PreprocessorStatement {
  consume(tokens, '#', false)

  let name = '' // name can be unset for the # directive which is ignored
  let value: Expression[] | null = null

  if (peek(tokens)?.value !== '\\') {
    name = consume(tokens).value

    if (name === 'define') {
      const lhs = consume(tokens)
      let left: Expression = { type: 'Identifier', name: lhs.value }
      const next = peek(tokens)

      // Macro definition: #define foo(a, b, c) ...
      if (next && next.value === '(') {
        consume(tokens)

        const args: Expression[] = []
        while (peek(tokens)?.value !== ')') {
          args.push(parseExpression(tokens, Precedence.COMMA))
          if (peek(tokens)?.value !== ')') consume(tokens, ',')
        }
        consume(tokens, ')')

        left = { type: 'CallExpression', callee: left, arguments: args }
      }

      if (peek(tokens)?.value === '\\') value = [left]
      else value = [left, parseExpression(tokens)]
    } else if (name === 'extension') {
      // TODO: extension directives must be before declarations
      const left = parseExpression(tokens)
      consume(tokens, ':')
      const right = parseExpression(tokens)
      value = [left, right]
    } else if (name === 'include') {
      consume(tokens, '<')
      value = [{ type: 'Identifier', name: consume(tokens).value }]
      consume(tokens, '>')
    } else if (name !== 'else' && name !== 'endif') {
      value = []
      while (peek(tokens) && peek(tokens)!.value !== '\\') {
        value.push(parseExpression(tokens))
      }
    }
  }

  consume(tokens, '\\')

  return { type: 'PreprocessorStatement', name, value }
}

function isVariable(tokens: Tokens): boolean {
  let token = peek(tokens, 0)

  // Skip first token if EOF or not type qualifier/specifier
  if (!token || (token.type !== 'identifier' && token.type !== 'keyword')) return false

  // Layout qualifiers are only valid for declarations
  if (token.value === 'layout') return true

  // Skip to end of possible expression statement (e.g. callexpr -> fndecl)
  let i = 1
  let scopeIndex = 0
  while (true) {
    token = peek(tokens, i)
    if (!token) break

    const delta = getScopeDelta(token)
    if (scopeIndex <= 0 && delta <= 0) break

    scopeIndex += delta
    i++
  }

  // A variable declaration must follow with an identifier or type
  return peek(tokens, i)?.type !== 'symbol'
}

function parseStatement(tokens: Tokens): Statement {
  const token = peek(tokens, 0, false)!
  let statement: Statement | null = null

  if (token.value === '#') statement = parsePreprocessor(tokens)
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
  else if (isVariable(tokens)) statement = parseIndeterminate(tokens)
  else if (token.value === '{') statement = parseBlock(tokens)
  else {
    const expression = parseExpression(tokens)
    if (peek(tokens)?.value === ',') consume(tokens, ';')
    else consume(tokens, ';')
    statement = { type: 'ExpressionStatement', expression }
  }

  return statement
}

function parseStatements(tokens: Tokens): Statement[] {
  const body: Statement[] = []
  let scopeIndex = 0

  while (true) {
    const token = peek(tokens, 0, false)
    if (!token) break

    scopeIndex += getScopeDelta(token)
    if (scopeIndex < 0 || token.value === '}') break

    if (token.value === 'case' || token.value === 'default') break

    tokens.encounteredMacro = false
    const start = tokens.cursor
    const statement = parseStatement(tokens)
    if (tokens.encounteredMacro) {
      const hoistedTokens = hoistPreprocessorDirectives(tokens.list.slice(start, tokens.cursor))
      body.push(...parseStatements({ list: hoistedTokens, cursor: 0 }))
    } else {
      body.push(statement)
    }
  }

  return body
}

function parseBlock(tokens: Tokens): BlockStatement {
  consume(tokens, '{')
  const body = parseStatements(tokens)
  consume(tokens, '}')
  return { type: 'BlockStatement', body }
}

// TODO: validate block versus sub-statements for GLSL/WGSL
function parseBlockOrStatement(tokens: Tokens): BlockStatement | Statement {
  if (peek(tokens)?.value === '{') {
    return parseBlock(tokens)
  } else {
    return parseStatement(tokens)
  }
}

const NEWLINE_REGEX = /\\\s+/gm
const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

/**
 * Parses a string of GLSL (WGSL WIP) code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): Program {
  // Fold newlines
  code = code.replace(NEWLINE_REGEX, '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  const tokens = {
    list: tokenize(code),
    cursor: 0,
  }

  return { type: 'Program', body: parseStatements(tokens) }
}
