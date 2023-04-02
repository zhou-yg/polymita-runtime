import { css } from '@emotion/css'
import { VirtualLayoutJSON } from './types'
import { camelToLine, checkSematic, traverseLayoutTree } from './utils'

export const HOVER = 'hover'
export const ACTIVE = 'active'
export const FOCUS = 'focus'
export const DISABLED = 'disabled'
export const SELECTED = 'selected'
export const CSS = {
  HOVER,
  ACTIVE,
  FOCUS
}
export const ATTR = {
  DISABLED,
  SELECTED
}

function isBuiltinTag(
  tag: string
): tag is 'hover' | 'active' | 'focus' | 'selected' | 'disabled' {
  return isPseudo(tag) || isAttr(tag)
}

function isPseudo(k: any): k is 'hover' | 'active' | 'focus' {
  return [HOVER, ACTIVE, FOCUS].includes(k)
}

function isAttr(k: any): k is 'selected' | 'disabled' {
  return [DISABLED, SELECTED].includes(k)
}

function mapBooleanToNumber(b: any): number {
  return b === true || b === 1 ? 1 : 0
}

type MatrixConstraint<T> = T extends [infer F, ...infer R]
  ? [1 | 0 | '*', ...MatrixConstraint<R>]
  : []

type PatternVisionSematic = 'container' | 'text' | 'filltext' | 'decoration'

export type PatternMatrix2 = [
  any[], // any constraits
  Record<
    string,
    {
      [cssProp: string]: {
        [cssValue: string]: (
          | (1 | 0 | '*' | boolean)
          | (1 | 0 | '*' | boolean)[]
        )[]
      }
    }
  >
]

// export type TypePatternMatrix2Map = {
//   [propName: string]: {
//     value: string | string[]
//     pattern: PatternMatrix2
//   }[]
// }

interface PatternCSSObj {
  attr: (string | number)[][]
  pseudo?: string
  style: {
    [cssProp: string]: string
  }
  sematic: string // 'container' | 'text' | 'filltext' | 'decoration'
}

/**
 * according to same attr and sematic
 */
export function mergeStyleObjs(cssObjs: PatternCSSObj[]) {
  const map = new Map<string, PatternCSSObj>()
  cssObjs.forEach(cssObj => {
    const { attr, pseudo, sematic } = cssObj
    const key = `${attr.map(arr => arr.join('')).join('')}${
      pseudo || ''
    }${sematic}`
    const old = map.get(key)
    if (old) {
      old.style = {
        ...old.style,
        ...cssObj.style
      }
    } else {
      map.set(key, cssObj)
    }
  })
  return [...map.values()]
}

function pushAttr(
  attr: PatternCSSObj['attr'],
  item: PatternCSSObj['attr']['0']
) {
  if (!attr.some(arr => arr[0] === item[0])) {
    attr.push(item)
  }
}

export function constructCSSObj(matrix: PatternMatrix2) {
  const [constraints, rules] = matrix

  const cssObjs: PatternCSSObj[] = []

  Object.entries(rules).forEach(([sematic, cssMatrix]) => {
    const commonStyle: PatternCSSObj['style'] = {}

    Object.entries(cssMatrix).forEach(([cssProp, cssMatrix]) => {
      Object.entries(cssMatrix).forEach(([cssValue, matches]) => {
        function newCSSObj(valueArr: (0 | 1 | '*' | boolean)[]) {
          const cssObj: PatternCSSObj = {
            attr: [],
            style: {},
            sematic
          }

          if (matches.length === 0 || matches.every(v => v === '*')) {
            commonStyle[cssProp] = cssValue
          }

          const attrMatches: (string | number)[][] = []
          valueArr.forEach((match, i) => {
            if (match !== '*') {
              pushAttr(attrMatches, [constraints[i], mapBooleanToNumber(match)])
            }
          })
          const pseudos = attrMatches
            .filter(([attrOrPseudo, val]) => {
              return isPseudo(attrOrPseudo) && val !== 0
            })
            .map(arr => arr[0]) as string[]

          const attrMatchesWithoutPseudo = attrMatches.filter(
            ([attrOrPseudo, val]) => {
              return !isPseudo(attrOrPseudo)
            }
          )

          if (pseudos.length > 1) {
            console.error(
              `[createPatternCSS] only one pseudo is allowed, but received ${pseudos}`
            )
          }
          cssObj.pseudo = pseudos[0]
          cssObj.attr = attrMatchesWithoutPseudo
          cssObj.style[cssProp] = cssValue

          return cssObj
        }

        if (Array.isArray(matches[0])) {
          matches.forEach((match, i) => {
            if (Array.isArray(match)) {
              const cssObj = newCSSObj(match)
              cssObjs.push(cssObj)
            }
          })
        } else {
          const cssObj = newCSSObj(matches as any)
          cssObjs.push(cssObj)
        }
      })
    })
    if (Object.keys(commonStyle).length > 0) {
      cssObjs.push({
        attr: [],
        style: commonStyle,
        sematic
      })
    }
  })

  return cssObjs
}

const AttributeSelectorPrefix = 'data-'

function generateCSSIntoSematic(cssObjs: PatternCSSObj[]) {
  const sematicMap: Record<string, string> = {}
  cssObjs.forEach((cssObj, i) => {
    const { attr, pseudo, style, sematic } = cssObj

    const old = sematicMap[sematic]

    const attributeSelector = attr.reduce(
      (acc, [attr, val]) => {
        acc[0] += String(attr)
        acc[1] += String(val)
        return acc
      },
      [AttributeSelectorPrefix, '']
    )

    const attributeSelectorText =
      attr.length > 0
        ? `[${attributeSelector[0]}="${attributeSelector[1]}"]`
        : ''

    const styleText = Object.entries(style)
      .map(([k, v]) => {
        return `${camelToLine(k)}: ${v};`
      })
      .join('')

    const pseudoSelector = pseudo ? `:${pseudo}` : ''

    const clsText = `
      ${old || ''}
      &${attributeSelectorText}${pseudoSelector}{
        ${styleText}
      }
    `

    // const r = `
    // & ${attributeSelectorText} ${pseudoSelector} {
    //   ${styleText}
    // }`
    // console.log(`i=${i} s=${cssObj.sematic}`, cssObj, cls, r)

    sematicMap[sematic] = clsText
  })
  return sematicMap
}

/**
 * 暂不加 hash，如果有相同的css，确实就会生成完全相同的css
 */
export function createPatternCSS(matrix: PatternMatrix2) {
  const cssObjs: PatternCSSObj[] = constructCSSObj(matrix)

  const mergedObjs = mergeStyleObjs(cssObjs)

  const sematicCls = generateCSSIntoSematic(mergedObjs)

  return sematicCls
}

export function assignDeclarationPatterns(
  json: VirtualLayoutJSON,
  patternMatrix: PatternMatrix2
) {
  // const source = deepClone(json)
  const source = Object.assign({}, json)

  const attributeConstraints = patternMatrix[0].filter(isAttr)

  const pattern = createPatternCSS(patternMatrix)

  traverseLayoutTree(source, node => {
    const { props } = node
    for (const sematic in pattern) {
      if (checkSematic(sematic, props)) {
        const clsText = pattern[sematic]
        const cls = css`
          ${clsText}
        `
        if (props.className) {
          props.className = `${props.className} ${cls}`
        } else {
          props.className = cls
        }

        const attributeSelector: [string, string[], number[]] = [
          AttributeSelectorPrefix,
          [],
          []
        ]
        const singleProps: [string, number][] = []
        attributeConstraints.forEach(attr => {
          if (attr in props) {
            attributeSelector[1].push(attr)
            attributeSelector[2].push(mapBooleanToNumber(props[attr]))
            singleProps.push([attr, mapBooleanToNumber(props[attr])])
          }
        })
        if (attributeSelector[1].length > 0) {
          const newProp = [
            attributeSelector[0],
            attributeSelector[1].join('')
          ].join('')

          props[newProp] = attributeSelector[2].join('')
        }
        singleProps.forEach(([attr, val]) => {
          props[`${AttributeSelectorPrefix}${attr}`] = String(val)
        })
      }
    }
  })
  return source
}
