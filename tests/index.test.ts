import { describe, it, expect } from 'vitest'
import { tokenize, minify } from 'shaderkit'

const glsl = /* glsl */ `#version 300 es
  precision mediump float;

  // single line

  /*
    multiline
  */

  #define TEST
  #ifdef TEST
    const bool isTest = true;
  #endif

  uniform sampler2D map;
  out vec4 pc_FragColor;

  void main() {
    pc_FragColor = vec4(texture(map).rgb, 0.0);
    pc_FragColor.a += 1.0;
  }
`

describe('tokenize', () => {
  it('can tokenize GLSL', () => {
    expect(tokenize(glsl)).toMatchSnapshot()
  })
})

describe('minify', () => {
  it('can minify GLSL', () => {
    expect(minify(glsl)).toMatchSnapshot()
  })

  it('can mangle GLSL', () => {
    expect(minify(glsl, { mangle: true })).toMatchSnapshot()
  })

  it('can mangle externals in GLSL', () => {
    expect(minify(glsl, { mangle: true, mangleExternals: true })).toMatchSnapshot()
  })
})
