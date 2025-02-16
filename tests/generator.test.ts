import { describe, it, expect } from 'vitest'
import { generate, parse, minify } from 'shaderkit'

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

  buffer b {
    vec4 v[];
  } name[3];

  layout(binding = 0) writeonly buffer Output {
    uint elements[];
  } output_data;

  layout(binding = 1) readonly buffer Input0 {
    uint elements[];
  } input_data0;

  float a[5];
  float b[] = a;
  vec4 a[3][2];
  vec4[2] a[3];
  vec4[3][2] a;

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

// https://community.arm.com/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/get-started-with-compute-shaders
const compute = /* glsl */ `#version 310 es
  uniform float radius;

  struct Vector3f {
    float x;
    float y;
    float z;
    float w;
  };

  struct AttribData {
    Vector3f v;
    Vector3f c;
  };

  layout(std140, binding = 0) buffer destBuffer {
    AttribData data[];
  } outBuffer;

  // TODO: how to represent in AST?
  layout (local_size_x = 8, local_size_y = 8, local_size_z = 1) in;

  void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    uint gWidth = gl_WorkGroupSize.x * gl_NumWorkGroups.x;
    uint gHeight = gl_WorkGroupSize.y * gl_NumWorkGroups.y;
    uint gSize = gWidth * gHeight;

    uint offset = storePos.y * gWidth + storePos.x;

    float alpha = 2.0 * 3.14159265359 * float(offset) / float(gSize);

    outBuffer.data[offset].v.x = sin(alpha) * radius;
    outBuffer.data[offset].v.y = cos(alpha) * radius;
    outBuffer.data[offset].v.z = 0.0;
    outBuffer.data[offset].v.w = 1.0;

    outBuffer.data[offset].c.x = storePos.x / float(gWidth);
    outBuffer.data[offset].c.y = 0.0;
    outBuffer.data[offset].c.z = 1.0;
    outBuffer.data[offset].c.w = 1.0;
  }
`

describe('generator', () => {
  it('can handle GLSL', () => {
    const program = parse(glsl)
    const output = generate(program, { target: 'GLSL' })
    expect(output).toBe(minify(glsl))
  })

  it('can handle GLSL ES 3.1', () => {
    const program = parse(compute)
    const output = generate(program, { target: 'GLSL' })
    expect(output).toBe(minify(compute))
  })
})
