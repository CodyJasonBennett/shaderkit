import { describe, it, expect } from 'vitest'
import { tokenize } from 'glsl-tools'

describe('tokenize', () => {
  it('can tokenize GLSL ES 3.00', () => {
    const code = /* glsl */ `#version 300 es
      precision mediump float;

      // single line

      /*
        multiline
      */

      #ifdef TEST
        const bool isTest = true;
      #endif

      uniform sampler2D map;
      out vec4 pc_FragColor;

      void main() {
        pc_FragColor = vec4(map.rgb, 0.0);
        pc_FragColor.a += 1.0;
      }
    `

    expect(tokenize(code)).toMatchSnapshot()
  })
})
