import { vi, describe, it, expect } from 'vitest'
import { parse, visit, type Visitors, type ReturnStatement, type AST } from 'shaderkit'

describe('traversal', () => {
  it('calls visitor enter/exit methods', () => {
    const program = parse('return;')
    const statement = program.body[0] as ReturnStatement

    const visitors = {
      Program: {
        enter: vi.fn(),
        exit: vi.fn(),
      },
      ReturnStatement: {
        enter: vi.fn(),
      },
    } satisfies Visitors
    visit(program, visitors)

    expect(visitors.Program.enter).toHaveBeenCalledOnce()
    expect(visitors.Program.enter).toHaveBeenCalledWith(program, [])
    expect(visitors.ReturnStatement.enter).toHaveBeenCalledOnce()
    expect(visitors.ReturnStatement.enter).toHaveBeenCalledWith(statement, [program])
    expect(visitors.Program.exit).toHaveBeenCalledOnce()
    expect(visitors.Program.exit).toHaveBeenCalledWith(program, [])
  })

  it('calls visitor default methods', () => {
    const program = parse('return;')
    const statement = program.body[0] as ReturnStatement

    const visitors = {
      Program: vi.fn(),
      ReturnStatement: vi.fn(),
    } satisfies Visitors
    visit(program, visitors)

    expect(visitors.Program).toHaveBeenCalledOnce()
    expect(visitors.Program).toHaveBeenCalledWith(program, [])
    expect(visitors.ReturnStatement).toHaveBeenCalledOnce()
    expect(visitors.ReturnStatement).toHaveBeenCalledWith(statement, [program])
  })

  it('tracks node ancestors in parallel', () => {
    const program = parse('void a() {} void b() {}')
    let parent: AST | null = null

    const visitors = {
      Program(node, ancestors) {
        expect(node).toBe(program)
        expect(ancestors).toStrictEqual([])
        parent = node
      },
      FunctionDeclaration(node, ancestors) {
        expect(ancestors).toStrictEqual([program])
        parent = node
      },
      BlockStatement(node, ancestors) {
        expect(parent).not.toBe(null)
        expect(parent).not.toBe(program)
        expect(parent).not.toBe(node)
        expect(ancestors).toStrictEqual([program, parent])
        parent = node
      },
    } satisfies Visitors
    visit(program, visitors)
  })
})
