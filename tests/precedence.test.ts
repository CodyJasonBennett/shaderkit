import { describe, expect, it } from 'vitest'
import { ArraySpecifier, Expression, ExpressionStatement, parse } from 'shaderkit'

function format(node: ArraySpecifier | Expression | null, forceParens = false): string {
  if (!node) return ''

  switch (node.type) {
    case 'Identifier':
      return node.name
    case 'Literal':
      return node.value
    case 'ArraySpecifier':
      return `${node.typeSpecifier.name}${node.dimensions.map((d) => `[${format(d)}]`).join('')}`
    case 'ArrayExpression':
      return `${format(node.typeSpecifier)}(${node.elements.map((e) => format(e)).join(', ')})`
    case 'UnaryExpression':
    case 'UpdateExpression': {
      const inner = node.prefix
        ? `${node.operator}${format(node.argument, true)}`
        : `${format(node.argument, true)}${node.operator}`
      return forceParens ? `(${inner})` : inner
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const inner = `${format(node.left, true)} ${node.operator} ${format(node.right, true)}`
      return forceParens ? `(${inner})` : inner
    }
    case 'AssignmentExpression': {
      const inner = `${format(node.left, true)} ${node.operator} ${format(node.right, true)}`
      return forceParens ? `(${inner})` : inner
    }
    case 'MemberExpression': {
      const obj = format(node.object, true)
      const prop = node.computed ? `[${format(node.property)}]` : `.${format(node.property)}`
      return `${obj}${prop}`
    }
    case 'CallExpression': {
      const callee = format(node.callee, true)
      return `${callee}(${node.arguments.map((a) => format(a)).join(', ')})`
    }
    case 'ConditionalExpression': {
      const inner = `${format(node.test, true)} ? ${format(node.alternate, true)} : ${format(node.consequent, true)}`
      return forceParens ? `(${inner})` : inner
    }
    default:
      return node satisfies never
  }
}

const ungrouped = /* glsl */ `
arith1 = a + b * c;
arith2 = (a + b) * c;
arith3 = a / b * c;
arith4 = a / (b * c);
arith5 = a - b - c;
arith6 = a - (b - c);
rel1 = a < b || b < c;
rel2 = a < b && b < c;
rel3 = a == b || c != d;
log1 = x || y && z;
log2 = (x || y) && z;
log3 = !(x && y);
tern1 = x ? a + b : c * d;
tern2 = y ? a - b : c / d;
bit1 = ia | ib & ic;
bit2 = ia ^ ib & ic;
bit3 = ia << ib >> ic;
colArith = vec3((arith1 + arith2 + arith3 + arith4 + arith5 + arith6) / 100.0, 0.0, 0.0);
colRel = vec3(float(rel1), float(rel2), float(rel3));
colLog = vec3(float(log1), float(log2), float(log3));
colTern = vec3((tern1 + tern2) / 20.0, 0.5, 0.0);
colBits = vec3(float(bit1 & 1), float(bit2 & 1), float(bit3 & 1));
member1 = vec.x + 1 + 2;
`.trim()

const grouped = /* glsl */ `
arith1 = (a + (b * c));
arith2 = ((a + b) * c);
arith3 = ((a / b) * c);
arith4 = (a / (b * c));
arith5 = ((a - b) - c);
arith6 = (a - (b - c));
rel1 = ((a < b) || (b < c));
rel2 = ((a < b) && (b < c));
rel3 = ((a == b) || (c != d));
log1 = (x || (y && z));
log2 = ((x || y) && z);
log3 = (!(x && y));
tern1 = (x ? (a + b) : (c * d));
tern2 = (y ? (a - b) : (c / d));
bit1 = (ia | (ib & ic));
bit2 = (ia ^ (ib & ic));
bit3 = ((ia << ib) >> ic);
colArith = vec3((((((arith1 + arith2) + arith3) + arith4) + arith5) + arith6) / 100.0, 0.0, 0.0);
colRel = vec3(float(rel1), float(rel2), float(rel3));
colLog = vec3(float(log1), float(log2), float(log3));
colTern = vec3((tern1 + tern2) / 20.0, 0.5, 0.0);
colBits = vec3(float(bit1 & 1), float(bit2 & 1), float(bit3 & 1));
member1 = ((vec.x + 1) + 2);
`.trim()

describe('parser', () => {
  it('can handle precedence', () => {
    const expressions =
      parse(ungrouped)
        .body.map((n) => format((n as ExpressionStatement).expression))
        .join(';\n') + ';'
    expect(expressions).toBe(grouped)
  })
})
