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
- [Visit](#visit)
- [AST](#ast)
  - [Node Objects](#node-objects)
  - [Identifier](#identifier)
  - [Literal](#literal)
  - [ArraySpecifier](#arrayspecifier)
  - [Program](#program)
  - Statements
    - [ExpressionStatement](#expressionstatement)
    - [BlockStatement](#blockstatement)
    - [DiscardStatement](#discardstatement)
    - [PreprocessorStatement](#preprocessorstatement)
    - [PrecisionStatement](#precisionstatement)
    - Control Flow
      - [ReturnStatement](#returnstatement)
      - [BreakStatement](#breakstatement)
      - [ContinueStatement](#continuestatement)
    - Choice
      - [IfStatement](#ifstatement)
      - [SwitchStatement](#switchstatement)
        - [SwitchCase](#switchcase)
    - Loops
      - [WhileStatement](#whilestatement)
      - [DoWhileStatement](#dowhilestatement)
      - [ForStatement](#forstatement)
  - Declarations
    - [FunctionDeclaration](#functiondeclaration)
      - [FunctionParameter](#functionparameter)
    - [VariableDeclaration](#variabledeclaration)
      - [VariableDeclarator](#variabledeclarator)
    - [UniformDeclarationBlock](#uniformdeclarationblock)
    - [StructDeclaration](#structdeclaration)
  - Expressions
    - [ArrayExpression](#arrayexpression)
    - Unary operations
      - [UnaryExpression](#unaryexpression)
        - [UnaryOperator](#unaryoperator)
      - [UpdateExpression](#updateexpression)
        - [UpdateOperator](#updateoperator)
    - Binary Operations
      - [BinaryExpression](#binaryexpression)
        - [BinaryOperator](#binaryoperator)
      - [AssignmentExpression](#assignmentexpression)
        - [AssignmentOperator](#assignmentoperator)
      - [LogicalExpression](#logicalexpression)
        - [LogicalOperator](#logicaloperator)
      - [MemberExpression](#memberexpression)
    - [ConditionalExpression](#conditionalexpression)
    - [CallExpression](#callexpression)

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
const ast: Program = parse(code: string)
```

## Generate

Generates a string of GLSL (WGSL is WIP) code from an [AST](#ast).

```ts
const code: string = generate(program: Program, {
  target: 'GLSL' // | 'WGSL'
})
```

## Visit

Recurses through an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree), calling a visitor object on matching nodes.

```ts
visit(
  program: Program,
  visitors: {
    Program: {
      enter(node, ancestors) {
        // Called before any descendant nodes are processed
      },
      exit(node, ancestors) {
        // Called after all nodes are processed
      }
    },
    Identifier(node, ancestors) {
      // Called before any descendant nodes are processed (alias to enter)
    }
  } satisfies Visitors
)
```

## AST

An [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) loosely based on [ESTree](https://github.com/estree/estree) for GLSL and WGSL grammars.

### Node Objects

AST nodes extend `Node` objects which implement the following abstract interface:

```ts
interface Node {
  type: string
}
```

The `type` field is a string representing the AST variant type which can determine the interface a node implements.

### Identifier

A variable identifier.

```ts
interface Identifier extends Node {
  type: 'Identifier'
  name: string
}
```

### Literal

A shader literal representing a `bool`, `float`, `int`, or `uint` type.

```ts
interface Literal extends Node {
  type: 'Literal'
  value: string
}
```

### ArraySpecifier

An array and its dimensions.

```ts
interface ArraySpecifier extends Node {
  type: 'ArraySpecifier'
  typeSpecifier: Identifier
  dimensions: (Literal | Identifier | null)[]
}
```

### Program

Represents the root of an AST.

```ts
interface Program extends Node {
  type: 'Program'
  body: Statement[]
}
```

### ExpressionStatement

An expression as a standalone statement.

```ts
interface ExpressionStatement extends Node {
  type: 'ExpressionStatement'
  expression: Expression
}
```

### BlockStatement

A block statement.

```ts
interface BlockStatement extends Node {
  type: 'BlockStatement'
  body: Statement[]
}
```

### DiscardStatement

A discard statement in fragment shaders.

```ts
interface DiscardStatement extends Node {
  type: 'DiscardStatement'
}
```

### PreprocessorStatement

A GLSL preprocessor statement with an optional value.

```ts
interface PreprocessorStatement extends Node {
  type: 'PreprocessorStatement'
  name: string
  value: Expression[] | null
}
```

### PrecisionStatement

A GLSL precision statement.

```ts
interface PrecisionStatement extends Node {
  type: 'PrecisionStatement'
  precision: PrecisionQualifier
  typeSpecifier: Identifier
}
```

### ReturnStatement

A return statement with an optional argument.

```ts
interface ReturnStatement extends Node {
  type: 'ReturnStatement'
  argument: Expression | null
}
```

### BreakStatement

A break statement.

```ts
interface BreakStatement extends Node {
  type: 'BreakStatement'
}
```

### ContinueStatement

A continue statement.

```ts
interface ContinueStatement extends Node {
  type: 'ContinueStatement'
}
```

### IfStatement

An if-else statement.

```ts
interface IfStatement extends Node {
  type: 'IfStatement'
  test: Expression
  consequent: Statement
  alternate: Statement | null
}
```

### SwitchStatement

A switch statement.

```ts
interface SwitchStatement extends Node {
  type: 'SwitchStatement'
  discriminant: Expression
  cases: SwitchCase[]
}
```

#### SwitchCase

A switch-case statement. `test` is null for a `default` case.

```ts
interface SwitchCase extends Node {
  type: 'SwitchCase'
  test: Expression | null
  consequent: Statement[]
}
```

### WhileStatement

A while statement.

```ts
interface WhileStatement extends Node {
  type: 'WhileStatement'
  test: Expression
  body: Statement
}
```

### DoWhileStatement

A do-while statement.

```ts
interface DoWhileStatement extends Node {
  type: 'DoWhileStatement'
  body: Statement
  test: Expression
}
```

### ForStatement

A for statement.

```ts
interface ForStatement extends Node {
  type: 'ForStatement'
  init: VariableDeclaration | Expression | null
  test: Expression | null
  update: Expression | null
  body: Statement
}
```

### FunctionDeclaration

A function declaration. `body` is null for overloads.

```ts
interface FunctionDeclaration extends Node {
  type: 'FunctionDeclaration'
  id: Identifier
  qualifiers: PrecisionQualifier[]
  typeSpecifier: Identifier | ArraySpecifier
  params: FunctionParameter[]
  body: BlockStatement | null
}
```

#### FunctionParameter

A function parameter within a function declaration.

```ts
interface FunctionParameter extends Node {
  type: 'FunctionParameter'
  id: Identifier
  qualifiers: (ConstantQualifier | ParameterQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
}
```

### VariableDeclaration

A variable declaration.

```ts
interface VariableDeclaration extends Node {
  type: 'VariableDeclaration'
  declarations: VariableDeclarator[]
}
```

#### VariableDeclarator

A variable declarator within a variable declaration.

```ts
interface VariableDeclarator extends Node {
  type: 'VariableDeclarator'
  id: Identifier
  qualifiers: (ConstantQualifier | InterpolationQualifier | StorageQualifier | PrecisionQualifier)[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  init: Expression | null
}
```

### UniformDeclarationBlock

A uniform declaration block with optional layout and qualifiers.

```ts
interface UniformDeclarationBlock extends Node {
  type: 'UniformDeclarationBlock'
  id: Identifier | null
  qualifiers: LayoutQualifier[]
  typeSpecifier: Identifier | ArraySpecifier
  layout: Record<string, string | boolean> | null
  members: VariableDeclaration[]
}
```

### StructDeclaration

A struct declaration. Can be used as a type or constructor.

```ts
interface StructDeclaration extends Node {
  type: 'StructDeclaration'
  id: Identifier
  members: VariableDeclaration[]
}
```

### ArrayExpression

An array initialization expression.

```ts
interface ArrayExpression extends Node {
  type: 'ArrayExpression'
  typeSpecifier: ArraySpecifier
  elements: Expression[]
}
```

### UnaryExpression

A unary expression with a left or right handed operator.

```ts
interface UnaryExpression extends Node {
  type: 'UnaryExpression'
  operator: UnaryOperator
  prefix: boolean
  argument: Expression
}
```

#### UnaryOperator

```ts
type UnaryOperator = '-' | '+' | '!' | '~'
```

### UpdateExpression

An update expression with an optionally prefixed operator.

```ts
interface UpdateExpression extends Node {
  type: 'UpdateExpression'
  operator: UpdateOperator
  argument: Expression
  prefix: boolean
}
```

#### UpdateOperator

```ts
type UpdateOperator = '++' | '--'
```

### BinaryExpression

A binary expression with a left and right operand.

```ts
interface BinaryExpression extends Node {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: Expression
  right: Expression
}
```

#### BinaryOperator

```ts
type BinaryOperator =
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
```

### AssignmentExpression

An assignment expression.

```ts
interface AssignmentExpression extends Node {
  type: 'AssignmentExpression'
  operator: AssignmentOperator
  left: Expression
  right: Expression
}
```

#### AssignmentOperator

```ts
type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=' | '%=' | '<<=' | '>>=' | '>>>=' | '|=' | '^=' | '&='
```

### LogicalExpression

A logical operation between two expressions.

```ts
interface LogicalExpression extends Node {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: Expression
  right: Expression
}
```

#### LogicalOperator

```ts
type LogicalOperator = '||' | '&&' | '^^'
```

### MemberExpression

A member expression.

```ts
interface MemberExpression extends Node {
  type: 'MemberExpression'
  object: Expression
  property: Expression
  computed: boolean
}
```

### ConditionalExpression

A conditional expression or ternary.

```ts
interface ConditionalExpression extends Node {
  type: 'ConditionalExpression'
  test: Expression
  alternate: Expression
  consequent: Expression
}
```

### CallExpression

A function call expression or struct initialization.

```ts
interface CallExpression extends Node {
  type: 'CallExpression'
  callee: Expression
  arguments: Expression[]
}
```
