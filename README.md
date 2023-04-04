[![Size](https://img.shields.io/bundlephobia/minzip/shaderkit?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/shaderkit)
[![Version](https://img.shields.io/npm/v/shaderkit?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/shaderkit)
[![Downloads](https://img.shields.io/npm/dt/shaderkit.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/shaderkit)

# shaderkit

Tools and IntelliSense for GLSL and WGSL.

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
const programOpts = { mangle: true, mangleExternals: true, mangleMap: new Map() }

// #version 300 es\nin vec2 a;out vec2 b;void main(){b=a;}
minify(`#version 300 es\nin vec2 uv;out vec2 c;void main(){c=uv;}`, programOpts)

// #version 300 es\nin vec2 b;out vec4 a[gl_MaxDrawBuffers];void main(){a[0]=b.sstt;}
minify(`#version 300 es\nin vec2 c;out vec4 data[gl_MaxDrawBuffers];void main(){data[0]=c.sstt;}`, programOpts)
```
