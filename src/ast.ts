/**
 * A position in the source code.
 */
// export interface Position {
//   line: number // >= 1
//   column: number // >= 0
// }

/**
 * Represents the source location of a node.
 */
// export interface SourceLocation {
//   source: string | null
//   start: Position
//   end: Position
// }

/**
 * Base interface for all AST nodes.
 */
export interface Node {
  type: string
  // loc: SourceLocation | null
}

/**
 * Represents the root of an AST.
 */
export interface Program extends Node {
  type: 'Program'
  body: Statement[]
}

/**
 * A variable identifier.
 */
export interface Identifier extends Node {
  type: 'Identifier'
  name: string
}

/**
 * A shader literal representing a `bool`, `float`, `int`, or `uint` type.
 */
export interface Literal extends Node {
  type: 'Literal'
  value: string /*| number | boolean*/
}

/**
 * An array and its dimensions.
 */
export interface ArraySpecifier extends Node {
  type: 'ArraySpecifier'
  typeSpecifier: Identifier
  dimensions: (Literal | Identifier | null)[]
}

/**
 * An array initialization expression.
 */
export interface ArrayExpression extends Node {
  type: 'ArrayExpression'
  typeSpecifier: ArraySpecifier
  elements: Expression[]
}

export type UnaryOperator = '-' | '+' | '!' | '~'

/**
 * A unary expression with a left or right handed operator.
 */
export interface UnaryExpression extends Node {
  type: 'UnaryExpression'
  operator: UnaryOperator
  prefix: boolean
  argument: Expression
}

/**
 * An update expression with an optionally prefixed operator.
 */
export interface UpdateExpression extends Node {
  type: 'UpdateExpression'
  operator: UpdateOperator
  argument: Expression
  prefix: boolean
}

export type UpdateOperator = '++' | '--'

/**
 * A binary expression with a left and right operand.
 */
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

/**
 * An assignment expression.
 */
export interface AssignmentExpression extends Node {
  type: 'AssignmentExpression'
  operator: AssignmentOperator
  left: Expression
  right: Expression
}

export type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&='

/**
 * A logical operation between two expressions.
 */
export interface LogicalExpression extends Node {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: Expression
  right: Expression
}

export type LogicalOperator = '||' | '&&' | '^^'

/**
 * A member expression.
 */
export interface MemberExpression extends Node {
  type: 'MemberExpression'
  object: Expression
  property: Expression
  computed: boolean
}

/**
 * A conditional expression or ternary.
 */
export interface ConditionalExpression extends Node {
  type: 'ConditionalExpression'
  test: Expression
  alternate: Expression
  consequent: Expression
}

/**
 * A function call expression or struct initialization.
 */
export interface CallExpression extends Node {
  type: 'CallExpression'
  callee: Expression
  arguments: Expression[]
}

/**
 * An expression as a standalone statement.
 */
export interface ExpressionStatement extends Node {
  type: 'ExpressionStatement'
  expression: Expression
}

/**
 * A block statement.
 */
export interface BlockStatement extends Node {
  type: 'BlockStatement'
  body: Statement[]
}

/**
 * A return statement with an optional argument.
 */
export interface ReturnStatement extends Node {
  type: 'ReturnStatement'
  argument: Expression | null
}

/**
 * A break statement.
 */
export interface BreakStatement extends Node {
  type: 'BreakStatement'
}

/**
 * A continue statement.
 */
export interface ContinueStatement extends Node {
  type: 'ContinueStatement'
}

/**
 * A discard statement in fragment shaders.
 */
export interface DiscardStatement extends Node {
  type: 'DiscardStatement'
}

/**
 * An if-else statement.
 */
export interface IfStatement extends Node {
  type: 'IfStatement'
  test: Expression
  consequent: Statement
  alternate: Statement | null
}

/**
 * A switch statement.
 */
export interface SwitchStatement extends Node {
  type: 'SwitchStatement'
  discriminant: Expression
  cases: SwitchCase[]
}

/**
 * A switch-case statement. `test` is null for a `default` case.
 */
export interface SwitchCase extends Node {
  type: 'SwitchCase'
  test: Expression | null
  consequent: Statement[]
}

/**
 * A while statement.
 */
export interface WhileStatement extends Node {
  type: 'WhileStatement'
  test: Expression
  body: Statement
}

/**
 * A do-while statement.
 */
export interface DoWhileStatement extends Node {
  type: 'DoWhileStatement'
  body: Statement
  test: Expression
}

/**
 * A for statement.
 */
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
export type InterfaceStorageQualifier = 'uniform' | 'buffer'
export type MemoryQualifier = 'coherent' | 'volatile' | 'restrict' | 'readonly' | 'writeonly'

export type InterpolationQualifier = 'centroid' | 'smooth' | 'flat' | 'invariant'
export type LayoutQualifier = 'location' | 'std140' | 'packed' | 'shared'
export type PrecisionQualifier = 'highp' | 'mediump' | 'lowp'

/**
 * A function declaration. `body` is null for overloads.
 */
export interface FunctionDeclaration extends Node {
  type: 'FunctionDeclaration'
  id: Identifier
  qualifiers: PrecisionQualifier[]
  typeSpecifier: Identifier | ArraySpecifier
  params: FunctionParameter[]
  body: BlockStatement | null
}

/**
 * A function parameter within a function declaration.
 */
export interface FunctionParameter extends Node {
  type: 'FunctionParameter'
  id: Identifier | null
  qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
}

/**
 * A variable declaration.
 */
export interface VariableDeclaration extends Node {
  type: 'VariableDeclaration'
  declarations: VariableDeclarator[]
}

/**
 * A variable declarator within a variable declaration.
 */
export interface VariableDeclarator extends Node {
  type: 'VariableDeclarator'
  id: Identifier
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  init: Expression | null
}

/**
 * A uniform declaration block with optional layout and qualifiers.
 */
export interface StructuredBufferDeclaration extends Node {
  type: 'StructuredBufferDeclaration'
  id: Identifier | null
  qualifiers: (InterfaceStorageQualifier | MemoryQualifier | LayoutQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  members: VariableDeclaration[]
}

/**
 * A struct declaration. Can be used as a type or constructor.
 */
export interface StructDeclaration extends Node {
  type: 'StructDeclaration'
  id: Identifier
  members: VariableDeclaration[]
}

/**
 * A GLSL preprocessor statement with an optional value.
 */
export interface PreprocessorStatement extends Node {
  type: 'PreprocessorStatement'
  name: string
  value: Expression[] | null
}

/**
 * A GLSL precision qualifier statement.
 */
export interface PrecisionQualifierStatement extends Node {
  type: 'PrecisionQualifierStatement'
  precision: PrecisionQualifier
  typeSpecifier: Identifier
}

/**
 * A GLSL invariant qualifier statement.
 */
export interface InvariantQualifierStatement extends Node {
  type: 'InvariantQualifierStatement'
  typeSpecifier: Identifier
}

/**
 * A layout qualifier statement.
 */
export interface LayoutQualifierStatement extends Node {
  type: 'LayoutQualifierStatement'
  layout: Record<string, string | boolean>
  qualifier: StorageQualifier
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
  | StructuredBufferDeclaration
  | StructDeclaration
  | PreprocessorStatement
  | PrecisionQualifierStatement
  | InvariantQualifierStatement
  | LayoutQualifierStatement

export type AST =
  | Program
  | ArraySpecifier
  | SwitchCase
  | FunctionParameter
  | VariableDeclarator
  | Expression
  | Statement
