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
  TypeSpecifier,
} from './ast.js'
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

const QUALIFIER_REGEX =
  /^(const|buffer|uniform|in|out|inout|centroid|flat|smooth|invariant|lowp|mediump|highp|coherent|volatile|restrict|readonly|writeonly)$/

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

// WGSL-only
function parseGenerics(tokens: Token[]): (Identifier | Literal)[] | null {
  let generics: (Identifier | Literal)[] | null = null

  // Check whether token stream is formatted for generics
  if (tokens[0]?.value === '<') {
    let i = 1
    while (i < tokens.length) {
      const token = tokens[i++]

      if (token.type === 'symbol') {
        if (token.value === '>') generics = []
        break
      }
    }
  }

  // Parse generic arguments if found
  if (generics) {
    consume(tokens, '<')
    while (tokens[0]?.value !== '>') {
      if (tokens[0]?.type === 'identifier') {
        generics.push({ type: 'Identifier', name: consume(tokens).value })
      } else {
        generics.push({ type: 'Literal', value: consume(tokens).value })
      }
      if (tokens[0]?.value === ',') consume(tokens, ',')
    }
    consume(tokens, '>')
  }

  return generics
}

// WGSL-only
function parseAttributes(tokens: Token[]): Record<string, string | boolean> | null {
  let attributes: Record<string, string | boolean> | null = null

  while (tokens[0]?.value === '@') {
    attributes ??= {}

    consume(tokens, '@')
    const key = consume(tokens).value

    // TODO: workgroup size (x, y, z)
    let value: string | boolean = true
    if ((tokens[0]?.value as string) === '(') {
      consume(tokens, '(')
      value = consume(tokens).value
      consume(tokens, ')')
    }

    attributes[key] = value
  }

  return attributes
}

function parseExpression(tokens: Token[], minBindingPower: number = 0): Expression {
  let token = consume(tokens)

  let lhs: Expression
  if (token.type === 'identifier' || token.type === 'keyword') {
    lhs = { type: 'Identifier', name: token.value }

    // WGSL-only
    const generics = parseGenerics(tokens)
    if (generics) {
      lhs = {
        type: 'ArraySpecifier',
        typeSpecifier: lhs,
        dimensions: generics,
      }
    }
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

  while (tokens.length) {
    token = tokens[0]

    if (token.value in POSTFIX_OPERATOR_PRECEDENCE) {
      const leftBindingPower = POSTFIX_OPERATOR_PRECEDENCE[token.value]
      if (leftBindingPower < minBindingPower) break

      consume(tokens)

      if (token.value === '(') {
        const args: Expression[] = []

        while (tokens[0]?.value !== ')') {
          args.push(parseExpression(tokens, 0))
          if (tokens[0]?.value !== ')') consume(tokens, ',')
        }
        consume(tokens, ')')

        lhs = { type: 'CallExpression', callee: lhs, arguments: args }
      } else if (token.value === '[') {
        const rhs = tokens[0]?.value !== ']' ? parseExpression(tokens, 0) : null
        consume(tokens, ']')

        if (tokens[0]?.value === '(') {
          consume(tokens, '(')
          const elements: Expression[] = []

          while ((tokens[0] as Token | undefined)?.value !== ')') {
            elements.push(parseExpression(tokens, 0))
            if ((tokens[0] as Token | undefined)?.value !== ')') consume(tokens, ',')
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
        const rhs = parseExpression(tokens, 0)
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

function parseLayout(tokens: Token[]): Record<string, string | boolean> | null {
  let layout: Record<string, string | boolean> | null = null

  if (tokens[0].value === 'layout') {
    consume(tokens, 'layout')
    consume(tokens, '(')

    layout = {}

    while (tokens[0] && (tokens[0] as Token).value !== ')') {
      const expression = parseExpression(tokens)

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

      if (tokens[0] && (tokens[0] as Token).value !== ')') consume(tokens, ',')
    }

    consume(tokens, ')')
  }

  return layout
}

function parseTypeSpecifier(tokens: Token[], layout: Record<string, string | boolean> | null): TypeSpecifier {
  let typeSpecifier: Identifier | ArraySpecifier = { type: 'Identifier', name: consume(tokens).value }

  // WGSL-only
  const generics = parseGenerics(tokens)
  if (generics) {
    typeSpecifier = {
      type: 'ArraySpecifier',
      typeSpecifier,
      dimensions: generics,
    }
  } else if (tokens[0]?.value === '[') {
    const dimensions: (Literal | Identifier | null)[] = []

    while (tokens[0]?.value === '[') {
      consume(tokens, '[')

      if ((tokens[0]?.value as string) !== ']') {
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

  return { type: 'TypeSpecifier', typeSpecifier, layout }
}

function parseVariableDeclarator(
  tokens: Token[],
  typeSpecifier: TypeSpecifier,
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[],
  layout: Record<string, string | boolean> | null,
): VariableDeclarator {
  const id = parseTypeSpecifier(tokens, layout)

  let init: Expression | null = null

  if (tokens[0]?.value === '=') {
    consume(tokens, '=')
    init = parseExpression(tokens)
  }

  return { type: 'VariableDeclarator', id, qualifiers, typeSpecifier, init }
}

function parseVariable(
  tokens: Token[],
  typeSpecifier: TypeSpecifier,
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[] = [],
  layout: Record<string, string | boolean> | null,
): VariableDeclaration {
  const declarations: VariableDeclarator[] = []

  if (tokens[0]?.value !== ';') {
    while (tokens.length) {
      declarations.push(parseVariableDeclarator(tokens, typeSpecifier, qualifiers, layout))

      if (tokens[0]?.value === ',') {
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
  tokens: Token[],
  typeSpecifier: TypeSpecifier,
  layout: Record<string, string | boolean> | null,
  qualifiers: LayoutQualifier[] = [],
): StructuredBufferDeclaration {
  typeSpecifier.layout = layout // Identifiers are optional, so store on type name

  const members = parseBlock(tokens).body as VariableDeclaration[]

  let id: Identifier | null = null
  if (tokens[0]?.value !== ';') id = parseExpression(tokens) as Identifier
  consume(tokens, ';')

  return { type: 'StructuredBufferDeclaration', id, qualifiers, typeSpecifier, members }
}

function parseFunction(
  tokens: Token[],
  typeSpecifier: TypeSpecifier,
  layout: Record<string, string | boolean> | null,
  qualifiers: PrecisionQualifier[] = [],
): FunctionDeclaration {
  const id = parseTypeSpecifier(tokens, layout)

  consume(tokens, '(')

  const params: FunctionParameter[] = []
  while (tokens[0] && tokens[0].value !== ')') {
    const qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[] = []
    while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
      qualifiers.push(consume(tokens).value as ConstantQualifier | ParameterQualifier | PrecisionQualifier)
    }
    const typeSpecifier = parseTypeSpecifier(tokens, null)

    let id: TypeSpecifier | null = null
    if (tokens[0]?.type !== 'symbol') id = parseTypeSpecifier(tokens, null)

    params.push({ type: 'FunctionParameter', id, qualifiers, typeSpecifier })

    if (tokens[0]?.value === ',') consume(tokens, ',')
  }

  consume(tokens, ')')

  let body = null
  if (tokens[0].value === ';') consume(tokens, ';')
  else body = parseBlock(tokens)

  return { type: 'FunctionDeclaration', id, qualifiers, typeSpecifier, params, body }
}

function parseLayoutQualifier(tokens: Token[], layout: Record<string, string | boolean>): LayoutQualifierStatement {
  const qualifier = consume(tokens).value as StorageQualifier
  consume(tokens, ';')
  return { type: 'LayoutQualifierStatement', layout, qualifier }
}

function parseInvariant(tokens: Token[]): InvariantQualifierStatement {
  consume(tokens, 'invariant')
  const typeSpecifier = parseExpression(tokens) as Identifier
  consume(tokens, ';')
  return { type: 'InvariantQualifierStatement', typeSpecifier }
}

function parseIndeterminate(
  tokens: Token[],
):
  | VariableDeclaration
  | FunctionDeclaration
  | StructuredBufferDeclaration
  | LayoutQualifierStatement
  | InvariantQualifierStatement {
  const layout = parseLayout(tokens)

  // Input qualifiers will suddenly terminate
  if (layout !== null && tokens[1]?.value === ';') {
    return parseLayoutQualifier(tokens, layout)
  }

  // Invariant qualifiers will terminate with an identifier
  if (layout === null && tokens[0]?.value === 'invariant' && tokens[1]?.type === 'identifier') {
    return parseInvariant(tokens)
  }

  // TODO: only precision qualifier valid for function return type
  const qualifiers: string[] = []
  while (tokens[0] && QUALIFIER_REGEX.test(tokens[0].value)) {
    qualifiers.push(consume(tokens).value)
  }

  const typeSpecifier = parseTypeSpecifier(tokens, null)

  if (tokens[0]?.value === '{') {
    return parseBufferInterface(tokens, typeSpecifier, layout, qualifiers as LayoutQualifier[])
  } else if (tokens[1]?.value === '(') {
    return parseFunction(tokens, typeSpecifier, layout, qualifiers as PrecisionQualifier[])
  } else {
    return parseVariable(
      tokens,
      typeSpecifier,
      qualifiers as (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[],
      layout,
    )
  }
}

function parseStruct(tokens: Token[]): StructDeclaration {
  consume(tokens, 'struct')
  const id: Identifier = { type: 'Identifier', name: consume(tokens).value }
  consume(tokens, '{')
  const members: VariableDeclaration[] = []
  const isWGSL = tokens[0].value === '@' || tokens[1]?.value === '<' || tokens[1]?.value === ':'
  while (tokens[0] && tokens[0].value !== '}') {
    if (isWGSL) {
      const layout = parseAttributes(tokens)
      const id = parseTypeSpecifier(tokens, layout)

      // TODO: should this be nullable even if invalid in GLSL?
      let typeSpecifier: TypeSpecifier = null!
      if ((tokens[0]?.value as string) === ':') {
        consume(tokens, ':')
        typeSpecifier = parseTypeSpecifier(tokens, null)
      }

      // TODO: infer from return type or ptr usage
      const qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[] = []

      members.push({
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id,
            qualifiers,
            typeSpecifier,
            init: null,
          },
        ],
      })

      if (tokens[0]?.value === ',') consume(tokens, ',')
    } else {
      members.push(...(parseStatements(tokens) as unknown as VariableDeclaration[]))
    }
  }
  consume(tokens, '}')

  // Hack to append a separate variable declaration in the next iterator
  // `struct a {} name;` is parsed as `struct a {}; a name;`
  if (tokens[0]?.type === 'identifier') {
    const type = id.name
    const name = tokens.shift()!.value
    tokens.push(
      { type: 'identifier', value: type },
      { type: 'identifier', value: name },
      { type: 'symbol', value: ';' },
    )
  }

  consume(tokens, ';')

  return { type: 'StructDeclaration', id, members }
}

function parseContinue(tokens: Token[]): ContinueStatement {
  consume(tokens, 'continue')
  consume(tokens, ';')

  return { type: 'ContinueStatement' }
}

function parseBreak(tokens: Token[]): BreakStatement {
  consume(tokens, 'break')
  consume(tokens, ';')

  return { type: 'BreakStatement' }
}

function parseDiscard(tokens: Token[]): DiscardStatement {
  consume(tokens, 'discard')
  consume(tokens, ';')

  return { type: 'DiscardStatement' }
}

function parseReturn(tokens: Token[]): ReturnStatement {
  consume(tokens, 'return')

  let argument: Expression | null = null
  if (tokens[0]?.value !== ';') argument = parseExpression(tokens)
  consume(tokens, ';')

  return { type: 'ReturnStatement', argument }
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

  return { type: 'IfStatement', test, consequent, alternate }
}

function parseWhile(tokens: Token[]): WhileStatement {
  consume(tokens, 'while')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlock(tokens)

  return { type: 'WhileStatement', test, body }
}

function parseFor(tokens: Token[]): ForStatement {
  consume(tokens, 'for')
  consume(tokens, '(')
  const init: VariableDeclaration = {
    type: 'VariableDeclaration',
    declarations: [parseVariableDeclarator(tokens, parseTypeSpecifier(tokens, null), [], null)],
  }
  consume(tokens, ';')
  const test = parseExpression(tokens)
  consume(tokens, ';')
  const update = parseExpression(tokens)
  consume(tokens, ')')
  const body = parseBlock(tokens)

  return { type: 'ForStatement', init, test, update, body }
}

function parseDoWhile(tokens: Token[]): DoWhileStatement {
  consume(tokens, 'do')
  const body = parseBlock(tokens)
  consume(tokens, 'while')
  consume(tokens, '(')
  const test = parseExpression(tokens)
  consume(tokens, ')')
  consume(tokens, ';')

  return { type: 'DoWhileStatement', test, body }
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

function parsePrecision(tokens: Token[]): PrecisionQualifierStatement {
  consume(tokens, 'precision')
  const precision = consume(tokens).value as PrecisionQualifier
  const typeSpecifier: Identifier = { type: 'Identifier', name: consume(tokens).value }
  consume(tokens, ';')
  return { type: 'PrecisionQualifierStatement', precision, typeSpecifier }
}

function parsePreprocessor(tokens: Token[]): PreprocessorStatement {
  consume(tokens, '#')

  let name = '' // name can be unset for the # directive which is ignored
  let value: Expression[] | null = null

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
      value = [{ type: 'Identifier', name: consume(tokens).value }]
      consume(tokens, '>')
    } else if (name !== 'else' && name !== 'endif') {
      value = []
      while (tokens.length && tokens[0].value !== '\\') {
        value.push(parseExpression(tokens))
      }
    }
  }

  consume(tokens, '\\')

  return { type: 'PreprocessorStatement', name, value }
}

function isVariable(tokens: Token[]): boolean {
  const token = tokens[0]

  // Skip first token if EOF or not type qualifier/specifier
  if (!token || (token.type !== 'identifier' && token.type !== 'keyword')) return false

  // Layout qualifiers are only valid for declarations
  if (token.value === 'layout') return true

  // Skip to end of possible expression statement (e.g. callexpr -> fndecl)
  let i = 1
  let scopeIndex = 0
  while (i < tokens.length && (scopeIndex > 0 || getScopeDelta(tokens[i]) > 0)) {
    scopeIndex += getScopeDelta(tokens[i++])
  }

  // A variable declaration must follow with an identifier or type
  return tokens[i]?.type !== 'symbol'
}

function parseWGSLIndeterminate(tokens: Token[]): FunctionDeclaration | VariableDeclaration {
  const layout = parseAttributes(tokens)

  if (tokens[0]?.value === 'fn') {
    consume(tokens, 'fn')
    const id = parseTypeSpecifier(tokens, layout)

    consume(tokens, '(')
    const params: FunctionParameter[] = []

    while (tokens.length && (tokens[0]?.value as string) !== ')') {
      const layout = parseAttributes(tokens)
      const id = parseTypeSpecifier(tokens, layout)

      consume(tokens, ':')

      // TODO: infer qualifiers from return type or ptr usage
      const qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[] = []
      const typeSpecifier = parseTypeSpecifier(tokens, null)

      params.push({ type: 'FunctionParameter', id, qualifiers, typeSpecifier })

      if ((tokens[0]?.value as string) === ',') consume(tokens, ',')
    }

    consume(tokens, ')')

    // TODO: infer precision qualifier from type
    consume(tokens, '->')
    const typeSpecifier = parseTypeSpecifier(tokens, parseLayout(tokens))
    const body = parseBlock(tokens)

    return { type: 'FunctionDeclaration', id, qualifiers: [], params, typeSpecifier, body }
  } else if (tokens[0]?.value === 'var' || tokens[0]?.value === 'const') {
    const kind = consume(tokens).value // var | const

    if (kind === 'var') parseGenerics(tokens) // TODO: store scope qualifier?

    const id = parseTypeSpecifier(tokens, layout)

    // TODO: should this be nullable even if invalid in GLSL?
    let typeSpecifier: TypeSpecifier = null!
    if ((tokens[0]?.value as string) === ':') {
      consume(tokens, ':')
      typeSpecifier = parseTypeSpecifier(tokens, null)
    }

    // TODO: infer from return type or ptr usage
    const qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[] = []

    let init: Expression | null = null
    if ((tokens[0]?.value as string) === '=' || kind === 'const') {
      consume(tokens, '=')
      init = parseExpression(tokens)
    }

    consume(tokens, ';')

    return {
      type: 'VariableDeclaration',
      declarations: [
        // TODO: are declaration lists allowed?
        {
          type: 'VariableDeclarator',
          id,
          qualifiers,
          typeSpecifier,
          init,
        },
      ],
    }
  }

  // unreachable
  return null!
}

function isWGSLVariable(tokens: Token[]) {
  const token = tokens[0]

  // Attribute; indeterminate
  if (token.value === '@') return true
  // Function declaration
  if (token.value === 'fn') return true
  // Variable declaration
  if (token.value === 'var' || token.value === 'const') return true

  return false
}

function parseStatements(tokens: Token[]): Statement[] {
  const body: Statement[] = []
  let scopeIndex = 0

  while (tokens.length) {
    const token = tokens[0]

    scopeIndex += getScopeDelta(token)
    if (scopeIndex < 0) break

    let statement: Statement | null = null

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
    else if (isWGSLVariable(tokens)) statement = parseWGSLIndeterminate(tokens)
    else if (isVariable(tokens)) statement = parseIndeterminate(tokens)
    else {
      const expression = parseExpression(tokens)
      consume(tokens, ';')
      statement = { type: 'ExpressionStatement', expression }
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
  return { type: 'BlockStatement', body }
}

const NEWLINE_REGEX = /\\\s+/gm
const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

/**
 * Parses a string of GLSL or WGSL code into an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function parse(code: string): Program {
  // Fold newlines
  code = code.replace(NEWLINE_REGEX, '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  // TODO: preserve
  const tokens = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  return { type: 'Program', body: parseStatements(tokens) }
}
