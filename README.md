[![Size](https://img.shields.io/bundlephobia/minzip/shaderkit?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/shaderkit)
[![Version](https://img.shields.io/npm/v/shaderkit?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/shaderkit)
[![Downloads](https://img.shields.io/npm/dt/shaderkit.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/shaderkit)

# shaderkit

Tools and IntelliSense for GLSL and WGSL.

## Table of Contents

- [Installation](#installation)
- [Tokenize](#tokenize)
- [Minify](#minify)
- [Parse](#parse)
- [Generate](#generate)
- [AST](#ast)
  - [Literal](#literal)
  - [Identifier](#identifier)
  - [Type](#type)
  - [VariableDeclaration](#variabledeclaration)
    - [VariableDeclarator](#variabledeclarator)
  - [StructDeclaration](#structdeclaration)
  - [FunctionDeclaration](#functiondeclaration)
  - [UnaryExpression](#unaryexpression)
  - [BinaryExpression](#binaryexpression)
  - [TernaryExpression](#ternaryexpression)
  - [CallExpression](#callexpression)
  - [MemberExpression](#memberexpression)
  - [ArrayExpression](#arrayexpression)
  - [BlockStatement](#blockstatement)
  - [IfStatement](#ifstatement)
  - [ForStatement](#forstatement)
  - [WhileStatement](#whilestatement)
  - [DoWhileStatement](#dowhilestatement)
  - [SwitchStatement](#switchstatement)
    - [SwitchCase](#switchcase)
  - [ReturnStatement](#returnstatement)
  - [PreprocessorStatement](#preprocessorstatement)
  - [PrecisionStatement](#precisionstatement)
  - [ContinueStatement](#continuestatement)
  - [BreakStatement](#breakstatement)
  - [DiscardStatement](#discardstatement)

## Installation

To install, use your preferred package manager:

```bash
npm install shaderkit
yarn add shaderkit
pnpm add shaderkit
```

Or, use a CDN:

```html
<script type="module">
  import * as shaderkit from 'https://unpkg.com/shaderkit'
</script>
```

## Tokenize

Tokenizes a string of GLSL or WGSL code, returning an array of `Token` objects, where each `Token` object represents a single syntax feature in the input code.

```ts
interface Token {
  type: 'whitespace' | 'comment' | 'symbol' | 'bool' | 'float' | 'int' | 'identifier' | 'keyword'
  value: string
}
```

<details>
  <summary>GLSL Example</summary>
  
  <br />

```ts
import { tokenize } from 'shaderkit'

const code = 'void main() { gl_Position = vec4(0, 0, 0, 1); }'
const tokens = tokenize(code)

console.log(tokens)
```

The output of the above code will be:

```json
[
  { "type": "keyword", "value": "void" },
  { "type": "whitespace", "value": " " },
  { "type": "identifier", "value": "main" },
  { "type": "symbol", "value": "(" },
  { "type": "symbol", "value": ")" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "{" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "gl_Position" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "=" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "vec4" },
  { "type": "symbol", "value": "(" },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "1" },
  { "type": "symbol", "value": ")" },
  { "type": "symbol", "value": ";" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "}" }
]
```

</details>

<details>
  <summary>WGSL Example</summary>
  
  <br />

```ts
import { tokenize } from 'shaderkit'

const code = '@vertex fn main() -> @builtin(position) vec4<f32> { return vec4(0, 0, 0, 1); }'
const tokens = tokenize(code)

console.log(tokens)
```

The output of the above code will be:

```json
[
  { "type": "symbol", "value": "@" },
  { "type": "keyword", "value": "vertex" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "fn" },
  { "type": "whitespace", "value": " " },
  { "type": "identifier", "value": "main" },
  { "type": "symbol", "value": "(" },
  { "type": "symbol", "value": ")" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "->" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "@" },
  { "type": "keyword", "value": "builtin" },
  { "type": "symbol", "value": "(" },
  { "type": "keyword", "value": "position" },
  { "type": "symbol", "value": ")" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "vec4" },
  { "type": "symbol", "value": "<" },
  { "type": "keyword", "value": "f32" },
  { "type": "symbol", "value": ">" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "{" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "return" },
  { "type": "whitespace", "value": " " },
  { "type": "keyword", "value": "vec4" },
  { "type": "symbol", "value": "(" },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "0" },
  { "type": "symbol", "value": "," },
  { "type": "whitespace", "value": " " },
  { "type": "int", "value": "1" },
  { "type": "symbol", "value": ")" },
  { "type": "symbol", "value": ";" },
  { "type": "whitespace", "value": " " },
  { "type": "symbol", "value": "}" }
]
```

</details>

The following are the supported token types and their descriptions:

| Type       | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| whitespace | A sequence of one or more whitespace characters.                          |
| comment    | A single-line or multi-line comment.                                      |
| symbol     | A symbol, such as an operator or punctuation mark.                        |
| bool       | A boolean value, either true or false.                                    |
| float      | A floating-point number, represented by a sequence of digits and symbols. |
| int        | An integer number, represented by a sequence of digits.                   |
| identifier | A user-defined identifier, such as a variable name or function name.      |
| keyword    | A keyword reserved by the language, such as if, else, for, etc.           |

## Minify

Minifies a string of GLSL or WGSL code, returning a minified version of the input code.

```ts
const minified: string = minify(code: string, {
  /** Whether to rename variables. Will call a MangleMatcher if specified. Default is `false`. */
  mangle: boolean | ((token: Token, index: number, tokens: Token[]) => boolean)
  /** A map to read and write renamed variables to when mangling. */
  mangleMap: Map<string, string>
  /** Whether to rename external variables such as uniforms or varyings. Default is `false`. */
  mangleExternals: boolean
})
```

To shared mangled interfaces when using `mangleExternal`, declare and re-use a `mangleMap` between shaders:

```ts
const options = { mangle: true, mangleExternals: true, mangleMap: new Map() }

// #version 300 es\nin vec2 a;out vec2 b;void main(){b=a;}
minify(`#version 300 es\nin vec2 sstt;out vec2 c;void main(){c=sstt;}`, options)

// #version 300 es\nin vec2 b;out vec4 a[gl_MaxDrawBuffers];void main(){a[0]=b.sstt;}
minify(`#version 300 es\nin vec2 c;out vec4 data[gl_MaxDrawBuffers];void main(){data[0]=c.sstt;}`, options)
```

## Parse

Parses a string of GLSL (WGSL is WIP) code into an [AST](#ast).

```ts
const ast: AST[] = parse(code: string)
```

## Generate

Generates a string of GLSL (WGSL is WIP) code from an [AST](#ast).

```ts
const code: string = generate(ast: AST[], {
  target: 'GLSL' // | 'WGSL'
})
```

## AST

An [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) loosely based on [ESTree](https://github.com/estree/estree) for GLSL and WGSL grammars.

### Literal

A shader literal representing a `bool`, `float`, `int`, or `uint` type.

```ts
class Literal {
  value: string
}
```

### Identifier

A variable identifier.

```ts
class Identifier {
  value: string
}
```

### Type

Represents a type specifier and its parameters (WGSL specific).

```ts
class Type {
  name: string
  parameters: (Type | Literal | Identifier)[] | null
}
```

### VariableDeclaration

A variable declaration with an optional binding layout, type qualifiers, kind (WGSL only), and declarators (e.g. a comma-separated list).

```ts
class VariableDeclaration {
  layout: Record<string, string | boolean> | null
  qualifiers: string[]
  kind: 'var' | 'let' | 'const' | null
  type: Type | Identifier
  declarations: VariableDeclarator[]
}
```

#### VariableDeclarator

A single named declarator as part of a `VariableDeclaration`.

```ts
class VariableDeclarator {
  name: string
  value: AST | null
}
```

### StructDeclaration

A struct declaration. Can be used as a type or constructor.

```ts
class StructDeclaration {
  name: string
  members: VariableDeclaration[]
}
```

### FunctionDeclaration

A function declaration with an optional type qualifier and arguments.

```ts
class FunctionDeclaration {
  name: string
  type: Type | Identifier
  qualifiers: string[]
  args: VariableDeclaration[]
  body: BlockStatement | null
}
```

### UnaryExpression

A unary expression with a left or right handed operator.

```ts
class UnaryExpression {
  operator: string
  left: AST | null
  right: AST | null
}
```

### BinaryExpression

A binary expression with a left and right operand.

```ts
class BinaryExpression {
  operator: string
  left: AST
  right: AST
}
```

### TernaryExpression

A ternary or conditional expression.

```ts
class TernaryExpression {
  test: AST
  consequent: AST
  alternate: AST
}
```

### CallExpression

A call expression.

```ts
class CallExpression {
  callee: AST
  args: AST[]
}
```

### MemberExpression

A member expression.

```ts
class MemberExpression {
  object: AST
  property: AST
}
```

### ArrayExpression

An array expression. `members` can be empty if uninitialized.

```ts
class ArrayExpression {
  type: Type
  members: AST[]
}
```

### BlockStatement

A block statement.

```ts
class BlockStatement {
  body: AST[]
}
```

### IfStatement

An if statement.

```ts
class IfStatement {
  test: AST
  consequent: AST
  alternate: AST | null
}
```

### ForStatement

A for statement.

```ts
class ForStatement {
  init: AST | null
  test: AST | null
  update: AST | null
  body: AST
}
```

### WhileStatement

A while statement.

```ts
class WhileStatement {
  test: AST
  body: AST
}
```

### DoWhileStatement

A do-while statement.

```ts
class DoWhileStatement {
  test: AST
  body: AST
}
```

### SwitchStatement

A switch statement.

```ts
class SwitchStatement {
  discriminant: AST
  cases: SwitchCase[]
}
```

#### SwitchCase

A switch-case statement. `test` is null for a `default` case.

```ts
class SwitchCase {
  test: AST | null
  consequent: AST[]
}
```

### ReturnStatement

A return statement with an optional argument.

```ts
class ReturnStatement {
  argument:
    | Literal
    | Identifier
    | UnaryExpression
    | BinaryExpression
    | TernaryExpression
    | CallExpression
    | MemberExpression
    | ArrayExpression
    | null
}
```

### PreprocessorStatement

A GLSL preprocessor statement with an optional value.

```ts
class PreprocessorStatement {
  name: string
  value: AST[] | null
}
```

### PrecisionStatement

A GLSL precision statement.

```ts
class PrecisionStatement {
  precision: 'lowp' | 'mediump' | 'highp'
  type: Type
}
```

### ContinueStatement

A continue statement.

```ts
class ContinueStatement {}
```

### BreakStatement

A break statement.

```ts
class BreakStatement {}
```

### DiscardStatement

A discard statement.

```ts
class DiscardStatement {}
```
