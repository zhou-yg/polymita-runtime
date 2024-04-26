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
  createVirtualNode,
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
    expect(result2[0][0]).toEqual(h('div', { id: 2 }, 2))
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
  
  describe.only('applyJSONTreePatches', () => {
    const baseJSON = (): VirtualLayoutJSON => ({
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: {},
      children: [
        {
          type: 'span',
          flags: VirtualNodeTypeSymbol,
          props: {},
          children: ['123']
        }
      ]
    })
    it ('addChild', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.addChild,
          path: ['div', 'span'],
          value: createVirtualNode({ type: 'span2' })
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(1)

      const spanNode = result.children[0] as VirtualLayoutJSON

      expect(spanNode.children[0]).toBe('123')
      expect((spanNode.children[1] as VirtualLayoutJSON).type).toBe('span2')
    })
    it ('addChildFirst', () => {
      const patches: DraftPatch[] = [
        {
          op: CommandOP.addFirst,
          path: ['div', 'span'],
          value: createVirtualNode({ type: 'span2' })
        }
      ]
      const result = applyJSONTreePatches(baseJSON(), patches)

      expect(result.type).toBe('div')
      expect(result.children.length).toBe(1)

      const spanNode = result.children[0] as VirtualLayoutJSON

      expect((spanNode.children[0] as VirtualLayoutJSON).type).toBe('span2')
      expect(spanNode.children[1]).toBe('123')
    })
  })
})
