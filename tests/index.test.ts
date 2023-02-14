import { describe, it, expect } from 'vitest'
import { tokenize, minify } from 'shaderkit'

const glsl = /* glsl */ `#version 300 es
  precision mediump float;

  // single line

  /*
    multiline
  */

  #define TEST // inline comment
  #if defined( TEST )
    const bool isTest = true;
  #endif

  uniform sampler2D map;
  in vec2 vUv;
  out vec4 pc_FragColor;

  layout(std140) uniform Uniforms1 {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
    mat3 normalMatrix;
  };

  layout(std140) uniform Uniforms2 {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
    mat3 normalMatrix;
  } globals;

  void main() {
    vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(0, 0, 0, 1);
    vec4 clipPositionGlobals = globals.projectionMatrix * globals.modelViewMatrix * vec4(0, 0, 0, 1);
    pc_FragColor = vec4(texture(map, vUv).rgb, 0.0);
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

  it('can mangle properties in GLSL', () => {
    expect(minify(glsl, { mangle: true, mangleExternals: true, mangleProperties: true })).toMatchSnapshot()
  })
})
