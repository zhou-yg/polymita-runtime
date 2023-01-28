import { clearIdIndex, createRenderer, VirtualNodeTypeSymbol } from '../../src'
import {
  simpleModule,
  moduleHasMultipleChild,
  layoutUseLogic,
  MockRectFramework,
  useStyleInLayout,
} from '../mock'

describe('h factory and hooks', () => {

  afterEach(() => {
    clearIdIndex()
  })

  it('simple', () => {
    const r = simpleModule().layout()

    expect(r).toEqual({
      type: 'div',
      props: {},
      children: [],
      flags: VirtualNodeTypeSymbol,
      
    })
  })
  it('simple has multiple', () => {
    const r = moduleHasMultipleChild().layout()

    expect(r).toEqual({
      type: 'div',
      flags: VirtualNodeTypeSymbol,
      props: { id: '1' },
      children: [
        {
          type: 'div',
          flags: VirtualNodeTypeSymbol,
          props: {},
          children: ['1']
        },
        {
          type: 'div',
          flags: VirtualNodeTypeSymbol,
          props: {},
          children: ['2']
        },
      ]
    })
  })
})
