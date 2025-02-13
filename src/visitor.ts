import { type AST } from './ast'

export type Visitors = Partial<{
  [K in AST['type']]:
    | ((node: Extract<AST, { type: K }>, ancestors: AST[]) => void)
    | {
        enter?(node: Extract<AST, { type: K }>, ancestors: AST[]): void
        exit?(node: Extract<AST, { type: K }>, ancestors: AST[]): void
      }
}>

/**
 * Recurses through an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree), calling a visitor object on matching nodes.
 */
export function visit(node: AST, visitors: Visitors, ancestors: AST[] = []): void {
  const parentAncestors = ancestors
  const visitor = visitors[node.type]

  // @ts-ignore
  ;(visitor?.enter ?? visitor)?.(node, parentAncestors)

  ancestors = [...ancestors, node]

  switch (node.type) {
    case 'ArraySpecifier':
      visit(node.typeSpecifier, visitors, ancestors)
      for (const dimension of node.dimensions) if (dimension) visit(dimension, visitors, ancestors)
      break
    case 'ExpressionStatement':
      visit(node.expression, visitors, ancestors)
      break
    case 'BlockStatement':
      for (const statement of node.body) visit(statement, visitors, ancestors)
      break
    case 'PreprocessorStatement':
      if (node.value) for (const expression of node.value) visit(expression, visitors, ancestors)
      break
    case 'PrecisionStatement':
      visit(node.typeSpecifier, visitors, ancestors)
      break
    case 'ReturnStatement':
      if (node.argument) visit(node.argument, visitors, ancestors)
      break
    case 'IfStatement':
      visit(node.test, visitors, ancestors)
      visit(node.consequent, visitors, ancestors)
      if (node.alternate) visit(node.alternate, visitors, ancestors)
      break
    case 'SwitchStatement':
      visit(node.discriminant, visitors, ancestors)
      for (const kase of node.cases) visit(kase, visitors, ancestors)
      break
    case 'SwitchCase':
      if (node.test) visit(node.test, visitors, ancestors)
      for (const statement of node.consequent) visit(statement, visitors, ancestors)
      break
    case 'WhileStatement':
    case 'DoWhileStatement':
      visit(node.test, visitors, ancestors)
      visit(node.body, visitors, ancestors)
      break
    case 'ForStatement':
      if (node.init) visit(node.init, visitors, ancestors)
      if (node.test) visit(node.test, visitors, ancestors)
      if (node.update) visit(node.update, visitors, ancestors)
      visit(node.body, visitors, ancestors)
      break
    case 'FunctionDeclaration':
      visit(node.typeSpecifier, visitors, ancestors)
      visit(node.id, visitors, ancestors)
      if (node.body) visit(node.body, visitors, ancestors)
      break
    case 'FunctionParameter':
      visit(node.typeSpecifier, visitors, ancestors)
      visit(node.id, visitors, ancestors)
      break
    case 'VariableDeclaration':
      for (const declaration of node.declarations) visit(declaration, visitors, ancestors)
      break
    case 'VariableDeclarator':
      visit(node.typeSpecifier, visitors, ancestors)
      visit(node.id, visitors, ancestors)
      if (node.init) visit(node.init, visitors, ancestors)
      break
    case 'UniformDeclarationBlock':
      visit(node.typeSpecifier, visitors, ancestors)
      for (const member of node.members) visit(member, visitors, ancestors)
      if (node.id) visit(node.id, visitors, ancestors)
      break
    case 'StructDeclaration':
      visit(node.id, visitors, ancestors)
      for (const member of node.members) visit(member, visitors, ancestors)
      break
    case 'ArrayExpression':
      visit(node.typeSpecifier, visitors, ancestors)
      for (const element of node.elements) visit(element, visitors, ancestors)
      break
    case 'UnaryExpression':
    case 'UpdateExpression':
      visit(node.argument, visitors, ancestors)
      break
    case 'BinaryExpression':
    case 'AssignmentExpression':
    case 'LogicalExpression':
      visit(node.left, visitors, ancestors)
      visit(node.right, visitors, ancestors)
      break
    case 'MemberExpression':
      visit(node.object, visitors, ancestors)
      visit(node.property, visitors, ancestors)
      break
    case 'ConditionalExpression':
      visit(node.test, visitors, ancestors)
      visit(node.consequent, visitors, ancestors)
      visit(node.alternate, visitors, ancestors)
      break
    case 'CallExpression':
      visit(node.callee, visitors, ancestors)
      for (const argument of node.arguments) visit(argument, visitors, ancestors)
      break
    case 'Program':
      for (const statement of node.body) visit(statement, visitors, ancestors)
      break
  }

  // @ts-ignore
  visitor?.exit?.(node, parentAncestors)
}
