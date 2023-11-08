export interface AST {}

export interface Literal extends AST {
  __brand: 'Literal'
  value: string | number | boolean
}

export interface Identifier extends AST {
  __brand: 'Identifier'
  value: string
}

export interface VariableDeclaration extends AST {
  __brand: 'VariableDeclaration'
  name: string
  type: AST
  value: AST | null
  qualifiers: AST[]
}

export interface BlockStatement extends AST {
  __brand: 'BlockStatement'
  body: AST[]
}

export interface FunctionDeclaration extends AST {
  __brand: 'FunctionDeclaration'
  name: string
  type: AST | null
  args: VariableDeclaration[]
  body: BlockStatement
}

export interface CallExpression extends AST {
  __brand: 'CallExpression'
  callee: AST
  args: AST[]
}

export interface MemberExpression extends AST {
  __brand: 'MemberExpression'
  object: AST
  property: AST
}

export interface ArrayExpression extends AST {
  __brand: 'ArrayExpression'
  members: AST[]
}

export interface IfStatement extends AST {
  __brand: 'IfStatement'
  test: AST
  consequent: AST
  alternate: AST | null
}

export interface WhileStatement extends AST {
  __brand: 'WhileStatement'
  test: AST
  body: AST
}

export interface ForStatement extends AST {
  __brand: 'ForStatement'
  init: AST | null
  test: AST | null
  update: AST | null
  body: AST
}

export interface DoWhileStatement extends AST {
  __brand: 'DoWhileStatement'
  test: AST
  body: AST
}

export interface SwitchCase extends AST {
  __brand: 'SwitchCase'
  test: AST | null
  consequent: AST[]
}

export interface SwitchStatement extends AST {
  __brand: 'SwitchStatement'
  discriminant: AST
  cases: SwitchCase[]
}

export interface StructDeclaration extends AST {
  __brand: 'StructDeclaration'
  name: string
  members: VariableDeclaration[]
}

export interface UnaryExpression extends AST {
  __brand: 'UnaryExpression'
  operator: string
  argument: AST
}

export interface BinaryExpression extends AST {
  __brand: 'BinaryExpression'
  operator: string
  left: AST
  right: AST
}

export interface TernaryExpression extends AST {
  __brand: 'TernaryExpression'
  test: AST
  consequent: AST
  alternate: AST
}

export interface ReturnStatement extends AST {
  __brand: 'ReturnStatement'
  argument: Literal | Identifier | UnaryExpression | null
}

export interface ContinueStatement extends AST {
  __brand: 'ContinueStatement'
}

export interface BreakStatement extends AST {
  __brand: 'BreakStatement'
}

export interface DiscardStatement extends AST {
  __brand: 'DiscardStatement'
}
