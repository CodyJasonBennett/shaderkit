#version 300 es
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

// #include <three_test>

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
} globals2;

#define globals globals2

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
float intensity;

invariant pc_FragColor;

void main() {
  vec4 lightNormal = vec4(Light[0].position.xyz * Light[0].intensity * intensity, 0.0);
  vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(0, 0, 0, 1);
  vec4 clipPositionGlobals = globals.projectionMatrix * globals.modelViewMatrix * vec4(0, 0, 0, 1);
  if (false) {}
  pc_FragColor = vec4(texture(map, vUv).rgb, 0.0);
  float bar = 0.0;
  pc_FragColor.a += 1.0+bar;
}
