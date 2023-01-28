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
  DraftOperatesEnum,
  h,
  getVirtualNodesByPath,
  PropTypes,
  assignDeclarationPatterns,
  assignDefaultValueByPropTypes,
} from '../../src'
import {
  isSignal,
  signal,
} from 'atomic-signal'

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
  it('applyJSONTreePatches', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root' },
      h('div', { id: 'child1' }, 1),
      h('span', { id: 'child2' }, 2),
      h('div', { id: 'child3' }, 3)
    );
    
    const v1 = 'root2'
    const v2 = 'child33'
    const patches: DraftPatch[] = [
      {
        op: DraftOperatesEnum.replace,
        path: ['div', 'props', 'id'],
        value: v1
      },
      {
        op: DraftOperatesEnum.replace,
        path: ['div', 'div', 'props', 'id'],
        value: v2
      }
    ]
    const result = applyJSONTreePatches(json, patches)
    expect(result).toEqual({
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {
        id: v1
      },
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: v2
          },
          children: [1]
        },
        {
          flags: VirtualNodeTypeSymbol,
          type: 'span',
          props: {
            id: 'child2'
          },
          children: [2]
        },
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: v2
          },
          children: [3]
        }
      ]
    })
  })
  it('applyJSONTreePatches with insertNode', () => {
    const json: VirtualLayoutJSON = h(
      'div',
      { id: 'root' },
      h('div', { id: 'child1' }, 1),
      h('div', { id: 'child2' }),
    )
    
    const patches: DraftPatch[] = [
      {
        op: DraftOperatesEnum.insert,
        path: ['div'],
        value: 1
      },
      {
        op: DraftOperatesEnum.insert,
        path: ['div', 'div'],
        value: 2
      },
    ]

    const result = applyJSONTreePatches(json, patches)
    expect(result).toEqual({
      type: 'div',
      props: {
        id: 'root'
      },
      flags: VirtualNodeTypeSymbol,
      children: [
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child1'
          },
          children: [1, 2]
        },
        {
          flags: VirtualNodeTypeSymbol,
          type: 'div',
          props: {
            id: 'child2'
          },
          children: [2]
        },
        1
      ]
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
    draft.div.insert(0)
    draft.div.div.insert(1)

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
  it('getVirtualNodesByPath', () => {
    const json = h(
      'div',
      {}, 
      h('div', { id: 1 }, 1),
      h('p', {}, 2),
    );
    const result = getVirtualNodesByPath(json, ['div', 'p'])
    
    expect(result[0].length).toEqual(1)
    expect(result[0][0].type).toEqual('p')
  
    const result2 = getVirtualNodesByPath(json, ['div', 'div', 'props'])
    
    expect(result2[0].length).toEqual(1)
    expect(result2[0][0]).toEqual(h('div', { id: 1 }, 1))
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
