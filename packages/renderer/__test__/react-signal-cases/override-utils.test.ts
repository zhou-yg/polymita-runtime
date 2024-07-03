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
} from '../../src'

describe('override-utils', () => {

  it('getVirtualNodesByPath node paths', () => {
    const json = h(
      'div',
      {}, 
      h('div', { id: 1 }, 1),
      h('div', { id: 2 }, 2),
      h('p', {}, 2),
    );
    const result = getVirtualNodesByPath(json, ['div', 'p'])
    
    expect(result[0].length).toEqual(1)
    expect(result[0][0].type).toEqual('p')
  
    const result2 = getVirtualNodesByPath(json, ['div', 'div'])
    
    expect(result2[0].length).toEqual(2)
    expect(result2[0][0]).toEqual(h('div', { id: 1 }, 1))
    expect(result2[0][1]).toEqual(h('div', { id: 2 }, 2))
  })
  it('getVirtualNodesByPath when includes "props"', () => {
    const json = h(
      'div',
      {}, 
      h('div', { id: 1 }, 1),
      h('div', { id: 2 }, 2),
      h('p', {}, 2),
    );
  
    const result2 = getVirtualNodesByPath(json, ['div', 'div', 'props'])
    
    expect(result2[0][0]).toEqual(h('div', { id: 1 }, 1))
  })
  
  describe('applyJSONTreePatches', () => {
    const baseJSON = (): VirtualLayoutJSON => ({
      key: 0,
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {},
      children: [
        {
          key: 0,
          type: 'span',
          flags: VirtualNodeTypeSymbol,
          props: {},
          children: ['123']
        },
        {
          key: 1,
          type: 'span',
          flags: VirtualNodeTypeSymbol,
          props: {},
          children: []
        },
      ]
    })
    it ('addChild', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.addChild,
          path: ['div', 'span'],
          value: h('span2', {})
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const spanNode = result.children[0] as VirtualLayoutJSON

      expect(spanNode.children[0]).toBe('123')
      expect((spanNode.children[1] as VirtualLayoutJSON).type).toBe('span2')
    })
    it ('addChildFirst', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.addFirst,
          path: ['div', 'span'],
          value: h('span2', {})
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const spanNode = result.children[0] as VirtualLayoutJSON

      expect((spanNode.children[0] as VirtualLayoutJSON).type).toBe('span2')
      expect(spanNode.children[1]).toBe('123')
    })
    it ('remove', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.remove,
          path: ['div', 'span'],
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(0)
    })
    it ('replace', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.replace,
          path: ['div', 'span'],
          value: h('p', {}, h('i', {}))
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const pNode = result.children[0] as VirtualLayoutJSON

      expect(pNode.type).toBe('p')
      expect((pNode.children[0] as VirtualLayoutJSON).type).toBe('i')
    })
    it ('assignAttrs', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.assignAttrs,
          path: ['div'],
          value: {
            style: { color: 'red' }
          }
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)
      expect(result.props).toEqual({
        style: { color: 'red' }
      })
    })
    it ('wrap', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.wrap,
          path: ['div', 'span'],
          value: h('p', {})
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const newPNode0 = result.children[0] as VirtualLayoutJSON
      const newPNode1 = result.children[1] as VirtualLayoutJSON

      expect(newPNode0.type).toBe('p')
      expect(newPNode1.type).toBe('p')

      expect(newPNode0.children.length).toBe(1)
      expect(newPNode1.children.length).toBe(1)

      const spanNode0 = newPNode0.children[0] as VirtualLayoutJSON
      const spanNode1 = newPNode1.children[0] as VirtualLayoutJSON

      expect(spanNode0.type).toBe('span')
      expect(spanNode1.type).toBe('span')
    })
    it('wrapFirst', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.wrapFirst,
          path: ['div', 'span'],
          value: h('p', {})
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const newPNode0 = result.children[0] as VirtualLayoutJSON
      const oldSpanNode = result.children[1] as VirtualLayoutJSON

      expect(newPNode0.type).toBe('p')
      expect(oldSpanNode.type).not.toBe('p')

      expect(newPNode0.children.length).toBe(1)
      expect(oldSpanNode.children.length).toBe(0)

      const spanNode0 = newPNode0.children[0] as VirtualLayoutJSON

      expect(spanNode0.type).toBe('span')
      expect(spanNode0.children.length).toBe(1)
    })
    it('wrapLast', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.wrapLast,
          path: ['div', 'span'],
          value: h('p', {})
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(2)

      const oldSpanNode = result.children[0] as VirtualLayoutJSON
      const newPNode0 = result.children[1] as VirtualLayoutJSON

      expect(oldSpanNode.type).toBe('span')
      expect(newPNode0.type).toBe('p')

      expect(oldSpanNode.children.length).toBe(1)
      expect(newPNode0.children.length).toBe(1)

      const oldSpanNode1 = newPNode0.children[0] as VirtualLayoutJSON

      expect(oldSpanNode1.type).toBe('span')
      expect(oldSpanNode1.children.length).toBe(0)
    })
  })
})
