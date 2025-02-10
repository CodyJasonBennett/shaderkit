import { generate, parse } from 'shaderkit'
import { describe, it, expect } from 'vitest'

function test(code: string): void {
  const program = parse(code + '\n')
  const output = generate(program, { target: 'GLSL' })
  expect(output.trim()).toBe(code.trim())
}

describe('generator', () => {
  it('can handle preprocessor statements', () => {
    // test('#version 300 es')
    test('#define PLUS(n) n += 1')
    test('#define TEST')
    test('#if defined(TEST)\nconst bool isTest = true;\n#endif')
  })

  it('can handle structs', () => {
    test('struct LightData {float intensity;vec3 position;float one, two;};')
  })

  it('can handle suffix array specifiers', () => {
    test('uniform LightData Light[4];')
  })

  it.skip('can handle uniform declaration blocks', () => {
    test(
      'layout(std140) uniform Uniforms1 {mat4 projectionMatrix;mat4 modelViewMatrix;mat3 normalMatrix;float one, two;};',
    )
    test(
      'layout(std140) uniform Uniforms2 {mat4 projectionMatrix;mat4 modelViewMatrix;mat3 normalMatrix;float one, two;} globals;',
    )
  })
})
