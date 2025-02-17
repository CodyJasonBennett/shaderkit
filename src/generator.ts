import { type AST, type Program } from './ast.js'

export interface GenerateOptions {
  target: 'GLSL' | 'WGSL'
}

/**
 * Generates a string of GLSL or WGSL code from an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function generate(program: Program, options: GenerateOptions): string {
  function formatLayout(layout: Record<string, string | boolean> | null): string {
    if (!layout) return ''

    if (options.target === 'GLSL') {
      return `layout(${Object.entries(layout)
        .map(([k, v]) => (v === true ? k : `${k}=${v}`))
        .join(',')})`
    } else {
      return Object.entries(layout)
        .map(([k, v]) => (v === true ? `@${k} ` : `@${k}(${v})`))
        .join('')
    }
  }

  // TODO: restore comments/whitespace with sourcemaps
  function format(node: AST | null): string {
    if (!node) return ''

    switch (node.type) {
      case 'Identifier':
        return node.name
      case 'Literal':
        return node.value
      case 'TypeSpecifier':
        return format(node.typeSpecifier)
      case 'ArraySpecifier':
        if (options.target === 'GLSL') {
          return `${node.typeSpecifier.name}${node.dimensions.map((d) => `[${format(d)}]`).join('')}`
        } else {
          return `${node.typeSpecifier.name}<${node.dimensions.map(format).join(',')}>`
        }
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
          else if (node.name === 'extension') value = ` ${node.value.map(format).join(':')}`
          else if (node.value.length) value = ` ${node.value.map(format).join(' ')}`
        }

        return `\n#${node.name}${value}\n`
      }
      case 'PrecisionQualifierStatement':
        return `precision ${node.precision} ${node.typeSpecifier.name};`
      case 'InvariantQualifierStatement':
        return `invariant ${format(node.typeSpecifier)};`
      case 'LayoutQualifierStatement':
        return `${formatLayout(node.layout)}${node.qualifier};`
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
        if (options.target === 'GLSL') {
          const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : '' // precision
          const body = node.body ? format(node.body) : ';'
          return `${qualifiers}${format(node.typeSpecifier)} ${format(node.id)}(${node.params
            .map(format)
            .join(',')})${body}`
        } else {
          const attributes = node.id.layout ? formatLayout(node.id.layout) : ''
          const params = node.params.map(format).join(',')
          return `${attributes}fn ${format(node.id)}(${params})->${format(node.typeSpecifier)}${format(node.body)}`
        }
      }
      case 'FunctionParameter': {
        if (options.target === 'GLSL') {
          const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : ''
          const id = node.id ? ` ${format(node.id)}` : ''
          return `${qualifiers}${format(node.typeSpecifier)}${id}`
        } else {
          const attributes = node.id!.layout ? formatLayout(node.id!.layout) : ''
          return `${attributes}${format(node.id)}:${format(node.typeSpecifier)}`
        }
      }
      case 'VariableDeclaration': {
        if (options.target === 'GLSL') {
          const head = node.declarations[0]
          const layout = formatLayout(head.id.layout)
          const qualifiers = head.qualifiers.length ? `${head.qualifiers.join(' ')} ` : ''
          return `${layout}${qualifiers}${format(head.typeSpecifier)} ${node.declarations.map(format).join(',')};`
        } else {
          const head = node.declarations[0]

          const attributes = formatLayout(head.id.layout)

          let kind = ''
          if (head.qualifiers.length) {
            kind = head.qualifiers[1] ? `${head.qualifiers[0]}<${head.qualifiers[1]}>` : `${head.qualifiers[0]} `
          }

          return `${attributes}${kind}${node.declarations.map(format).join(',')};` // TODO
        }
      }
      case 'VariableDeclarator': {
        if (options.target === 'GLSL') {
          const init = node.init ? `=${format(node.init)}` : ''
          return `${format(node.id)}${init}`
        } else {
          const init = node.init ? `=${format(node.init)}` : `:${format(node.typeSpecifier)}`
          return `${format(node.id)}${init}`
        }
      }
      case 'StructuredBufferDeclaration': {
        const layout = formatLayout(node.typeSpecifier.layout)
        const scope = node.id ? format(node.id) : ''
        return `${layout}${node.qualifiers.join(' ')} ${format(node.typeSpecifier)}{${node.members
          .map(format)
          .join('')}}${scope};`
      }
      case 'StructDeclaration':
        if (options.target === 'GLSL') {
          return `struct ${format(node.id)}{${node.members.map(format).join('')}};`
        } else {
          return `struct ${format(node.id)}{${node.members.map(format).join('').replaceAll(';', ',')}};`
        }
      case 'ArrayExpression':
        if (options.target === 'GLSL') {
          return `${format(node.typeSpecifier)}(${node.elements.map(format).join(',')})`
        } else {
          return '' // TODO
        }
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
        if (options.target === 'GLSL') {
          return `${format(node.test)}?${format(node.consequent)}:${format(node.alternate)}`
        } else {
          return `select(${format(node.alternate)},${format(node.consequent)},${format(node.test)})`
        }
      case 'CallExpression':
        return `${format(node.callee)}(${node.arguments.map(format).join(',')})`
      case 'Program':
        return `${node.body.map(format).join('')}`
      default:
        return node satisfies never
    }
  }

  return format(program).replaceAll('\n\n', '\n').replaceAll('] ', ']').trim()
}
