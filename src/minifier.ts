import { type Token, tokenize } from './tokenizer.js'
import { GLSL_KEYWORDS, WGSL_KEYWORDS } from './constants.js'
import { parse } from './parser.js'
import { generate } from './generator.js'
import { visit } from './visitor.js'
import { ArraySpecifier } from './ast.js'

export type MangleMatcher = (token: Token, index: number, tokens: Token[]) => boolean

export interface MinifyOptions {
  /** Whether to rename variables. Will call a {@link MangleMatcher} if specified. Default is `false`. */
  mangle: boolean | MangleMatcher
  /** A map to read and write renamed variables to when mangling. */
  mangleMap: Map<string, string>
  /** Whether to rename external variables such as uniforms or varyings. Default is `false`. */
  mangleExternals: boolean
}

const isWord = /* @__PURE__ */ RegExp.prototype.test.bind(/^\w/)
const isName = /* @__PURE__ */ RegExp.prototype.test.bind(/^[_A-Za-z]/)
const isScoped = /* @__PURE__ */ RegExp.prototype.test.bind(/[;{}\\@]/)
const isStorage = /* @__PURE__ */ RegExp.prototype.test.bind(
  /^(binding|group|layout|uniform|in|out|attribute|varying)$/,
)

// Checks for WGSL-specific `fn foo(`, `var bar =`, `let baz =`, `const qux =`
const WGSL_REGEX = /\bfn\s+\w+\s*\(|\b(var|let|const)\s+\w+\s*[:=]/

function minifyLegacy(
  code: string,
  { mangle = false, mangleMap = new Map(), mangleExternals = false }: Partial<MinifyOptions> = {},
): string {
  const mangleCache = new Map<string, string>()
  const tokens: Token[] = tokenize(code).filter((token) => token.type !== 'whitespace' && token.type !== 'comment')

  let mangleIndex: number = -1
  let lineIndex: number = -1
  let blockIndex: number = -1
  let minified: string = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Track possibly external scopes
    if (isStorage(token.value) || isScoped(tokens[i - 1]?.value)) lineIndex = i

    // Mark enter/leave block-scope
    if (token.value === '{' && isName(tokens[i - 1]?.value)) blockIndex = i - 1
    else if (token.value === '}') blockIndex = -1

    // Pad alphanumeric tokens
    if (isWord(token.value) && isWord(tokens[i - 1]?.value)) minified += ' '

    let prefix = token.value
    if (tokens[i - 1]?.value === '.') {
      prefix = `${tokens[i - 2]?.value}.` + prefix
    }

    // Mangle declarations and their references
    if (token.type === 'identifier' && (typeof mangle === 'boolean' ? mangle : mangle(token, i, tokens))) {
      const namespace = tokens[i - 1]?.value === '}' && tokens[i + 1]?.value === ';'
      const storage = isStorage(tokens[lineIndex]?.value)
      const list = storage && tokens[i - 1]?.value === ','
      let renamed = mangleMap.get(prefix) ?? mangleCache.get(prefix)
      if (
        // no-op
        !renamed &&
        // Skip struct properties
        blockIndex === -1 &&
        // Is declaration, reference, namespace, or comma-separated list
        (isName(tokens[i - 1]?.value) ||
          // uniform Type { ... } name;
          namespace ||
          // uniform float foo, bar;
          list ||
          // fn (arg: type) -> void
          (tokens[i - 1]?.type === 'symbol' && tokens[i + 1]?.value === ':')) &&
        // Skip shader externals when disabled
        (mangleExternals || !storage)
      ) {
        // Write shader externals and preprocessor defines to mangleMap for multiple passes
        // TODO: do so via scope tracking
        const isExternal =
          // Shader externals
          (mangleExternals && storage) ||
          // Defines
          tokens[i - 2]?.value === '#' ||
          // Namespaced uniform structs
          namespace ||
          // Comma-separated list of uniforms
          list ||
          // WGSL entrypoints via @stage or @workgroup_size(...)
          (tokens[i - 1]?.value === 'fn' && (tokens[i - 2]?.value === ')' || tokens[i - 3]?.value === '@'))
        const cache = isExternal ? mangleMap : mangleCache

        while (!renamed || cache.has(renamed) || WGSL_KEYWORDS.includes(renamed)) {
          renamed = ''
          mangleIndex++

          let j = mangleIndex
          while (j > 0) {
            renamed = String.fromCharCode(97 + ((j - 1) % 26)) + renamed
            j = Math.floor(j / 26)
          }
        }

        cache.set(prefix, renamed)
      }

      minified += renamed ?? token.value
    } else {
      if (token.value === '\\') minified += '\n'
      else minified += token.value
    }
  }

  return minified.trim()
}

interface Scope {
  // types: Map<string, string>
  values: Map<string, string>
  references: Map<string, string>
}

/**
 * Minifies a string of GLSL or WGSL code.
 */
export function minify(
  code: string,
  { mangle = false, mangleMap = new Map(), mangleExternals = false }: Partial<MinifyOptions> = {},
): string {
  const isWGSL = WGSL_REGEX.test(code)
  const KEYWORDS = isWGSL ? WGSL_KEYWORDS : GLSL_KEYWORDS

  // TODO: remove when WGSL is better supported
  if (isWGSL) return minifyLegacy(code, { mangle, mangleMap, mangleExternals })

  const program = parse(code)

  if (mangle) {
    const scopes: Scope[] = []

    function pushScope(): void {
      scopes.push({ values: new Map(), references: new Map() })
    }
    function popScope(): void {
      scopes.length -= 1
    }

    function getScopedType(name: string): string | null {
      for (let i = scopes.length - 1; i >= 0; i--) {
        const type = scopes[i].references.get(name)
        if (type) return type
      }

      return null
    }

    const typeScopes = new Map<string, Scope>()
    const types: (string | null)[] = []

    function getScopedName(name: string): string | null {
      if (types.length === 0 && mangleMap.has(name)) {
        return mangleMap.get(name)!
      }

      if (types[0] != null && typeScopes.has(types[0])) {
        const renamed = typeScopes.get(types[0])!.values.get(name)
        if (renamed) return renamed
      }

      for (let i = scopes.length - 1; i >= 0; i--) {
        const renamed = scopes[i].values.get(name)
        if (renamed) return renamed
      }

      return null
    }

    let mangleIndex: number = -1
    function mangleName(name: string, isExternal: boolean): string {
      let renamed = (isExternal && mangleMap.get(name)) || getScopedName(name)

      while (
        !renamed ||
        getScopedName(renamed) !== null ||
        (isExternal && mangleMap.has(renamed)) ||
        KEYWORDS.includes(renamed)
      ) {
        renamed = ''
        mangleIndex++

        let j = mangleIndex
        while (j > 0) {
          renamed = String.fromCharCode(97 + ((j - 1) % 26)) + renamed
          j = Math.floor(j / 26)
        }
      }

      scopes.at(-1)!.values.set(name, renamed)
      if (isExternal) {
        if (types[0] != null) mangleMap.set(types[0] + '.' + name, renamed)
        else mangleMap.set(name, renamed)
      }

      return renamed
    }

    const structs = new Set<string>()
    const externalTypes = new Set<string>()

    // Top-level pass for externals and type definitions
    for (const statement of program.body) {
      if (statement.type === 'StructDeclaration') {
        structs.add(statement.id.name)
      } else if (statement.type === 'StructuredBufferDeclaration') {
        const isExternal = statement.qualifiers.some(isStorage)

        if (statement.typeSpecifier.type === 'Identifier') {
          structs.add(statement.typeSpecifier.name)
          if (isExternal) externalTypes.add(statement.typeSpecifier.name)
        } else if (statement.typeSpecifier.type === 'ArraySpecifier') {
          structs.add(statement.typeSpecifier.typeSpecifier.name)
          if (isExternal) externalTypes.add(statement.typeSpecifier.typeSpecifier.name)
        }
      }
    }

    visit(program, {
      Program: {
        enter() {
          pushScope()
        },
        exit() {
          popScope()
        },
      },
      BlockStatement: {
        enter() {
          pushScope()
        },
        exit() {
          popScope()
        },
      },
      FunctionDeclaration: {
        enter(node) {
          // TODO: this might be external in the case of WGSL entrypoints
          if (node.id.name !== 'main') mangleName(node.id.name, false)

          const scope = scopes.at(-1)!
          if (node.typeSpecifier.type === 'Identifier') {
            scope.references.set(node.id.name, node.typeSpecifier.name)
          } else if (node.typeSpecifier.type === 'ArraySpecifier') {
            scope.references.set(node.id.name, node.typeSpecifier.typeSpecifier.name)
          }

          pushScope()

          for (const param of node.params) {
            if (param.id) mangleName(param.id.name, false)
          }
        },
        exit() {
          popScope()
        },
      },
      StructDeclaration: {
        enter(node) {
          const isExternal = externalTypes.has(node.id.name)
          if (!isExternal || mangleExternals) {
            mangleName(node.id.name, isExternal)
          }

          pushScope()
          typeScopes.set(node.id.name, scopes.at(-1)!)
          types.push(node.id.name)
        },
        exit() {
          types.length -= 1
          popScope()
        },
      },
      StructuredBufferDeclaration: {
        enter(node) {
          if (node.typeSpecifier.type !== 'Identifier') return

          // When an instance name is not defined, the type specifier can be used as an external reference
          if (node.id || mangleExternals) {
            mangleName(node.typeSpecifier.name, false)
          }

          if (!node.id) return

          const isExternal = externalTypes.has(node.typeSpecifier.name)
          if (!isExternal || mangleExternals) {
            mangleName(node.id.name, isExternal)
          }

          const scope = scopes.at(-1)!
          if (node.typeSpecifier.type === 'Identifier') {
            scope.references.set(node.id.name, node.typeSpecifier.name)
            types.push(node.typeSpecifier.name)
          } else if ((node.typeSpecifier as ArraySpecifier).type === 'ArraySpecifier') {
            scope.references.set(node.id.name, (node.typeSpecifier as ArraySpecifier).typeSpecifier.name)
            types.push((node.typeSpecifier as ArraySpecifier).typeSpecifier.name)
          }

          pushScope()
          typeScopes.set(node.id.name, scopes.at(-1)!)
        },
        exit(node) {
          if (node.id) {
            types.length -= 1
            popScope()
          }
        },
      },
      VariableDeclaration(node, ancestors) {
        // TODO: ensure uniform decl lists work
        const parent = ancestors.at(-1) // Container -> VariableDecl
        const isParentExternal =
          parent?.type === 'StructDeclaration' ||
          (parent?.type === 'StructuredBufferDeclaration' && parent.qualifiers.some(isStorage))

        for (const decl of node.declarations) {
          // Skip preprocessor
          if (decl.type !== 'VariableDeclarator') continue

          const isExternal = isParentExternal || decl.qualifiers.some(isStorage)
          if (!isExternal || mangleExternals) {
            let name: string = ''
            if (decl.id.type === 'Identifier') {
              name = decl.id.name
            } else if (decl.id.type === 'ArraySpecifier') {
              name = (decl.id as unknown as ArraySpecifier).typeSpecifier.name
            }

            mangleName(name, isExternal)

            const scope = scopes.at(-1)!
            if (decl.typeSpecifier.type === 'Identifier') {
              scope.references.set(name, decl.typeSpecifier.name)
            } else if (decl.typeSpecifier.type === 'ArraySpecifier') {
              scope.references.set(name, decl.typeSpecifier.typeSpecifier.name)
            }
          }
        }
      },
      PreprocessorStatement(node) {
        const value = node.value?.[0]
        if (node.name === 'define' && value) {
          const isExternal = false
          if (value.type === 'Identifier') {
            mangleName(value.name, isExternal)
          } else if (value.type === 'MemberExpression') {
            // TODO: this needs to be more robust to handle string replacement
          } else if (value.type === 'CallExpression' && value.callee.type === 'Identifier') {
            mangleName(value.callee.name, isExternal)
          }
        }
      },
      MemberExpression: {
        enter(node) {
          let type: string | null = ''

          if (node.object.type === 'CallExpression' && node.object.callee.type === 'Identifier') {
            // TODO: length() should be mangled whereas array.length() should not
            type = getScopedType(node.object.callee.name)
          } else if (node.object.type === 'MemberExpression' && node.object.object.type === 'Identifier') {
            // Only computed member expressions can be parsed this way (e.g., (array[2]).position)
            type = getScopedType(node.object.object.name)
            const renamed = getScopedName(node.object.object.name)
            if (renamed !== null) node.object.object.name = renamed
          } else if (node.object.type === 'Identifier') {
            type = getScopedType(node.object.name)
            const renamed = getScopedName(node.object.name)
            if (renamed !== null) node.object.name = renamed
          }

          types.push(type)
        },
        exit() {
          types.length -= 1
        },
      },
      Identifier(node) {
        const renamed = getScopedName(node.name)
        if (renamed !== null) node.name = renamed
      },
    })
  }

  return generate(program, { target: 'GLSL' })
}
