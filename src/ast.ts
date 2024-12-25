export class Literal {
  constructor(public value: string /*| number | boolean*/) {}
}

export class Identifier {
  constructor(public value: string) {}
}

export class Type {
  constructor(public name: string, public parameters: (Type | Literal | Identifier)[] | null) {}
}

export class VariableDeclarator {
  constructor(public name: string, public value: AST | null) {}
}

export class VariableDeclaration {
  constructor(
    public layout: Record<string, string | boolean> | null,
    public qualifiers: string[],
    public kind: 'var' | 'let' | 'const' | null,
    public type: Type | Identifier,
    public declarations: VariableDeclarator[],
  ) {}
}

export class StructDeclaration {
  constructor(public name: string, public members: VariableDeclaration[]) {}
}

export class FunctionDeclaration {
  constructor(
    public name: string,
    public type: Type | Identifier,
    public qualifiers: string[],
    public args: VariableDeclaration[],
    public body: BlockStatement | null,
  ) {}
}

export class UnaryExpression {
  constructor(operator: string, left: AST, right: null)
  constructor(operator: string, left: null, right: AST)
  constructor(public operator: string, public left: AST | null, public right: AST | null) {}
}

export class BinaryExpression {
  constructor(public operator: string, public left: AST, public right: AST) {}
}

export class TernaryExpression {
  constructor(public test: AST, public consequent: AST, public alternate: AST) {}
}

export class CallExpression {
  constructor(public callee: AST, public args: AST[]) {}
}

export class MemberExpression {
  constructor(public object: AST, public property: AST) {}
}

export class ArrayExpression {
  constructor(public type: Type, public members: AST[]) {}
}

export class BlockStatement {
  constructor(public body: AST[]) {}
}

export class IfStatement {
  constructor(public test: AST, public consequent: AST, public alternate: AST | null) {}
}

export class ForStatement {
  constructor(public init: AST | null, public test: AST | null, public update: AST | null, public body: AST) {}
}

export class WhileStatement {
  constructor(public test: AST, public body: AST) {}
}

export class DoWhileStatement {
  constructor(public test: AST, public body: AST) {}
}

export class SwitchCase {
  constructor(public test: AST | null, public consequent: AST[]) {}
}

export class SwitchStatement {
  constructor(public discriminant: AST, public cases: SwitchCase[]) {}
}

export class ReturnStatement {
  constructor(public argument: Literal | Identifier | UnaryExpression | null) {}
}

export class PreprocessorStatement {
  constructor(public name: string, public value: AST[] | null) {}
}

export class PrecisionStatement {
  constructor(public precision: 'lowp' | 'mediump' | 'highp', public type: Type) {}
}

export class ContinueStatement {}

export class BreakStatement {}

export class DiscardStatement {}

export type AST =
  | Literal
  | Identifier
  | Type
  | VariableDeclarator
  | VariableDeclaration
  | StructDeclaration
  | FunctionDeclaration
  | UnaryExpression
  | BinaryExpression
  | TernaryExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression
  | BlockStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | DoWhileStatement
  | SwitchCase
  | SwitchStatement
  | ReturnStatement
  | PreprocessorStatement
  | PrecisionStatement
  | ContinueStatement
  | BreakStatement
  | DiscardStatement
