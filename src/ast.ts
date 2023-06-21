export interface Node {}

export interface Literal extends Node {
  __brand: 'Literal'
  value: string | number | boolean
}

export interface Identifier extends Node {
  __brand: 'Identifier'
  value: string
}

export interface VariableDeclaration extends Node {
  __brand: 'VariableDeclaration'
  name: string
  type: Node
  value: Node | null
  qualifiers: Node[]
}

export interface BlockStatement extends Node {
  __brand: 'BlockStatement'
  body: Node[]
}

export interface FunctionDeclaration extends Node {
  __brand: 'FunctionDeclaration'
  name: string
  type: Node | null
  args: VariableDeclaration[]
  body: BlockStatement
}

export interface CallExpression extends Node {
  __brand: 'CallExpression'
  callee: Node
  args: Node[]
}

export interface MemberExpression extends Node {
  __brand: 'MemberExpression'
  object: Node
  property: Node
}

export interface ArrayExpression extends Node {
  __brand: 'ArrayExpression'
  members: Node[]
}

export interface IfStatement extends Node {
  __brand: 'IfStatement'
  test: Node
  consequent: Node
  alternate: Node | null
}

export interface WhileStatement extends Node {
  __brand: 'WhileStatement'
  test: Node
  body: Node
}

export interface ForStatement extends Node {
  __brand: 'ForStatement'
  init: Node | null
  test: Node | null
  update: Node | null
  body: Node
}

export interface DoWhileStatement extends Node {
  __brand: 'DoWhileStatement'
  test: Node
  body: Node
}

export interface SwitchCase extends Node {
  __brand: 'SwitchCase'
  test: Node | null
  consequent: Node[]
}

export interface SwitchStatement extends Node {
  __brand: 'SwitchStatement'
  discriminant: Node
  cases: SwitchCase[]
}

export interface StructDeclaration extends Node {
  __brand: 'StructDeclaration'
  name: string
  members: VariableDeclaration[]
}

export interface UnaryExpression extends Node {
  __brand: 'UnaryExpression'
  operator: string
  argument: Node
}

export interface BinaryExpression extends Node {
  __brand: 'BinaryExpression'
  operator: string
  left: Node
  right: Node
}

export interface TernaryExpression extends Node {
  __brand: 'TernaryExpression'
  test: Node
  consequent: Node
  alternate: Node
}

export interface ReturnStatement extends Node {
  __brand: 'ReturnStatement'
  argument: Literal | Identifier | UnaryExpression | null
}

export interface ContinueStatement extends Node {
  __brand: 'ContinueStatement'
}

export interface BreakStatement extends Node {
  __brand: 'BreakStatement'
}

export interface DiscardStatement extends Node {
  __brand: 'DiscardStatement'
}
