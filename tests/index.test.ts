import { describe, it, expect } from 'vitest'
import { tokenize, minify } from 'shaderkit'

const glsl = /* glsl */ `#version 300 es
  precision mediump float;

  // single line

  /*
    multiline
  */

  #define PLUS (n) \
    n += 1

  #define TEST // inline comment
  #if defined( TEST )
    const bool isTest = true;
  #endif

  uniform float foo, bar;

  uniform sampler2D map;
  in vec2 vUv;
  out vec4 pc_FragColor;

  #include <three_test>

  layout(std140) uniform Uniforms1 {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
    mat3 normalMatrix;
    float one, two;
  };

  layout(std140) uniform Uniforms2 {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
    mat3 normalMatrix;
    float one, two;
  } globals;

  struct X {
    #if !defined(BLA)
      int y;
    #else
      float z;
    #endif
  };

  struct LightData {
    float intensity;
    vec3 position;
    float one, two;
  };
  uniform LightData Light[4];

  invariant pc_FragColor;

  void main() {
    vec4 lightNormal = vec4(Light[0].position.xyz * Light[0].intensity, 0.0);
    vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(0, 0, 0, 1);
    vec4 clipPositionGlobals = globals.projectionMatrix * globals.modelViewMatrix * vec4(0, 0, 0, 1);
    if (false) {}
    pc_FragColor = vec4(texture(map, vUv).rgb, 0.0);
    float bar = 0.0;
    pc_FragColor.a += 1.0+bar;
  }
`

const wgsl = /* wgsl */ `
  // single line

  /*
    multiline
  */

  struct LightData {
    intensity: f32,
    position: vec3<f32>,
    one: f32,
    two: f32,
  };

  struct Uniforms {
    projectionMatrix: mat4x4<f32>,
    modelViewMatrix: mat4x4<f32>,
    normalMatrix: mat3x3<f32>,
    one: f32,
    two: f32,
    lights: array<LightData, 4>,
  };
  @binding(0) @group(0) var<uniform> uniforms: Uniforms;

  @binding(1) @group(0) var sample: sampler;
  @binding(2) @group(0) var map: texture_2d<f32>;

  struct VertexIn {
    @location(0) position: vec4<f32>,
    @location(1) uv: vec2<f32>,
  };

  struct VertexOut {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
  };

  @vertex
  fn vert_main(input: VertexIn) -> VertexOut {
    var output: VertexOut;
    output.position = input.position;
    output.uv = input.uv;
    return output;
  }

  @fragment
  fn frag_main(uv: vec2<f32>) -> vec4<f32> {
    var lightNormal = vec4<f32>(uniforms.lights[0].position * uniforms.lights[0].intensity, 0.0);
    var clipPosition = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4<f32>(0.0, 0.0, 0.0, 1.0);

    var color = textureSample(map, sample, uv);
    color.a += 1.0;
    return color;
  }
`

describe('tokenize', () => {
  it('can tokenize GLSL', () => {
    expect(tokenize(glsl)).toMatchSnapshot()
  })

  it('can tokenize WGSL', () => {
    expect(tokenize(wgsl)).toMatchSnapshot()
  })
})

describe('minify', () => {
  it('can minify GLSL', () => {
    expect(minify(glsl)).toMatchSnapshot()
  })

  it('can minify WGSL', () => {
    expect(minify(wgsl)).toMatchSnapshot()
  })

  it('can mangle GLSL', () => {
    const mangleMap = new Map()
    expect(minify(glsl, { mangle: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })

  it('can mangle WGSL', () => {
    const mangleMap = new Map()
    expect(minify(wgsl, { mangle: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })

  it('can mangle externals in GLSL', () => {
    const mangleMap = new Map()
    expect(minify(glsl, { mangle: true, mangleExternals: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })

  it('can mangle externals in WGSL', () => {
    const mangleMap = new Map()
    expect(minify(wgsl, { mangle: true, mangleExternals: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })

  it('can mangle multiple GLSL shaders with collisions', () => {
    const mangleMap = new Map()
    const vert = /* glsl */ `#version 300 es\nin vec2 sstt;out vec2 c;void main(){c=sstt;}`
    const frag = /* glsl */ `#version 300 es\nin vec2 c;out vec4 data[gl_MaxDrawBuffers];void main(){data[0]=c.sstt;}`

    expect(minify(vert, { mangle: true, mangleExternals: true, mangleMap })).toMatchSnapshot()
    expect(minify(frag, { mangle: true, mangleExternals: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })

  it('can wrap large mangle indices', () => {
    const mangleMap = new Map()
    const shader = /* glsl */ `uniform float ${Array.from({ length: 53 }, (_, i) => `u${i}`)}`
    expect(minify(shader, { mangle: true, mangleExternals: true, mangleMap })).toMatchSnapshot()
    expect(mangleMap).toMatchSnapshot()
  })
})
