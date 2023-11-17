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
} from 'shaderkit'

describe('parser', () => {
  it('parses identifiers', () => {
    const identifier = parse('identifier')[0] as Identifier
    expect(identifier).toBeInstanceOf(Identifier)
    expect(identifier.value).toBe('identifier')
  })

  it('parses literals', () => {
    for (const value of ['true', 'false', '0', '0.0']) {
      const literal = parse(value)[0] as Literal
      expect(literal).toBeInstanceOf(Literal)
      expect(literal.value).toBe(value)
    }
  })

  it('parses unary expressions', () => {
    for (const operator of ['+', '-', '~', '!', '++', '--']) {
      const left = parse(`0${operator}`)[0] as UnaryExpression
      expect(left).toBeInstanceOf(UnaryExpression)
      expect(left.operator).toBe(operator)
      expect(left.left).toBeInstanceOf(Literal)
      expect((left.left as Literal).value).toBe('0')

      const right = parse(`${operator}1`)[0] as UnaryExpression
      expect(right).toBeInstanceOf(UnaryExpression)
      expect(right.operator).toBe(operator)
      expect(right.right).toBeInstanceOf(Literal)
      expect((right.right as Literal).value).toBe('1')
    }
  })

  it('parses binary expressions', () => {
    const expression = parse('0 == 1')[0] as BinaryExpression
    expect(expression).toBeInstanceOf(BinaryExpression)
    expect(expression.operator).toBe('==')
    expect(expression.left).toBeInstanceOf(Literal)
    expect((expression.left as Literal).value).toBe('0')
    expect(expression.right).toBeInstanceOf(Literal)
    expect((expression.right as Literal).value).toBe('1')
  })

  it('parses ternary expressions', () => {
    const expression = parse('true ? 0 : 1')[0] as TernaryExpression
    expect(expression).toBeInstanceOf(TernaryExpression)
    expect(expression.test).toBeInstanceOf(Literal)
    expect((expression.test as Literal).value).toBe('true')
    expect(expression.consequent).toBeInstanceOf(Literal)
    expect((expression.consequent as Literal).value).toBe('0')
    expect(expression.alternate).toBeInstanceOf(Literal)
    expect((expression.alternate as Literal).value).toBe('1')
  })

  it('parses call expressions', () => {
    {
      const expression = parse('main()')[0] as CallExpression
      expect(expression).toBeInstanceOf(CallExpression)
      expect(expression.callee).toBeInstanceOf(Identifier)
      expect((expression.callee as Identifier).value).toBe('main')
      expect(expression.args.length).toBe(0)
    }

    {
      const expression = parse('all(true, false)')[0] as CallExpression
      expect(expression).toBeInstanceOf(CallExpression)
      expect(expression.callee).toBeInstanceOf(Identifier)
      expect((expression.callee as Identifier).value).toBe('all')
      expect(expression.args.length).toBe(2)
      expect(expression.args[0]).toBeInstanceOf(Literal)
      expect((expression.args[0] as Literal).value).toBe('true')
      expect(expression.args[1]).toBeInstanceOf(Literal)
      expect((expression.args[1] as Literal).value).toBe('false')
    }
  })

  it('parses member expressions', () => {
    {
      const expression = parse('foo.bar')[0] as MemberExpression
      expect(expression).toBeInstanceOf(MemberExpression)
      expect(expression.object).toBeInstanceOf(Identifier)
      expect((expression.object as Identifier).value).toBe('foo')
      expect(expression.property).toBeInstanceOf(Identifier)
      expect((expression.property as Identifier).value).toBe('bar')
    }

    {
      const expression = parse('array.length()')[0] as CallExpression
      expect(expression).toBeInstanceOf(CallExpression)
      expect(expression.callee).toBeInstanceOf(MemberExpression)
      expect((expression.callee as MemberExpression).object).toBeInstanceOf(Identifier)
      expect(((expression.callee as MemberExpression).object as Identifier).value).toBe('array')
      expect((expression.callee as MemberExpression).property).toBeInstanceOf(Identifier)
      expect(((expression.callee as MemberExpression).property as Identifier).value).toBe('length')
      expect(expression.args.length).toBe(0)
    }
  })

  it('parses variable declarations', () => {
    const statement = parse('const vec4 foo = vec4(0, 0, 0, 0);')[0] as VariableDeclaration
    expect(statement).toBeInstanceOf(VariableDeclaration)
    expect(statement.name).toBe('foo')
    expect(statement.type).toBeInstanceOf(Type)
    expect((statement.type as Type).name).toBe('vec4')
    expect((statement.type as Type).parameters).toBe(null)
    expect(statement.qualifiers.length).toBe(1)
    expect(statement.qualifiers[0]).toBe('const')
    expect(statement.value).toBeInstanceOf(CallExpression)

    // TODO: comma-separated list
  })

  it('parses struct declarations', () => {
    const statement = parse('struct foo { const bool bar = true; };')[0] as StructDeclaration
    expect(statement).toBeInstanceOf(StructDeclaration)
    expect(statement.name).toBe('foo')
    expect(statement.members.length).toBe(1)
    expect(statement.members[0].name).toBe('bar')
    expect(statement.members[0].type).toBeInstanceOf(Type)
    expect((statement.members[0].type as Type).name).toBe('bool')
    expect((statement.members[0].type as Type).parameters).toBe(null)
    expect(statement.members[0].qualifiers.length).toBe(1)
    expect(statement.members[0].qualifiers[0]).toBe('const')
    expect(statement.members[0].value).toBeInstanceOf(Literal)
    expect((statement.members[0].value as Literal).value).toBe('true')
  })

  it('parses function declarations', () => {
    {
      const statement = parse('void main();')[0] as FunctionDeclaration
      expect(statement).toBeInstanceOf(FunctionDeclaration)
      expect(statement.name).toBe('main')
      expect(statement.type).toBeInstanceOf(Type)
      expect((statement.type as Type).name).toBe('void')
      expect((statement.type as Type).parameters).toBe(null)
      expect(statement.args.length).toBe(0)
      expect(statement.body).toBe(null)
    }

    {
      const statement = parse('void main(const bool enabled) {}')[0] as FunctionDeclaration
      expect(statement).toBeInstanceOf(FunctionDeclaration)
      expect(statement.name).toBe('main')
      expect(statement.type).toBeInstanceOf(Type)
      expect((statement.type as Type).name).toBe('void')
      expect((statement.type as Type).parameters).toBe(null)
      expect(statement.args[0]).toBeInstanceOf(VariableDeclaration)
      expect((statement.args[0] as VariableDeclaration).name).toBe('enabled')
      expect((statement.args[0] as VariableDeclaration).qualifiers.length).toBe(1)
      expect((statement.args[0] as VariableDeclaration).qualifiers[0]).toBe('const')
      expect((statement.args[0] as VariableDeclaration).type).toBeInstanceOf(Type)
      expect(((statement.args[0] as VariableDeclaration).type as Type).name).toBe('bool')
      expect(((statement.args[0] as VariableDeclaration).type as Type).parameters).toBe(null)
      expect(statement.body).toBeInstanceOf(BlockStatement)
      expect((statement.body as BlockStatement).body.length).toBe(0)
    }
  })

  it('parses continue statements', () => {
    const statement = parse('continue;')[0] as ContinueStatement
    expect(statement).toBeInstanceOf(ContinueStatement)
  })

  it('parses break statements', () => {
    const statement = parse('break;')[0] as BreakStatement
    expect(statement).toBeInstanceOf(BreakStatement)
  })

  it('parses discard statements', () => {
    const statement = parse('discard;')[0] as DiscardStatement
    expect(statement).toBeInstanceOf(DiscardStatement)
  })

  it('parses return statements', () => {
    {
      const statement = parse('return;')[0] as ReturnStatement
      expect(statement).toBeInstanceOf(ReturnStatement)
      expect(statement.argument).toBe(null)
    }

    {
      const statement = parse('return 0;')[0] as ReturnStatement
      expect(statement).toBeInstanceOf(ReturnStatement)
      expect(statement.argument).toBeInstanceOf(Literal)
      expect((statement.argument as Literal).value).toBe('0')
    }
  })

  it('parses if statements', () => {
    const statement = parse('if (true) {} else if (false) {} else {}')[0] as IfStatement
    expect(statement).toBeInstanceOf(IfStatement)
    expect(statement.test).toBeInstanceOf(Literal)
    expect((statement.test as Literal).value).toBe('true')
    expect(statement.consequent).toBeInstanceOf(BlockStatement)
    expect((statement.consequent as BlockStatement).body.length).toBe(0)
    expect(statement.alternate).toBeInstanceOf(IfStatement)
    expect((statement.alternate as IfStatement).test).toBeInstanceOf(Literal)
    expect(((statement.alternate as IfStatement).test as Literal).value).toBe('false')
    expect((statement.alternate as IfStatement).consequent).toBeInstanceOf(BlockStatement)
    expect(((statement.alternate as IfStatement).consequent as BlockStatement).body.length).toBe(0)
    expect((statement.alternate as IfStatement).alternate).toBeInstanceOf(BlockStatement)
    expect(((statement.alternate as IfStatement).alternate as BlockStatement).body.length).toBe(0)
  })

  it('parses while statements', () => {
    const statement = parse('while(true) {}')[0] as WhileStatement
    expect(statement).toBeInstanceOf(WhileStatement)
    expect(statement.test).toBeInstanceOf(Literal)
    expect((statement.test as Literal).value).toBe('true')
    expect(statement.body).toBeInstanceOf(BlockStatement)
    expect((statement.body as BlockStatement).body.length).toBe(0)
  })

  it('parses for statements', () => {
    const statement = parse('for (int i = 0; i < 1; i++) {}')[0] as ForStatement
    expect(statement).toBeInstanceOf(ForStatement)
    expect(statement.init).toBeInstanceOf(VariableDeclaration)
    expect((statement.init as VariableDeclaration).name).toBe('i')
    expect((statement.init as VariableDeclaration).type).toBeInstanceOf(Type)
    expect(((statement.init as VariableDeclaration).type as Type).name).toBe('int')
    expect(((statement.init as VariableDeclaration).type as Type).parameters).toBe(null)
    expect((statement.init as VariableDeclaration).value).toBeInstanceOf(Literal)
    expect(((statement.init as VariableDeclaration).value as Literal).value).toBe('0')
    expect((statement.init as VariableDeclaration).qualifiers.length).toBe(0)
    expect(statement.test).toBeInstanceOf(BinaryExpression)
    expect((statement.test as BinaryExpression).operator).toBe('<')
    expect((statement.test as BinaryExpression).left).toBeInstanceOf(Identifier)
    expect(((statement.test as BinaryExpression).left as Identifier).value).toBe('i')
    expect((statement.test as BinaryExpression).right).toBeInstanceOf(Literal)
    expect(((statement.test as BinaryExpression).right as Literal).value).toBe('1')
    expect(statement.update).toBeInstanceOf(UnaryExpression)
    expect((statement.update as UnaryExpression).operator).toBe('++')
    expect((statement.update as UnaryExpression).left).toBeInstanceOf(Identifier)
    expect(((statement.update as UnaryExpression).left as Identifier).value).toBe('i')
    expect(statement.body).toBeInstanceOf(BlockStatement)
    expect((statement.body as BlockStatement).body.length).toBe(0)
  })

  it('parses do-while statements', () => {
    const statement = parse('do {} while(true);')[0] as DoWhileStatement
    expect(statement).toBeInstanceOf(DoWhileStatement)
    expect(statement.body).toBeInstanceOf(BlockStatement)
    expect((statement.body as BlockStatement).body.length).toBe(0)
    expect(statement.test).toBeInstanceOf(Literal)
    expect((statement.test as Literal).value).toBe('true')
  })

  it('parses switch statements', () => {
    const statement = parse('switch(true) { case 0: break; default: discard; }')[0] as SwitchStatement
    expect(statement).toBeInstanceOf(SwitchStatement)
    expect(statement.discriminant).toBeInstanceOf(Literal)
    expect((statement.discriminant as Literal).value).toBe('true')
    expect(statement.cases.length).toBe(2)
    expect(statement.cases[0]).toBeInstanceOf(SwitchCase)
    expect((statement.cases[0] as SwitchCase).test).toBeInstanceOf(Literal)
    expect(((statement.cases[0] as SwitchCase).test as Literal).value).toBe('0')
    expect((statement.cases[0] as SwitchCase).consequent.length).toBe(1)
    expect((statement.cases[0] as SwitchCase).consequent[0]).toBeInstanceOf(BreakStatement)
    expect(statement.cases[1]).toBeInstanceOf(SwitchCase)
    expect((statement.cases[1] as SwitchCase).test).toBe(null)
    expect((statement.cases[1] as SwitchCase).consequent.length).toBe(1)
    expect((statement.cases[1] as SwitchCase).consequent[0]).toBeInstanceOf(DiscardStatement)
  })
})
