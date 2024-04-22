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
})
