export interface Node {}

export interface Literal extends Node {
  value: string | number | boolean
}

export interface Identifier extends Node {
  value: string
}

export interface VariableDeclaration extends Node {
  name: string
  type: Node
  value: Node | null
  qualifiers: Node[]
}

export interface BlockStatement extends Node {
  body: Node[]
}

export interface FunctionDeclaration extends Node {
  name: string
  type: Node | null
  args: VariableDeclaration[]
  body: BlockStatement
}

export interface CallExpression extends Node {
  callee: Node
  args: Node[]
}

export interface MemberExpression extends Node {
  object: Node
  property: Node
}

export interface ArrayExpression extends Node {
  members: Node[]
}

export interface IfStatement extends Node {
  test: Node
  consequent: Node
  alternate: Node | null
}

export interface WhileStatement extends Node {
  test: Node
  body: Node
}

export interface ForStatement extends Node {
  init: Node | null
  test: Node | null
  update: Node | null
  body: Node
}

export interface DoWhileStatement extends Node {
  test: Node
  body: Node
}

export interface SwitchCase extends Node {
  test: Node | null
  consequent: Node[]
}

export interface SwitchStatement extends Node {
  discriminant: Node
  cases: SwitchCase[]
}

export interface StructDeclaration extends Node {
  name: string
  members: VariableDeclaration[]
}

export interface ReturnStatement extends Node {
  argument: Node | null
}

export interface UnaryExpression extends Node {
  operator: string
  argument: Node
}

export interface BinaryExpression extends Node {
  operator: string
  left: Node
  right: Node
}

export interface TernaryExpression extends Node {
  test: Node
  consequent: Node
  alternate: Node
}

export interface ContinueStatement extends Node {}

export interface BreakStatement extends Node {}

export interface ReturnStatement extends Node {}

export interface DiscardStatement extends Node {}
