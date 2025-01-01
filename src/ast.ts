export interface Position {
  line: number // >= 1
  column: number // >= 0
}

export interface SourceLocation {
  source: string | null
  start: Position
  end: Position
}

export interface Node {
  type: string
  // loc: SourceLocation | null
}

export interface Program extends Node {
  type: 'Program'
  body: Statement[]
}

export interface Identifier extends Node {
  type: 'Identifier'
  name: string
}

export interface Literal extends Node {
  type: 'Literal'
  value: string /*| number | boolean*/
}

export interface ArraySpecifier extends Node {
  type: 'ArraySpecifier'
  typeSpecifier: Identifier
  dimensions: (Literal | Identifier | null)[]
}

export interface ArrayExpression extends Node {
  type: 'ArrayExpression'
  typeSpecifier: ArraySpecifier
  elements: Expression[]
}

export type UnaryOperator = '-' | '+' | '!' | '~'

export interface UnaryExpression extends Node {
  type: 'UnaryExpression'
  operator: UnaryOperator
  prefix: boolean
  argument: Expression
}

export interface UpdateExpression extends Node {
  type: 'UpdateExpression'
  operator: UpdateOperator
  argument: Expression
  prefix: boolean
}

export type UpdateOperator = '++' | '--'

export interface BinaryExpression extends Node {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: Expression
  right: Expression
}

export type BinaryOperator =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '<<'
  | '>>'
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '|'
  | '^'
  | '&'

export interface AssignmentExpression extends Node {
  type: 'AssignmentExpression'
  operator: AssignmentOperator
  left: Expression
  right: Expression
}

export type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&='

export interface LogicalExpression extends Node {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: Expression
  right: Expression
}

export type LogicalOperator = '||' | '&&' | '^^'

export interface MemberExpression extends Node {
  type: 'MemberExpression'
  object: Expression
  property: Expression
  computed: boolean
}

export interface ConditionalExpression extends Node {
  type: 'ConditionalExpression'
  test: Expression
  alternate: Expression
  consequent: Expression
}

export interface CallExpression extends Node {
  type: 'CallExpression'
  callee: Expression
  arguments: Expression[]
}

export interface ExpressionStatement extends Node {
  type: 'ExpressionStatement'
  expression: Expression
}

export interface BlockStatement extends Node {
  type: 'BlockStatement'
  body: Statement[]
}

export interface ReturnStatement extends Node {
  type: 'ReturnStatement'
  argument: Expression | null
}

export interface BreakStatement extends Node {
  type: 'BreakStatement'
}

export interface ContinueStatement extends Node {
  type: 'ContinueStatement'
}

export interface DiscardStatement extends Node {
  type: 'DiscardStatement'
}

export interface IfStatement extends Node {
  type: 'IfStatement'
  test: Expression
  consequent: Statement
  alternate: Statement | null
}

export interface SwitchStatement extends Node {
  type: 'SwitchStatement'
  discriminant: Expression
  cases: SwitchCase[]
}

export interface SwitchCase extends Node {
  type: 'SwitchCase'
  test: Expression | null
  consequent: Statement[]
}

export interface WhileStatement extends Node {
  type: 'WhileStatement'
  test: Expression
  body: Statement
}

export interface DoWhileStatement extends Node {
  type: 'DoWhileStatement'
  body: Statement
  test: Expression
}

export interface ForStatement extends Node {
  type: 'ForStatement'
  init: VariableDeclaration | Expression | null
  test: Expression | null
  update: Expression | null
  body: Statement
}

export type ConstantQualifier = 'const'
export type ParameterQualifier = 'in' | 'out' | 'inout'
export type StorageQualifier = 'uniform' | 'in' | 'out'

export type InterpolationQualifier = 'centroid' | 'smooth' | 'flat' | 'invariant'
export type LayoutQualifier = 'location' | 'std140' | 'packed' | 'shared'
export type PrecisionQualifier = 'highp' | 'mediump' | 'lowp'

export interface FunctionDeclaration extends Node {
  type: 'FunctionDeclaration'
  id: Identifier
  qualifiers: PrecisionQualifier[]
  typeSpecifier: Identifier | ArraySpecifier
  params: FunctionParameter[]
  body: BlockStatement | null
}

export interface FunctionParameter extends Node {
  type: 'FunctionParameter'
  id: Identifier
  qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
}

export interface VariableDeclaration extends Node {
  type: 'VariableDeclaration'
  declarations: VariableDeclarator[]
}

export interface VariableDeclarator extends Node {
  type: 'VariableDeclarator'
  id: Identifier
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  init: Expression | null
}

export interface UniformDeclarationBlock extends Node {
  type: 'UniformDeclarationBlock'
  id: Identifier | null
  qualifiers: LayoutQualifier[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  members: VariableDeclaration[]
}

export interface StructDeclaration extends Node {
  type: 'StructDeclaration'
  id: Identifier
  members: VariableDeclaration[]
}

export interface PreprocessorStatement extends Node {
  type: 'PreprocessorStatement'
  name: string
  value: Expression[] | null
}

export interface PrecisionStatement extends Node {
  type: 'PrecisionStatement'
  precision: PrecisionQualifier
  typeSpecifier: Identifier
}

export type Expression =
  | Literal
  | Identifier
  | ArrayExpression
  | UnaryExpression
  | UpdateExpression
  | BinaryExpression
  | AssignmentExpression
  | LogicalExpression
  | MemberExpression
  | ConditionalExpression
  | CallExpression

export type Statement =
  | ExpressionStatement
  | BlockStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | DiscardStatement
  | IfStatement
  | SwitchStatement
  | WhileStatement
  | DoWhileStatement
  | ForStatement
  | FunctionDeclaration
  | VariableDeclaration
  | UniformDeclarationBlock
  | StructDeclaration
  | PreprocessorStatement
  | PrecisionStatement

export type AST =
  | Program
  | ArraySpecifier
  | SwitchCase
  | FunctionParameter
  | VariableDeclarator
  | Expression
  | Statement
