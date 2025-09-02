import { describe, it, expect } from 'vitest'
import {
  parse,
  BinaryOperator,
  BreakStatement,
  ContinueStatement,
  DiscardStatement,
  DoWhileStatement,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  LogicalOperator,
  PrecisionQualifierStatement,
  PreprocessorStatement,
  ReturnStatement,
  StructDeclaration,
  SwitchStatement,
  UnaryOperator,
  UpdateOperator,
  VariableDeclaration,
  WhileStatement,
  Identifier,
  ArraySpecifier,
  InvariantQualifierStatement,
} from 'shaderkit'

describe('parser', () => {
  it('parses identifiers', () => {
    expect(parse('identifier;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: { type: 'Identifier', name: 'identifier' },
      },
    ])
    expect(parse('ident\\\nifier;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: { type: 'Identifier', name: 'identifier' },
      },
    ])
  })

  it('parses literals', () => {
    for (const value of ['true', 'false', '0', '0.0']) {
      expect(parse(`${value};`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: { type: 'Literal', value },
        },
      ])
    }
  })

  it('parses unary expressions', () => {
    for (const operator of ['+', '-', '~', '!'] satisfies UnaryOperator[]) {
      expect(parse(`${operator}identifier;`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'UnaryExpression',
            operator,
            prefix: true,
            argument: { type: 'Identifier', name: 'identifier' },
          },
        },
      ])
    }
  })

  it('parses update expressions', () => {
    for (const operator of ['++', '--'] satisfies UpdateOperator[]) {
      expect(parse(`identifier${operator};`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'UpdateExpression',
            operator,
            prefix: false,
            argument: { type: 'Identifier', name: 'identifier' },
          },
        },
      ])
    }

    for (const operator of ['++', '--'] satisfies UpdateOperator[]) {
      expect(parse(`${operator}identifier;`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'UpdateExpression',
            operator,
            prefix: true,
            argument: { type: 'Identifier', name: 'identifier' },
          },
        },
      ])
    }
  })

  it('parses binary expressions', () => {
    for (const operator of [
      '&',
      '|',
      '^',
      '/',
      '==',
      '>',
      '>=',
      '<',
      '<=',
      '-',
      '*',
      '!=',
      '+',
      '%',
      '<<',
      '>>',
    ] satisfies BinaryOperator[]) {
      expect(parse(`a ${operator} b;`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'BinaryExpression',
            operator,
            left: { type: 'Identifier', name: 'a' },
            right: { type: 'Identifier', name: 'b' },
          },
        },
      ])
    }
  })

  it('parses logical expressions', () => {
    for (const operator of ['&&', '||', '^^'] satisfies LogicalOperator[]) {
      expect(parse(`a ${operator} b;`).body).toStrictEqual<[ExpressionStatement]>([
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'LogicalExpression',
            operator,
            left: { type: 'Identifier', name: 'a' },
            right: { type: 'Identifier', name: 'b' },
          },
        },
      ])
    }
  })

  it('parses with grouping', () => {
    expect(parse('(1 + 2) * 3;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'BinaryExpression',
          operator: '*',
          left: {
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'Literal', value: '1' },
            right: { type: 'Literal', value: '2' },
          },
          right: { type: 'Literal', value: '3' },
        },
      },
    ])
  })

  it('parses conditional expressions', () => {
    expect(parse('test ? alternate : consequent;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'ConditionalExpression',
          test: { type: 'Identifier', name: 'test' },
          alternate: { type: 'Identifier', name: 'alternate' },
          consequent: { type: 'Identifier', name: 'consequent' },
        },
      },
    ])
  })

  it('parses call expressions', () => {
    expect(parse('main();').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'main' },
          arguments: [],
        },
      },
    ])

    expect(parse('all(true, false);').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'all' },
          arguments: [
            { type: 'Literal', value: 'true' },
            { type: 'Literal', value: 'false' },
          ],
        },
      },
    ])
  })

  it('parses member expressions', () => {
    expect(parse('foo.bar;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'foo' },
          property: { type: 'Identifier', name: 'bar' },
          computed: false,
        },
      },
    ])

    expect(parse('array[0];').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'array' },
          property: { type: 'Literal', value: '0' },
          computed: true,
        },
      },
    ])

    expect(parse('array.length();').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'array' },
          property: { type: 'CallExpression', callee: { type: 'Identifier', name: 'length' }, arguments: [] },
          computed: false,
        },
      },
    ])

    expect(parse('texture().rgb;').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'MemberExpression',
          object: { type: 'CallExpression', callee: { type: 'Identifier', name: 'texture' }, arguments: [] },
          property: { type: 'Identifier', name: 'rgb' },
          computed: false,
        },
      },
    ])
  })

  it('parses array expressions', () => {
    expect(parse('float[3](2.5, 7.0, 1.5);').body).toStrictEqual<[ExpressionStatement]>([
      {
        type: 'ExpressionStatement',
        expression: {
          elements: [
            {
              type: 'Literal',
              value: '2.5',
            },
            {
              type: 'Literal',
              value: '7.0',
            },
            {
              type: 'Literal',
              value: '1.5',
            },
          ],
          type: 'ArrayExpression',
          typeSpecifier: {
            dimensions: [
              {
                type: 'Literal',
                value: '3',
              },
            ],
            type: 'ArraySpecifier',
            typeSpecifier: {
              name: 'float',
              type: 'Identifier',
            },
          },
        },
      },
    ])
  })

  it('parses variable declarations', () => {
    expect(parse('uniform Type foo;').body).toStrictEqual<[VariableDeclaration]>([
      {
        declarations: [
          {
            id: {
              name: 'foo',
              type: 'Identifier',
            },
            init: null,
            layout: null,
            qualifiers: ['uniform'],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'Type',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])

    expect(parse('attribute vec4 position;').body).toStrictEqual<[VariableDeclaration]>([
      {
        declarations: [
          {
            id: {
              name: 'position',
              type: 'Identifier',
            },
            init: null,
            layout: null,
            qualifiers: ['attribute'],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'vec4',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])

    expect(parse('varying vec3 normal;').body).toStrictEqual<[VariableDeclaration]>([
      {
        declarations: [
          {
            id: {
              name: 'normal',
              type: 'Identifier',
            },
            init: null,
            layout: null,
            qualifiers: ['varying'],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'vec3',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])

    expect(parse('const vec4 foo = vec4(0, 0, 0, 0);').body).toStrictEqual<[VariableDeclaration]>([
      {
        declarations: [
          {
            id: {
              name: 'foo',
              type: 'Identifier',
            },
            init: {
              arguments: [
                {
                  type: 'Literal',
                  value: '0',
                },
                {
                  type: 'Literal',
                  value: '0',
                },
                {
                  type: 'Literal',
                  value: '0',
                },
                {
                  type: 'Literal',
                  value: '0',
                },
              ],
              callee: {
                name: 'vec4',
                type: 'Identifier',
              },
              type: 'CallExpression',
            },
            layout: null,
            qualifiers: ['const'],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'vec4',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])

    expect(parse('layout(location = 0, component = 1, column_major) flat in mat4 test;').body).toStrictEqual<
      [VariableDeclaration]
    >([
      {
        declarations: [
          {
            id: {
              name: 'test',
              type: 'Identifier',
            },
            init: null,
            layout: {
              column_major: true,
              component: '1',
              location: '0',
            },
            qualifiers: ['flat', 'in'],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'mat4',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])

    expect(parse('float foo = 0.0, bar = foo + 1.0, baz[3];').body).toStrictEqual<[VariableDeclaration]>([
      {
        declarations: [
          {
            id: {
              name: 'foo',
              type: 'Identifier',
            },
            init: {
              type: 'Literal',
              value: '0.0',
            },
            layout: null,
            qualifiers: [],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'float',
              type: 'Identifier',
            },
          },
          {
            id: {
              name: 'bar',
              type: 'Identifier',
            },
            init: {
              left: {
                name: 'foo',
                type: 'Identifier',
              },
              operator: '+',
              right: {
                type: 'Literal',
                value: '1.0',
              },
              type: 'BinaryExpression',
            },
            layout: null,
            qualifiers: [],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'float',
              type: 'Identifier',
            },
          },
          {
            id: {
              type: 'ArraySpecifier',
              typeSpecifier: {
                type: 'Identifier',
                name: 'baz',
              },
              dimensions: [
                {
                  type: 'Literal',
                  value: '3',
                },
              ],
            } satisfies ArraySpecifier as unknown as Identifier, // TODO: revisit VariableDeclarator AST
            init: null,
            layout: null,
            qualifiers: [],
            type: 'VariableDeclarator',
            typeSpecifier: {
              name: 'float',
              type: 'Identifier',
            },
          },
        ],
        type: 'VariableDeclaration',
      },
    ])
  })

  it('parses variable assignments', () => {
    expect(parse('foo = vec4(0, 0, 0, 0);').body).toMatchInlineSnapshot(`
      [
        {
          "expression": {
            "left": {
              "name": "foo",
              "type": "Identifier",
            },
            "operator": "=",
            "right": {
              "arguments": [
                {
                  "type": "Literal",
                  "value": "0",
                },
                {
                  "type": "Literal",
                  "value": "0",
                },
                {
                  "type": "Literal",
                  "value": "0",
                },
                {
                  "type": "Literal",
                  "value": "0",
                },
              ],
              "callee": {
                "name": "vec4",
                "type": "Identifier",
              },
              "type": "CallExpression",
            },
            "type": "AssignmentExpression",
          },
          "type": "ExpressionStatement",
        },
      ]
    `)
  })

  it('parses struct declarations', () => {
    expect(parse('struct foo { const bool bar = true; };').body).toStrictEqual<[StructDeclaration]>([
      {
        id: {
          name: 'foo',
          type: 'Identifier',
        },
        members: [
          {
            declarations: [
              {
                id: {
                  name: 'bar',
                  type: 'Identifier',
                },
                init: {
                  type: 'Literal',
                  value: 'true',
                },
                layout: null,
                qualifiers: ['const'],
                type: 'VariableDeclarator',
                typeSpecifier: {
                  name: 'bool',
                  type: 'Identifier',
                },
              },
            ],
            type: 'VariableDeclaration',
          },
        ],
        type: 'StructDeclaration',
      },
    ])

    expect(parse('struct a {} b;').body).toStrictEqual<[StructDeclaration, VariableDeclaration]>([
      {
        type: 'StructDeclaration',
        id: {
          type: 'Identifier',
          name: 'a',
        },
        members: [],
      },
      {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            layout: null,
            qualifiers: [],
            id: {
              type: 'Identifier',
              name: 'b',
            },
            typeSpecifier: {
              type: 'Identifier',
              name: 'a',
            },
            init: null,
          },
        ],
      },
    ])
  })

  it('parses function declarations', () => {
    expect(parse('void main();').body).toStrictEqual<[FunctionDeclaration]>([
      {
        body: null,
        id: {
          name: 'main',
          type: 'Identifier',
        },
        params: [],
        qualifiers: [],
        type: 'FunctionDeclaration',
        typeSpecifier: {
          name: 'void',
          type: 'Identifier',
        },
      },
    ])

    expect(parse('highp vec4 main(const bool enabled, bool disabled) {}').body).toStrictEqual<[FunctionDeclaration]>([
      {
        body: {
          body: [],
          type: 'BlockStatement',
        },
        id: {
          name: 'main',
          type: 'Identifier',
        },
        params: [
          {
            id: {
              name: 'enabled',
              type: 'Identifier',
            },
            qualifiers: ['const'],
            type: 'FunctionParameter',
            typeSpecifier: {
              name: 'bool',
              type: 'Identifier',
            },
          },
          {
            id: {
              name: 'disabled',
              type: 'Identifier',
            },
            qualifiers: [],
            type: 'FunctionParameter',
            typeSpecifier: {
              name: 'bool',
              type: 'Identifier',
            },
          },
        ],
        qualifiers: ['highp'],
        type: 'FunctionDeclaration',
        typeSpecifier: {
          name: 'vec4',
          type: 'Identifier',
        },
      },
    ])
  })

  it('parses continue statements', () => {
    expect(parse('continue;').body).toStrictEqual<[ContinueStatement]>([
      {
        type: 'ContinueStatement',
      },
    ])
  })

  it('parses break statements', () => {
    expect(parse('break;').body).toStrictEqual<[BreakStatement]>([
      {
        type: 'BreakStatement',
      },
    ])
  })

  it('parses discard statements', () => {
    expect(parse('discard;').body).toStrictEqual<[DiscardStatement]>([
      {
        type: 'DiscardStatement',
      },
    ])
  })

  it('parses return statements', () => {
    expect(parse('return;').body).toStrictEqual<[ReturnStatement]>([
      {
        argument: null,
        type: 'ReturnStatement',
      },
    ])
    expect(parse('return 0;').body).toStrictEqual<[ReturnStatement]>([
      {
        argument: {
          type: 'Literal',
          value: '0',
        },
        type: 'ReturnStatement',
      },
    ])
  })

  it('parses if statements', () => {
    expect(parse('if (true) {} else if (false) {} else {}').body).toStrictEqual<[IfStatement]>([
      {
        alternate: {
          alternate: {
            body: [],
            type: 'BlockStatement',
          },
          consequent: {
            body: [],
            type: 'BlockStatement',
          },
          test: {
            type: 'Literal',
            value: 'false',
          },
          type: 'IfStatement',
        },
        consequent: {
          body: [],
          type: 'BlockStatement',
        },
        test: {
          type: 'Literal',
          value: 'true',
        },
        type: 'IfStatement',
      },
    ])

    expect(parse('if (true) a = 1;').body).toStrictEqual<[IfStatement]>([
      {
        alternate: null,
        consequent: {
          expression: {
            left: {
              name: 'a',
              type: 'Identifier',
            },
            operator: '=',
            right: {
              type: 'Literal',
              value: '1',
            },
            type: 'AssignmentExpression',
          },
          type: 'ExpressionStatement',
        },
        test: {
          type: 'Literal',
          value: 'true',
        },
        type: 'IfStatement',
      },
    ])
  })

  it('parses while statements', () => {
    expect(parse('while(true) {}').body).toStrictEqual<[WhileStatement]>([
      {
        body: {
          body: [],
          type: 'BlockStatement',
        },
        test: {
          type: 'Literal',
          value: 'true',
        },
        type: 'WhileStatement',
      },
    ])
  })

  it('parses for statements', () => {
    expect(parse('for (int i = 0; i < 1; i++) {}').body).toStrictEqual<[ForStatement]>([
      {
        body: {
          body: [],
          type: 'BlockStatement',
        },
        init: {
          declarations: [
            {
              id: {
                name: 'i',
                type: 'Identifier',
              },
              init: {
                type: 'Literal',
                value: '0',
              },
              layout: null,
              qualifiers: [],
              type: 'VariableDeclarator',
              typeSpecifier: {
                name: 'int',
                type: 'Identifier',
              },
            },
          ],
          type: 'VariableDeclaration',
        },
        test: {
          left: {
            name: 'i',
            type: 'Identifier',
          },
          operator: '<',
          right: {
            type: 'Literal',
            value: '1',
          },
          type: 'BinaryExpression',
        },
        type: 'ForStatement',
        update: {
          argument: {
            name: 'i',
            type: 'Identifier',
          },
          operator: '++',
          prefix: false,
          type: 'UpdateExpression',
        },
      },
    ])
  })

  it('parses do-while statements', () => {
    expect(parse('do {} while(true);').body).toStrictEqual<[DoWhileStatement]>([
      {
        body: {
          body: [],
          type: 'BlockStatement',
        },
        test: {
          type: 'Literal',
          value: 'true',
        },
        type: 'DoWhileStatement',
      },
    ])
  })

  it('parses switch statements', () => {
    expect(parse('switch(true) { case 0: break; default: discard; }').body).toStrictEqual<[SwitchStatement]>([
      {
        cases: [
          {
            consequent: [
              {
                type: 'BreakStatement',
              },
            ],
            test: {
              type: 'Literal',
              value: '0',
            },
            type: 'SwitchCase',
          },
          {
            consequent: [
              {
                type: 'DiscardStatement',
              },
            ],
            test: null,
            type: 'SwitchCase',
          },
        ],
        discriminant: {
          type: 'Literal',
          value: 'true',
        },
        type: 'SwitchStatement',
      },
    ])
  })

  it('parses precision statements', () => {
    expect(parse('precision highp float;').body).toStrictEqual<[PrecisionQualifierStatement]>([
      {
        precision: 'highp',
        type: 'PrecisionQualifierStatement',
        typeSpecifier: {
          name: 'float',
          type: 'Identifier',
        },
      },
    ])
  })

  it('parses invariant statements', () => {
    expect(parse('invariant position;').body).toStrictEqual<[InvariantQualifierStatement]>([
      {
        type: 'InvariantQualifierStatement',
        typeSpecifier: {
          name: 'position',
          type: 'Identifier',
        },
      },
    ])
  })

  it('parses preprocessor statements', () => {
    expect(parse('#\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: '',
        type: 'PreprocessorStatement',
        value: null,
      },
    ])

    expect(parse('#define TEST 1\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'define',
        type: 'PreprocessorStatement',
        value: [
          {
            name: 'TEST',
            type: 'Identifier',
          },
          {
            type: 'Literal',
            value: '1',
          },
        ],
      },
    ])

    expect(parse('#extension all: disable\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'extension',
        type: 'PreprocessorStatement',
        value: [
          {
            name: 'all',
            type: 'Identifier',
          },
          {
            name: 'disable',
            type: 'Identifier',
          },
        ],
      },
    ])

    expect(parse('#pragma optimize(on)\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'pragma',
        type: 'PreprocessorStatement',
        value: [
          {
            arguments: [
              {
                name: 'on',
                type: 'Identifier',
              },
            ],
            callee: {
              name: 'optimize',
              type: 'Identifier',
            },
            type: 'CallExpression',
          },
        ],
      },
    ])

    expect(parse('#include <chunk>\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'include',
        type: 'PreprocessorStatement',
        value: [
          {
            name: 'chunk',
            type: 'Identifier',
          },
        ],
      },
    ])

    expect(parse('#ifdef TEST\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'ifdef',
        type: 'PreprocessorStatement',
        value: [
          {
            name: 'TEST',
            type: 'Identifier',
          },
        ],
      },
    ])

    expect(parse('#endif\n').body).toStrictEqual<[PreprocessorStatement]>([
      {
        name: 'endif',
        type: 'PreprocessorStatement',
        value: null,
      },
    ])
  })
})
