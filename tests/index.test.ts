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

  #include <three_test>

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

  struct LightData {
    float intensity;
    vec3 position;
  };
  uniform LightData Light[4];

  void main() {
    vec4 lightNormal = vec4(Light[0].position.xyz * Light[0].intensity, 0.0);
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

  it('can mangle multiple GLSL shaders', () => {
    const mangleMap = new Map()
    const vert = /* glsl */ `#version 300 es\nin vec2 uv;out vec2 c;void main(){c=uv;}`
    const frag = /* glsl */ `#version 300 es\nin vec2 c;out vec4 data[gl_MaxDrawBuffers];void main(){data[0]=c.sstt;}`

    expect(minify(vert, { mangle: true, mangleExternals: true, mangleProperties: true, mangleMap })).toMatchSnapshot()
    expect(minify(frag, { mangle: true, mangleExternals: true, mangleProperties: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })
})
