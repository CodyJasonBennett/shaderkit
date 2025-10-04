import { describe, it, expect } from 'vitest'
import { generate, parse } from 'shaderkit'

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

  // 3.3 Source Strings
  float f\\
  oo;
  // forms a single line equivalent to "float foo;"
  // (assuming '\' is the last character before the new line and "oo" are
  // the first two characters of the next line)

  // 3.5 Preprocessor
  #
  #define test
  #undef test
  #if defined(test)
  #ifdef test
    test;
  #endif
  #ifndef test
    test;
  #else
    test;
  #endif
  #error
  #error error message
  #pragma STDGL
  #pragma optimize(on)
  #extension all : behavior
  #line 0 1
  #include <three_test> // non-standard; three.js

  // 3.6 Comments
  /* // test */

  // 4.1.2 Booleans
  bool success; // declare "success" to be a Boolean
  bool done = false; // declare and initialize "done"

  // 4.1.3 Integers
  int i, j = 42; // default integer literal type is int
  uint k = 3u; // "u" establishes the type as uint

  // 4.1.4 Floats
  float a, b = 1.5;

  // 4.1.5 Vectors
  vec2 texcoord1, texcoord2;
  vec3 position;
  vec4 myRGBA;
  ivec2 textureLookup;
  bvec3 less;

  // 4.1.6 Matrices
  mat2 mat2D;
  mat3 optMatrix;
  mat4 view, projection;
  mat4x4 view; // an alternate way of declaring a mat4
  mat2 a;
  mat2x2 b = a;

  // 4.1.8 Structures
  // NOTE: this is parsed/generated as the latter statements which is non-identical
  // struct light {
  //   float intensity;
  //   vec3 position;
  // } lightVar;
  struct light {
    float intensity;
    vec3 position;
  };
  light lightVar;

  // 4.1.9 Arrays
  float frequencies[3];
  uniform vec4 lightPosition[4u];
  const int numLights = 2;
  light lights[numLights];
  float[5](3.4, 4.2, 5.0, 5.2, 1.1);
  float x[] = float[2] (1.0, 2.0); // declares an array of size 2
  float y[] = float[] (1.0, 2.0, 3.0); // declares an array of size 3
  float a[5];
  float b[] = a;
  float[5] foo() {}
  void foo(float[5]);
  a.length();

  // 4.3.6 Output Variables
  out vec3 normal;
  centroid out vec2 TexCoord;
  invariant centroid out vec4 Color;
  flat out vec3 myColor;

  // 4.3.8.3 Uniform Block Layout Qualifiers
  layout(shared, column_major) uniform;
  layout(std140) uniform Transform { // layout of this block is std140
    mat4 M1; // row_major
    layout(column_major) mat4 M2; // column major
    mat3 N1; // row_major
  };

  // 4.5.3 Precision Qualifiers
  lowp float color;
  out mediump vec2 P;
  lowp ivec2 foo(lowp mat3);
  highp mat4 m;
  uniform highp float h1;
  highp float h2 = 2.3 * 4.7; // operation and result are highp precision
  mediump float m;
  m = 3.7 * h1 * h2; // all operations are highp precision
  h2 = m * h1; // operation is highp precision
  m = h2 - h1; // operation is highp precision
  h2 = m + m; // addition and result at mediump precision
  void f(highp float p);
  f(3.3); // 3.3 will be passed in at highp precision

  invariant centroid out vec3 Color;

  // 4.8 Empty Declarations
  int;
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

  layout (local_size_x = 8, local_size_y = 8, local_size_z = 1) in;

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
    expect(output).toMatchSnapshot()
  })

  it('can handle GLSL ES 3.1', () => {
    const program = parse(compute)
    const output = generate(program, { target: 'GLSL' })
    expect(output).toMatchSnapshot()
  })

  it('can generate attribute variable declarations', () => {
    const shader = 'attribute vec4 position;'
    const program = parse(shader)
    const output = generate(program, { target: 'GLSL' })
    expect(output).toBe('attribute vec4 position;')
  })

  it('can generate varying variable declarations', () => {
    const shader = 'varying vec3 normal;'
    const program = parse(shader)
    const output = generate(program, { target: 'GLSL' })
    expect(output).toBe('varying vec3 normal;')
  })
})
