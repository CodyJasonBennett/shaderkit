import { type AST, type Program } from './ast.js'

function formatLayout(layout: Record<string, string | boolean> | null): string {
  if (!layout) return ''

  return `layout(${Object.entries(layout)
    .map(([k, v]) => (v === true ? k : `${k}=${v}`))
    .join(',')})`
}

// TODO: restore comments/whitespace with sourcemaps, WGSL support
function format(node: AST | null): string {
  if (!node) return ''

  switch (node.type) {
    case 'Identifier':
      return node.name
    case 'Literal':
      return node.value
    case 'ArraySpecifier':
      return `${node.typeSpecifier.name}[${node.dimensions.map(format).join(',')}]`
    case 'ExpressionStatement':
      return `${format(node.expression)};`
    case 'BlockStatement':
      return `{${node.body.map(format).join('')}}`
    case 'DiscardStatement':
      return 'discard;'
    case 'PreprocessorStatement': {
      let value = ''
      if (node.value) {
        if (node.name === 'include') value = ` <${format(node.value[0])}>` // three is whitespace sensitive
        else if (node.name === 'extension') value = `${node.value.map(format).join(':')}`
        else value = ` ${node.value.map(format).join(' ')}`
      }

      return `\n#${node.name}${value}\n`
    }
    case 'PrecisionStatement':
      return `precision ${node.precision} ${node.typeSpecifier.name};`
    case 'ReturnStatement':
      return node.argument ? `return ${format(node.argument)};` : 'return;'
    case 'BreakStatement':
      return 'break;'
    case 'ContinueStatement':
      return 'continue;'
    case 'IfStatement': {
      const alternate = node.alternate ? ` else${format(node.consequent)}` : ''
      return `if(${format(node.test)})${format(node.consequent)}${alternate}`
    }
    case 'SwitchStatement':
      return `switch(${format(node.discriminant)}){${node.cases.map(format).join('')}}`
    case 'SwitchCase':
      return `case ${node.test ? format(node.test) : 'default'}:{${node.consequent.map(format).join(';')}}`
    case 'WhileStatement':
      return `while (${format(node.test)}) ${format(node.body)}`
    case 'DoWhileStatement':
      return `do ${format(node.body)}while(${format(node.test)})`
    case 'ForStatement':
      return `for(${format(node.init)};${format(node.test)};${format(node.update)})${format(node.body)}`
    case 'FunctionDeclaration': {
      const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : '' // precision
      const body = node.body ? format(node.body) : ';'
      return `${qualifiers}${format(node.typeSpecifier)} ${format(node.id)}(${node.params
        .map(format)
        .join(',')})${body}`
    }
    case 'FunctionParameter': {
      const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : ''
      return `${qualifiers}${format(node.typeSpecifier)} ${format(node.id)}`
    }
    case 'VariableDeclaration': {
      const head = node.declarations[0]
      const layout = formatLayout(head.layout)
      const qualifiers = head.qualifiers.length ? `${head.qualifiers.join(' ')} ` : ''
      return `${layout}${qualifiers}${format(head.typeSpecifier)} ${node.declarations.map(format).join(',')};`
    }
    case 'VariableDeclarator': {
      const init = node.init ? `=${format(node.init)}` : ''
      return `${format(node.id)}${init}`
    }
    case 'UniformDeclarationBlock': {
      const layout = formatLayout(node.layout)
      const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : ''
      const scope = node.id ? `${format(node.id)}` : ''
      return `${layout}${qualifiers}${format(node.typeSpecifier)}{${node.members.map(format).join('')}}${scope};`
    }
    case 'StructDeclaration':
      return `struct ${format(node.id)}{${node.members.map(format).join('')}};`
    case 'ArrayExpression':
      return `${format(node.typeSpecifier)}(${node.elements.map(format).join(',')})`
    case 'UnaryExpression':
    case 'UpdateExpression':
      return node.prefix ? `${node.operator}${format(node.argument)}` : `${format(node.argument)}${node.operator}`
    case 'BinaryExpression':
    case 'AssignmentExpression':
    case 'LogicalExpression':
      return `${format(node.left)}${node.operator}${format(node.right)}`
    case 'MemberExpression':
      return node.computed
        ? `${format(node.object)}[${format(node.property)}]`
        : `${format(node.object)}.${format(node.property)}`
    case 'ConditionalExpression':
      return `${format(node.test)}?${format(node.consequent)}:${format(node.alternate)}`
    case 'CallExpression':
      return `${format(node.callee)}(${node.arguments.map(format).join(',')})`
    case 'Program':
      return `${node.body.map(format).join('')}`
    default:
      return node satisfies never
  }
}

export interface GenerateOptions {
  target: 'GLSL' // | 'WGSL'
}

/**
 * Generates a string of GLSL (WGSL WIP) code from an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function generate(program: Program, options: GenerateOptions): string {
  return '#version 300 es\n' + format(program).replaceAll('\n\n', '\n')
}
