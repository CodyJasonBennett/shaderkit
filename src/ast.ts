export abstract class AST {}

export class Literal extends AST {
  constructor(public value: string | number | boolean) {
    super()
  }
}

export class Identifier extends AST {
  constructor(public value: string) {
    super()
  }
}

export class VariableDeclaration extends AST {
  constructor(public name: string, public type: AST, public value: AST | null, public qualifiers: AST[]) {
    super()
  }
}

export class BlockStatement extends AST {
  constructor(public body: AST[]) {
    super()
  }
}

export class FunctionDeclaration extends AST {
  constructor(
    public name: string,
    public type: AST | null,
    public args: VariableDeclaration[],
    public body: BlockStatement,
  ) {
    super()
  }
}

export class CallExpression extends AST {
  constructor(public callee: AST, public args: AST[]) {
    super()
  }
}

export class MemberExpression extends AST {
  constructor(public object: AST, public property: AST) {
    super()
  }
}

export class ArrayExpression extends AST {
  constructor(public members: AST[]) {
    super()
  }
}

export class IfStatement extends AST {
  constructor(public test: AST, public consequent: AST, public alternate: AST | null) {
    super()
  }
}

export class WhileStatement extends AST {
  constructor(public test: AST, public body: AST) {
    super()
  }
}

export class ForStatement extends AST {
  constructor(public init: AST | null, public test: AST | null, public update: AST | null, public body: AST) {
    super()
  }
}

export class DoWhileStatement extends AST {
  constructor(public test: AST, public body: AST) {
    super()
  }
}

export class SwitchCase extends AST {
  constructor(public test: AST | null, public consequent: AST[]) {
    super()
  }
}

export class SwitchStatement extends AST {
  constructor(public discriminant: AST, public cases: SwitchCase[]) {
    super()
  }
}

export class StructDeclaration extends AST {
  constructor(public name: string, public members: VariableDeclaration[]) {
    super()
  }
}

export class UnaryExpression extends AST {
  constructor(public operator: string, public argument: AST) {
    super()
  }
}

export class BinaryExpression extends AST {
  constructor(public operator: string, public left: AST, public right: AST) {
    super()
  }
}

export class TernaryExpression extends AST {
  constructor(public test: AST, public consequent: AST, public alternate: AST) {
    super()
  }
}

export class ReturnStatement extends AST {
  constructor(public argument: Literal | Identifier | UnaryExpression | null) {
    super()
  }
}

export class ContinueStatement extends AST {}

export class BreakStatement extends AST {}

export class DiscardStatement extends AST {}
