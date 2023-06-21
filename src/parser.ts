import {
  type Node,
  type Literal,
  type Identifier,
  type VariableDeclaration,
  type BlockStatement,
  type FunctionDeclaration,
  type CallExpression,
  type MemberExpression,
  type ArrayExpression,
  type IfStatement,
  type WhileStatement,
  type ForStatement,
  type DoWhileStatement,
  type SwitchCase,
  type SwitchStatement,
  type StructDeclaration,
  type UnaryExpression,
  type BinaryExpression,
  type TernaryExpression,
  type ReturnStatement,
  type ContinueStatement,
  type BreakStatement,
  type DiscardStatement,
} from './ast'

const isLiteral = (node: Node): node is Literal => (node as any).__brand === 'Literal'
const isIdentifier = (node: Node): node is Identifier => (node as any).__brand === 'Identifier'
const isVariableDeclaration = (node: Node): node is VariableDeclaration =>
  (node as any).__brand === 'VariableDeclaration'
const isBlockStatement = (node: Node): node is BlockStatement => (node as any).__brand === 'BlockStatement'
const isFunctionDeclaration = (node: Node): node is FunctionDeclaration =>
  (node as any).__brand === 'FunctionDeclaration'
const isCallExpression = (node: Node): node is CallExpression => (node as any).__brand === 'CallExpression'
const isMemberExpression = (node: Node): node is MemberExpression => (node as any).__brand === 'MemberExpression'
const isArrayExpression = (node: Node): node is ArrayExpression => (node as any).__brand === 'ArrayExpression'
const isIfStatement = (node: Node): node is IfStatement => (node as any).__brand === 'IfStatement'
const isWhileStatement = (node: Node): node is WhileStatement => (node as any).__brand === 'WhileStatement'
const isForStatement = (node: Node): node is ForStatement => (node as any).__brand === 'ForStatement'
const isDoWhileStatement = (node: Node): node is DoWhileStatement => (node as any).__brand === 'DoWhileStatement'
const isSwitchCase = (node: Node): node is SwitchCase => (node as any).__brand === 'SwitchCase'
const isSwitchStatement = (node: Node): node is SwitchStatement => (node as any).__brand === 'SwitchStatement'
const isStructDeclaration = (node: Node): node is StructDeclaration => (node as any).__brand === 'StructDeclaration'
const isUnaryExpression = (node: Node): node is UnaryExpression => (node as any).__brand === 'UnaryExpression'
const isBinaryExpression = (node: Node): node is BinaryExpression => (node as any).__brand === 'BinaryExpression'
const isTernaryExpression = (node: Node): node is TernaryExpression => (node as any).__brand === 'TernaryExpression'
const isReturnStatement = (node: Node): node is ReturnStatement => (node as any).__brand === 'ReturnStatement'
const isContinueStatement = (node: Node): node is ContinueStatement => (node as any).__brand === 'ContinueStatement'
const isBreakStatement = (node: Node): node is BreakStatement => (node as any).__brand === 'BreakStatement'
const isDiscardStatement = (node: Node): node is DiscardStatement => (node as any).__brand === 'DiscardStatement'
