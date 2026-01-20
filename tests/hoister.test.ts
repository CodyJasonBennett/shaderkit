import { type Token, tokenize } from 'shaderkit'
import { describe, expect, it } from 'vitest'
import { hoistPreprocessorDirectives } from '../src/hoister.js'

const NEWLINE_REGEX = /\\\s+/gm
const DIRECTIVE_REGEX = /(^\s*#[^\\]*?)(\n|\/[\/\*])/gm

function workAroundDirectiveEnd(code: string): string {
  // Fold newlines
  code = code.replace(NEWLINE_REGEX, '')

  // Escape newlines after directives, skip comments
  code = code.replace(DIRECTIVE_REGEX, '$1\\$2')

  return code
}

function print(tokens: Token[]) {
  let result = ''
  let skipNextBaskslash = false
  for (const token of tokens) {
    if (token.value === '#') {
      skipNextBaskslash = true
    }

    if (token.value === '\\' && skipNextBaskslash) {
      skipNextBaskslash = false
      continue
    }

    result += token.value
  }
  return result
}

const glslComplexCondition = workAroundDirectiveEnd(`\
mat3 tbn = getTangentFrame(-vViewPosition, normal,
#if defined(USE_NORMALMAP)
	vNormalMapUv
#elif defined(USE_CLEARCOAT_NORMALMAP)
	vClearcoatNormalMapUv
#else
	vUv
#endif
);`)

const glslSiblingConditions = workAroundDirectiveEnd(`\
vec3 color = getColor(
  #ifdef VIEW_NORMALMAP
    normalMap,
  #else
    colorMap,
  #endif
  #ifdef HIGH_P
    vUvHigh
  #else
    vUvLow
  #endif
);`)

const glslNestedConditions = workAroundDirectiveEnd(`\
vec3 color = getColor(
  #ifdef VIEW_NORMALMAP
    normalMap
  #else
    #ifdef GRAYSCALE
      grayscaleMap
    #else
      colorMap
    #endif
  #endif
);`)

const glslSiblingNestedConditions = workAroundDirectiveEnd(`\
vec3 color =
  #if CACHE
    getColor(
    #if COLOR
      colorMap,
    #else
      grayscaleMap,
    #endif
  #else
    computeColor(
  #endif
  #if HIGH_P
    highPrecisionUV
  #else
    lowPrecisionUV
  #endif
  );`)

describe('hoistPreprocessorDirectives', () => {
  it('hoists complex condition', () => {
    const inTokens = tokenize(glslComplexCondition)
    const outCode = print(hoistPreprocessorDirectives(inTokens))
    expect(outCode).toMatchInlineSnapshot(`
      "#if defined(USE_NORMALMAP)
      mat3 tbn = getTangentFrame(-vViewPosition, normal,vNormalMapUv);
      #elif defined(USE_CLEARCOAT_NORMALMAP)
      mat3 tbn = getTangentFrame(-vViewPosition, normal,vClearcoatNormalMapUv);
      #else
      mat3 tbn = getTangentFrame(-vViewPosition, normal,vUv);
      #endif
      "
    `)
  })

  it('hoists sibling directives', () => {
    const inTokens = tokenize(glslSiblingConditions)
    const outCode = print(hoistPreprocessorDirectives(inTokens))
    expect(outCode).toMatchInlineSnapshot(`
      "#ifdef VIEW_NORMALMAP
      #ifdef HIGH_P
      vec3 color = getColor(normalMap,vUvHigh);
      #else
      vec3 color = getColor(normalMap,vUvLow);
      #endif

      #else
      #ifdef HIGH_P
      vec3 color = getColor(colorMap,vUvHigh);
      #else
      vec3 color = getColor(colorMap,vUvLow);
      #endif

      #endif
      "
    `)
  })

  it('hoists nested directives', () => {
    const inTokens = tokenize(glslNestedConditions)
    const outCode = print(hoistPreprocessorDirectives(inTokens))
    expect(outCode).toMatchInlineSnapshot(`
      "#ifdef VIEW_NORMALMAP
      vec3 color = getColor(normalMap);
      #else
      #ifdef GRAYSCALE
      vec3 color = getColor(grayscaleMap);
      #else
      vec3 color = getColor(colorMap);
      #endif

      #endif
      "
    `)
  })

  it('hoists nested & sibling conditions', () => {
    const inTokens = tokenize(glslSiblingNestedConditions)
    const outCode = print(hoistPreprocessorDirectives(inTokens))
    expect(outCode).toMatchInlineSnapshot(`
      "#if CACHE
      #if COLOR
      #if HIGH_P
      vec3 color =getColor(colorMap,highPrecisionUV);
      #else
      vec3 color =getColor(colorMap,lowPrecisionUV);
      #endif

      #else
      #if HIGH_P
      vec3 color =getColor(grayscaleMap,highPrecisionUV);
      #else
      vec3 color =getColor(grayscaleMap,lowPrecisionUV);
      #endif

      #endif

      #else
      #if HIGH_P
      vec3 color =computeColor(highPrecisionUV);
      #else
      vec3 color =computeColor(lowPrecisionUV);
      #endif

      #endif
      "
    `)
  })
})
