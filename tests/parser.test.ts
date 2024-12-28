import { describe, it, expect } from 'vitest'
import {
  parse,
  Identifier,
  Literal,
  Type,
  UnaryExpression,
  BinaryExpression,
  TernaryExpression,
  CallExpression,
  MemberExpression,
  VariableDeclaration,
  VariableDeclarator,
  StructDeclaration,
  FunctionDeclaration,
  BlockStatement,
  ContinueStatement,
  BreakStatement,
  DiscardStatement,
  ReturnStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  DoWhileStatement,
  SwitchStatement,
  SwitchCase,
  PrecisionStatement,
  ArrayExpression,
  PreprocessorStatement,
} from 'shaderkit'

describe('parser', () => {
  it('parses identifiers', () => {
    expect(parse('identifier;')).toStrictEqual([new Identifier('identifier')])
    expect(parse('ident\\\nifier;')).toStrictEqual([new Identifier('identifier')])
  })

  it('parses literals', () => {
    for (const value of ['true', 'false', '0', '0.0']) {
      expect(parse(`${value};`)).toStrictEqual([new Literal(value)])
    }
  })

  it('parses unary expressions', () => {
    for (const operator of ['+', '-', '~', '!']) {
      expect(parse(`${operator}identifier;`)).toStrictEqual([
        new UnaryExpression(operator, null, new Identifier('identifier')),
      ])
    }

    for (const operator of ['++', '--']) {
      expect(parse(`identifier${operator};`)).toStrictEqual([
        new UnaryExpression(operator, new Identifier('identifier'), null),
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
      '&&',
      '||',
      '^^',
      '-',
      '*',
      '!=',
      '+',
      '%',
      '<<',
      '>>',
    ]) {
      expect(parse(`a ${operator} b;`)).toStrictEqual([
        new BinaryExpression(operator, new Identifier('a'), new Identifier('b')),
      ])
    }
  })

  it('parses with grouping', () => {
    expect(parse('(1 + 2) * 3;')).toStrictEqual([
      new BinaryExpression('*', new BinaryExpression('+', new Literal('1'), new Literal('2')), new Literal('3')),
    ])
  })

  it('parses ternary expressions', () => {
    expect(parse('test ? consequent : alternate;')).toStrictEqual([
      new TernaryExpression(new Identifier('test'), new Identifier('consequent'), new Identifier('alternate')),
    ])
  })

  it('parses call expressions', () => {
    expect(parse('main();')).toStrictEqual([new CallExpression(new Identifier('main'), [])])

    expect(parse('all(true, false);')).toStrictEqual([
      new CallExpression(new Identifier('all'), [new Literal('true'), new Literal('false')]),
    ])
  })

  it('parses member expressions', () => {
    expect(parse('foo.bar;')).toStrictEqual([new MemberExpression(new Identifier('foo'), new Identifier('bar'))])

    expect(parse('array.length();')).toStrictEqual([
      new MemberExpression(new Identifier('array'), new CallExpression(new Identifier('length'), [])),
    ])

    expect(parse('texture().rgb;')).toStrictEqual([
      new MemberExpression(new CallExpression(new Identifier('texture'), []), new Identifier('rgb')),
    ])
  })

  it('parses variable declarations', () => {
    expect(parse('uniform Type foo;')).toStrictEqual([
      new VariableDeclaration(null, ['uniform'], null, new Type('Type', null), [new VariableDeclarator('foo', null)]),
    ])

    expect(parse('const vec4 foo = vec4(0, 0, 0, 0);')).toStrictEqual([
      new VariableDeclaration(null, ['const'], null, new Type('vec4', null), [
        new VariableDeclarator(
          'foo',
          new CallExpression(new Identifier('vec4'), [
            new Literal('0'),
            new Literal('0'),
            new Literal('0'),
            new Literal('0'),
          ]),
        ),
      ]),
    ])

    expect(parse('layout(location = 0, component = 1, column_major) flat in mat4 test;')).toStrictEqual([
      new VariableDeclaration(
        {
          location: '0',
          component: '1',
          column_major: true,
        },
        ['flat', 'in'],
        null,
        new Type('mat4', null),
        [new VariableDeclarator('test', null)],
      ),
    ])

    expect(parse('float foo = 0.0, bar = foo + 1.0, baz[3];')).toStrictEqual([
      new VariableDeclaration(null, [], null, new Type('float', null), [
        new VariableDeclarator('foo', new Literal('0.0')),
        new VariableDeclarator('bar', new BinaryExpression('+', new Identifier('foo'), new Literal('1.0'))),
        new VariableDeclarator('baz', new ArrayExpression(new Type('float', [new Literal('3')]), [])),
      ]),
    ])
  })

  it('parses struct declarations', () => {
    expect(parse('struct foo { const bool bar = true; };')).toStrictEqual([
      new StructDeclaration('foo', [
        new VariableDeclaration(null, ['const'], null, new Type('bool', null), [
          new VariableDeclarator('bar', new Literal('true')),
        ]),
      ]),
    ])
  })

  it('parses function declarations', () => {
    expect(parse('void main();')).toStrictEqual([new FunctionDeclaration('main', new Type('void', null), [], [], null)])

    expect(parse('highp vec4 main(const bool enabled, bool disabled) {}')).toStrictEqual([
      new FunctionDeclaration(
        'main',
        new Type('vec4', null),
        ['highp'],
        [
          new VariableDeclaration(null, ['const'], null, new Type('bool', null), [
            new VariableDeclarator('enabled', null),
          ]),
          new VariableDeclaration(null, [], null, new Type('bool', null), [new VariableDeclarator('disabled', null)]),
        ],
        new BlockStatement([]),
      ),
    ])
  })

  it('parses continue statements', () => {
    expect(parse('continue;')).toStrictEqual([new ContinueStatement()])
  })

  it('parses break statements', () => {
    expect(parse('break;')).toStrictEqual([new BreakStatement()])
  })

  it('parses discard statements', () => {
    expect(parse('discard;')).toStrictEqual([new DiscardStatement()])
  })

  it('parses return statements', () => {
    expect(parse('return;')).toStrictEqual([new ReturnStatement(null)])
    expect(parse('return 0;')).toStrictEqual([new ReturnStatement(new Literal('0'))])
  })

  it('parses if statements', () => {
    expect(parse('if (true) {} else if (false) {} else {}')).toStrictEqual([
      new IfStatement(
        new Literal('true'),
        new BlockStatement([]),
        new IfStatement(new Literal('false'), new BlockStatement([]), new BlockStatement([])),
      ),
    ])
  })

  it('parses while statements', () => {
    expect(parse('while(true) {}')).toStrictEqual([new WhileStatement(new Literal('true'), new BlockStatement([]))])
  })

  it('parses for statements', () => {
    expect(parse('for (int i = 0; i < 1; i++) {}')).toStrictEqual([
      new ForStatement(
        new VariableDeclaration(null, [], null, new Type('int', null), [new VariableDeclarator('i', new Literal('0'))]),
        new BinaryExpression('<', new Identifier('i'), new Literal('1')),
        new UnaryExpression('++', new Identifier('i'), null),
        new BlockStatement([]),
      ),
    ])
  })

  it('parses do-while statements', () => {
    expect(parse('do {} while(true);')).toStrictEqual([
      new DoWhileStatement(new Literal('true'), new BlockStatement([])),
    ])
  })

  it('parses switch statements', () => {
    expect(parse('switch(true) { case 0: break; default: discard; }')).toStrictEqual([
      new SwitchStatement(new Literal('true'), [
        new SwitchCase(new Literal('0'), [new BreakStatement()]),
        new SwitchCase(null, [new DiscardStatement()]),
      ]),
    ])
  })

  it('parses precision statements', () => {
    expect(parse('precision highp float;')).toStrictEqual([new PrecisionStatement('highp', new Type('float', null))])
  })

  it('parses array expressions', () => {
    expect(parse('float[3](2.5, 7.0, 1.5);')).toStrictEqual([
      new ArrayExpression(new Type('float', [new Literal('3')]), [
        new Literal('2.5'),
        new Literal('7.0'),
        new Literal('1.5'),
      ]),
    ])
  })

  it('parses preprocessor statements', () => {
    expect(parse('#\n')).toStrictEqual([new PreprocessorStatement('', null)])

    expect(parse('#define TEST 1\n')).toStrictEqual([
      new PreprocessorStatement('define', [new Identifier('TEST'), new Literal('1')]),
    ])

    expect(parse('#extension all: disable\n')).toStrictEqual([
      new PreprocessorStatement('extension', [new Identifier('all'), new Identifier('disable')]),
    ])

    expect(parse('#pragma optimize(on)\n')).toStrictEqual([
      new PreprocessorStatement('pragma', [new CallExpression(new Identifier('optimize'), [new Identifier('on')])]),
    ])

    expect(parse('#include <chunk>\n')).toStrictEqual([new PreprocessorStatement('include', [new Identifier('chunk')])])

    expect(parse('#ifdef TEST\n')).toStrictEqual([new PreprocessorStatement('ifdef', [new Identifier('TEST')])])

    expect(parse('#endif\n')).toStrictEqual([new PreprocessorStatement('endif', null)])
  })
})
