import {
  matchPatternMatrix,
  assignRules,
  applyJSONTreePatches,
  buildLayoutNestedObj,
  DraftPatch,
  VirtualLayoutJSON,
  proxyLayoutJSON,
  StyleRule,
  assignPattern,
  VirtualNodeTypeSymbol,
  CommandOP,
  h,
  getVirtualNodesByPath,
  PropTypes,
  assignDeclarationPatterns,
  assignDefaultValueByPropTypes,
} from '../../src'
import {
  isSignal,
  signal,
} from '@polymita/signal-model'

describe('utils', () => {

  it('buildLayoutNestedObj', () => {
    const json: VirtualLayoutJSON = {
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {
        id: 'root'
      },
      children: [
        {
          type: 'div',
          flags: VirtualNodeTypeSymbol,
          props: {
            id: 'child'
          },
          children: undefined
        }
      ]
    }

    expect(buildLayoutNestedObj(json)).toEqual({
      div: {
        props: {
          id: 'root'
        },
        div: {
          props: {
            id: 'child'
          }
        }
      }
    })
  })

  it('proxyLayoutJSON', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root' },
      h('div', { id: 'child' })
    )
    
    const { draft, apply } = proxyLayoutJSON(json)
    draft.div.props.id = 'root2'
    draft.div.div.props.id = 'child2'

    const result = apply()

    expect(result).toEqual({
      type: 'div',
      props: {
        id: 'root2'
      },
      flags: VirtualNodeTypeSymbol,
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child2'
          },
          children: []
        }
      ]
    })
  })
  it('proxyLayoutJSON with operates', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root' },
      h('div', { id: 'child' })
    )
    
    const { draft, apply } = proxyLayoutJSON(json)
    draft.div.addChild(0)
    draft.div.div.addChild(1)

    const result = apply()

    expect(result).toEqual({
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {
        id: 'root'
      },
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child'
          },
          children: [1]
        },
        0,
      ]
    })
  })
  it('assignRules', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root' },
      h('div', { id: 'child' }),
      h('span', { id: 'child2', style: { fontSize: 14 }}),
    )
    
    const { draft, apply } = proxyLayoutJSON(json)
    const rules: StyleRule[] = [
      {
        target: draft.div,
        condition: true,
        style: {
          color: 'red'
        }
      },
      {
        target: draft.div.span,
        condition: true,
        style: {
          color: 'blue'
        }
      }
    ]
    assignRules(draft, rules);
    const result = apply()
    expect(result).toEqual({
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {
        id: 'root',
        style: {
          color: 'red'
        }
      },
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child'
          },
          children: []
        },
        {
          flags: VirtualNodeTypeSymbol,
          type: 'span',
          props: {
            id: 'child2',
            style: {
              fontSize: 14,
              color: 'blue'
            }
          },
          children: []
        },
      ]
    })
  })
  it('matchPatternMatrix', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root', ['is-container']: true },
      h('div', { id: 'child' }),
      h('span', {
        id: 'child2',
        ['is-text']: true,
        style: {
          fontSize: 14,
        }
      }),
    )

    const patternResult = matchPatternMatrix([true, false])({
      container: {
        backgroundColor: {
          red: [true, false],
          blue: [false, true],
        }
      },
      text: {
        fontSize: {
          small: [true, false],
          middle: [true, false],
        },
      }
    })

    const result = assignPattern(json, patternResult)

    expect(result).toEqual({
      flags: VirtualNodeTypeSymbol,
      type: 'div',
      props: {
        id: 'root',
        ['is-container']: true,
        style: {
          backgroundColor: 'red'
        }
      },
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child'
          },
          children: []
        },
        {
          type: 'span',
          flags: VirtualNodeTypeSymbol,
          props: {
            id: 'child2',
            ['is-text']: true,
            style: {
              fontSize: 'middle',
            }
          },
          children: []
        },
      ]
    })
  })

  it ('assignDefaultValueByPropTypes', () => {
    const pt = {
      value: PropTypes.signal.default(() => signal(0)),
      value2: PropTypes.signal.isRequired.default(() => signal(1))
    }
    const defaultProps: any = assignDefaultValueByPropTypes({}, pt)

    expect(isSignal(defaultProps.value)).toEqual(true)
    expect(isSignal(defaultProps.value2)).toEqual(true)
  })
})
