import type { Token } from './tokenizer.js'

export interface HoistNode {
  prefix: Token[]
  cases: { cond: Token[]; node: HoistNode }[]
}

/**
 * A set of tokens optionally starting with a directive
 */
type PreprocessorSegment = {
  directive?: Token[] | undefined
  suffix: Token[]
  scope: number
}

const preScopeDelta = {
  if: 1,
  ifdef: 1,
  ifndef: 1,
} as Record<string, number>

const postScopeDelta = {
  endif: -1,
} as Record<string, number>

export function segmentDirectives(tokens: Token[]): PreprocessorSegment[] {
  const segments: PreprocessorSegment[] = []

  // Gathering the first non-directive segment, if it exists
  let cursor = 0
  let scope = 0
  const prefix: Token[] = []
  while (cursor < tokens.length && tokens[cursor].value !== '#') {
    prefix.push(tokens[cursor++])
  }

  if (prefix.length > 0) {
    segments.push({ suffix: trimWhitespace(prefix), scope })
  }

  while (cursor < tokens.length) {
    const directive: Token[] = []
    while (cursor < tokens.length && tokens[cursor].value !== '\\') {
      directive.push(tokens[cursor++])
    }
    directive.push(tokens[cursor++]) // push the '\\'

    const suffix: Token[] = []
    while (cursor < tokens.length && tokens[cursor].value !== '#') {
      suffix.push(tokens[cursor++])
    }

    const name = directive[1]?.value ?? ''
    scope += preScopeDelta[name] || 0
    segments.push({ directive, suffix: trimWhitespace(suffix), scope })
    scope += postScopeDelta[name] || 0
  }

  return segments
}

export function getDirectiveName(segment: PreprocessorSegment): string {
  return segment.directive?.[1]?.value ?? ''
}

export function trimWhitespace(tokens: Token[]): Token[] {
  let start = 0
  let end = tokens.length - 1

  if (end === 0 && tokens[0].type === 'whitespace') {
    return []
  }

  while (start < end && tokens[start].type === 'whitespace') {
    start++
  }

  while (end > start && tokens[end].type === 'whitespace') {
    end--
  }

  return tokens.slice(start, end + 1)
}

function constructHoistTree(
  segments: PreprocessorSegment[],
  scope: number = 0,
  remainder: HoistNode | undefined = undefined,
): HoistNode {
  let leafNode: HoistNode = {
    cases: remainder?.cases ?? [],
    prefix: remainder?.prefix ?? [],
  }

  let currentNode: HoistNode | undefined
  // The segment index that marks the end of the currently
  // explored case (exclusive)
  let caseEnd = segments.length - 1

  for (let seg = segments.length - 1; seg >= 0; seg--) {
    const segment = segments[seg]
    if (segment.scope === scope) {
      // A segment that belongs to the outer scope, meaning we're at the top of the nested node
      leafNode.prefix = [...segment.suffix, ...leafNode.prefix]
      continue
    }

    if (segment.scope > scope + 1) {
      continue // A nested segment, skip it
    }

    const name = getDirectiveName(segment)
    if (name === '') {
      // The first segment, no directive
      if (leafNode) {
        leafNode.prefix = [...segment.suffix, ...leafNode.prefix]
      }
    } else if (name === 'endif') {
      // Prepending the suffix of the endif segment before the leaf node
      leafNode.prefix = [...segment.suffix, ...leafNode.prefix]
      caseEnd = seg
      currentNode = {
        cases: [],
        prefix: [],
      }
    } else if (name === 'else' || name === 'elif' || name === 'if' || name === 'ifdef' || name === 'ifndef') {
      const caseNode = constructHoistTree(segments.slice(seg, caseEnd), scope + 1, leafNode)
      caseEnd = seg // the next ends where the previous started
      currentNode?.cases.unshift({ cond: segment.directive ?? [], node: caseNode })
    }

    if (name === 'if' || name === 'ifdef' || name === 'ifndef') {
      // We're finishing up a whole node
      leafNode = currentNode!
    }
  }

  // No nested conditions in this node
  return leafNode
}

function flattenHoistNode(node: HoistNode, prefix: Token[]): Token[] {
  if (node.cases.length === 0) {
    return [...prefix, ...node.prefix]
  }

  return [
    ...node.cases.flatMap((case_) => {
      return [
        ...case_.cond,
        { type: 'whitespace' as const, value: '\n' },
        ...flattenHoistNode(case_.node, [...prefix, ...node.prefix]),
        { type: 'whitespace' as const, value: '\n' },
      ]
    }),
    { type: 'symbol', value: '#' },
    { type: 'keyword', value: 'endif' },
    { type: 'symbol' as const, value: '\\' },
    { type: 'whitespace' as const, value: '\n' },
  ]
}

/**
 * Hoists preprocessor directives on the token level
 */
export function hoistPreprocessorDirectives(tokens: Token[]): Token[] {
  const tree = constructHoistTree(segmentDirectives(tokens))

  return flattenHoistNode(tree, [])
}
