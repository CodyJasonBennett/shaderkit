export abstract class Node {}

export class Literal extends Node {
  constructor(public value: string /*| number | boolean*/) {
    super()
  }
}

export class Identifier extends Node {
  constructor(public value: string) {
    super()
  }
}

export class BlockStatement extends Node {
  constructor(public body: Node[]) {
    super()
  }
}

export class Type extends Node {
  constructor(public name: string, public parameters: (Type | Literal | Identifier)[] | null) {
    super()
  }
}

export class VariableDeclaration extends Node {
  constructor(
    public name: string,
    public type: Type | Identifier,
    public value: Node | null,
    public qualifiers: Node[],
  ) {
    super()
  }
}

export class FunctionDeclaration extends Node {
  constructor(
    public name: string,
    public type: Type | Identifier,
    public args: VariableDeclaration[],
    public body: BlockStatement | null,
  ) {
    super()
  }
}

export class CallExpression extends Node {
  constructor(public callee: Node, public args: Node[]) {
    super()
  }
}

export class MemberExpression extends Node {
  constructor(public object: Node, public property: Node) {
    super()
  }
}

export class ArrayExpression extends Node {
  constructor(public members: Node[]) {
    super()
  }
}

export class IfStatement extends Node {
  constructor(public test: Node, public consequent: Node, public alternate: Node | null) {
    super()
  }
}

export class WhileStatement extends Node {
  constructor(public test: Node, public body: Node) {
    super()
  }
}

export class ForStatement extends Node {
  constructor(public init: Node | null, public test: Node | null, public update: Node | null, public body: Node) {
    super()
  }
}

export class DoWhileStatement extends Node {
  constructor(public test: Node, public body: Node) {
    super()
  }
}

export class SwitchCase extends Node {
  constructor(public test: Node | null, public consequent: Node[]) {
    super()
  }
}

export class SwitchStatement extends Node {
  constructor(public discriminant: Node, public cases: SwitchCase[]) {
    super()
  }
}

export class StructDeclaration extends Node {
  constructor(public name: string, public members: VariableDeclaration[]) {
    super()
  }
}

export class UnaryExpression extends Node {
  constructor(public operator: string, public argument: Node) {
    super()
  }
}

export class BinaryExpression extends Node {
  constructor(public operator: string, public left: Node, public right: Node) {
    super()
  }
}

export class TernaryExpression extends Node {
  constructor(public test: Node, public consequent: Node, public alternate: Node) {
    super()
  }
}

export class ReturnStatement extends Node {
  constructor(public argument: Literal | Identifier | UnaryExpression | null) {
    super()
  }
}

export class ContinueStatement extends Node {}

export class BreakStatement extends Node {}

export class DiscardStatement extends Node {}

export type AST =
  | Literal
  | Identifier
  | VariableDeclaration
  | BlockStatement
  | FunctionDeclaration
  | CallExpression
  | MemberExpression
  | ArrayExpression
  | IfStatement
  | WhileStatement
  | ForStatement
  | DoWhileStatement
  | SwitchCase
  | SwitchStatement
  | StructDeclaration
  | UnaryExpression
  | BinaryExpression
  | TernaryExpression
  | ReturnStatement
  | ContinueStatement
  | BreakStatement
  | DiscardStatement
