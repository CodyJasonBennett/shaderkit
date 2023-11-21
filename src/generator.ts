import {
  type AST,
  Literal,
  Identifier,
  Type,
  BlockStatement,
  VariableDeclaration,
  FunctionDeclaration,
  CallExpression,
  MemberExpression,
  ArrayExpression,
  IfStatement,
  WhileStatement,
  ForStatement,
  DoWhileStatement,
  SwitchStatement,
  SwitchCase,
  StructDeclaration,
  UnaryExpression,
  BinaryExpression,
  TernaryExpression,
  ReturnStatement,
  PrecisionStatement,
  ContinueStatement,
  BreakStatement,
  DiscardStatement,
  PreprocessorStatement,
} from './ast'

const EOL_REGEX = /\n$/

// Punctuates expression statements
function punctuate(line: string): string {
  if (!line.endsWith('\n')) line = line + ';\n'
  return line
}

// TODO: GLSL-only
function format(node: AST | null): string {
  let line = ''

  if (node instanceof Literal || node instanceof Identifier) {
    line = node.value
  } else if (node instanceof Type) {
    line = node.parameters ? `${node.name}<${node.parameters.map(format).join(', ')}>` : node.name
  } else if (node instanceof BlockStatement) {
    const cr = node.body.length ? '\n' : ''
    line = `{${cr}${node.body.map((node) => '  ' + punctuate(format(node))).join('')}}\n`
  } else if (node instanceof VariableDeclaration) {
    let layout = ''
    if (node.layout) {
      const args: string[] = []
      for (const key in node.layout) {
        const value = node.layout[key]
        if (typeof value === 'string') args.push(`${key} = ${value}`)
        else args.push(key)
      }
      layout = `layout(${args.join(', ')}) `
    }

    const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : ''

    let type = format(node.type)

    let body = ''
    if (node.declarations.length) {
      const members: string[] = []
      for (const declaration of node.declarations) {
        let value = ''

        if (declaration.value instanceof ArrayExpression) {
          const t = declaration.value.type
          const params = t.parameters ? t.parameters?.map(format).join(', ') : ''
          value = `[${params}]`

          if (declaration.value.members.length) {
            value += ` = ${type}[${params}](${declaration.value.members.map(format).join(', ')})`
          }
        } else if (declaration.value) {
          value = ` = ${format(declaration.value)}`
        }

        members.push(`${declaration.name}${value}`)
      }
      body = members.join(', ')
    }

    line = `${layout}${qualifiers}${type} ${body};\n`.trimStart()
  } else if (node instanceof FunctionDeclaration) {
    const qualifiers = node.qualifiers.length ? `${node.qualifiers.join(' ')} ` : ''
    const args = node.args.map((node) => format(node).replace(';\n', '')).join(', ')
    const body = node.body ? ` ${format(node.body)}` : ';\n'
    line = `${qualifiers}${format(node.type)} ${node.name}(${args})${body}`
  } else if (node instanceof CallExpression) {
    line = `${format(node.callee)}(${node.args.map(format).join(', ')})`
  } else if (node instanceof MemberExpression) {
    line = `${format(node.object)}.${format(node.property)}`
  } else if (node instanceof ArrayExpression) {
    const params = node.type.parameters ? node.type.parameters?.map(format).join(', ') : ''
    line = `${node.type.name}[${params}](${node.members.map(format).join(', ')})`
  } else if (node instanceof IfStatement) {
    const consequent = format(node.consequent).replace(EOL_REGEX, '')
    const alternate = node.alternate ? ` else ${format(node.alternate).replace(EOL_REGEX, '')}` : ''
    line = `if (${format(node.test)}) ${consequent}${alternate}\n`
  } else if (node instanceof WhileStatement) {
    line = `while (${format(node.test)}) ${format(node.body)}`
  } else if (node instanceof ForStatement) {
    const init = format(node.init).replace(';\n', '')
    line = `for (${init}; ${format(node.test)}; ${format(node.update)}) ${format(node.body)}`
  } else if (node instanceof DoWhileStatement) {
    line = `do ${format(node.body).replace(EOL_REGEX, '')} while (${format(node.test)});\n`
  } else if (node instanceof SwitchStatement) {
    const cr = node.cases.length ? '\n' : ''
    line = `switch (${format(node.discriminant)}) {${cr}${node.cases.map(format).join('')}}\n`
  } else if (node instanceof SwitchCase) {
    const header = node.test ? `case ${format(node.test)}:` : 'default:'
    line = `  ${header}\n${node.consequent.map((node) => `    ${punctuate(format(node))}`).join('')}`
  } else if (node instanceof StructDeclaration) {
    const cr = node.members.length ? '\n' : ''
    line = `struct ${node.name} {${cr}${node.members.map((node) => `  ${format(node)}`).join('')}};\n`
  } else if (node instanceof UnaryExpression) {
    line = node.left ? `${format(node.left)}${node.operator}` : `${node.operator}${format(node.right)}`
  } else if (node instanceof BinaryExpression) {
    line = `${format(node.left)} ${node.operator} ${format(node.right)}`
  } else if (node instanceof TernaryExpression) {
    line = `${format(node.test)} ? ${format(node.consequent)} : ${format(node.alternate)}`
  } else if (node instanceof ReturnStatement) {
    line = node.argument ? `return ${format(node.argument)};\n` : `return;\n`
  } else if (node instanceof PrecisionStatement) {
    line = `precision ${node.precision} ${node.type.name};\n`
  } else if (node instanceof ContinueStatement) {
    line = 'continue;\n'
  } else if (node instanceof BreakStatement) {
    line = 'break;\n'
  } else if (node instanceof DiscardStatement) {
    line = 'discard;\n'
  } else if (node instanceof PreprocessorStatement) {
    let value = ''
    if (node.value) {
      if (node.name === 'include') {
        value = ` <${format(node.value[0])}>`
      } else if (node.name === 'extension') {
        value = ` ${node.value.map(format).join(': ')}`
      } else {
        value = ` ${node.value.map(format).join(' ')}`
      }
    }

    line = `#${node.name}${value}\n`
  }

  return line
}

export interface GenerateOptions {
  target: 'GLSL' // | 'WGSL'
}

/**
 * Generates a string of GLSL (WGSL WIP) code from an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree).
 */
export function generate(ast: AST[], options: GenerateOptions): string {
  let code = '#version 300 es\n'

  for (let i = 0; i < ast.length; i++) {
    code += punctuate(format(ast[i]))
  }

  return code.trim()
}
