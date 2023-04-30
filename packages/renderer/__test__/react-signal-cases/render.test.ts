import { clearIdIndex, createComposeComponent, createRSRenderer, createRHRenderer as createRenderer, isVirtualNode, VirtualLayoutJSON } from '../../src'
import {
  simpleModule,
  moduleHasMultipleChild,
  layoutUseLogic,
  MockRectFramework,
  useStyleInLayout,
  useOtherModule,
  hasInputInLayout,
  insideVNodeComponent,
  otherOtherComponentModule,
  patchDeepComposeComponent,
} from '../mock'

describe('render', () => {

  afterEach(() => {
    clearIdIndex()
  })

  it('createComposeComponent', () => {
    const NewCpt = createComposeComponent(Object.assign(function myCpt () {
    }, { version: 0 }))

    expect((NewCpt as any).version).toBe(0)
    expect((NewCpt).name).toBe('myCpt')

  })

  it('layout use logic', () => {

    const rr = createRenderer(layoutUseLogic(), {
      framework: MockRectFramework
    })

    rr.construct({ name: 'test' })
    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: { name: 'test', "is-container": 1 },
      children: 1
    })
  })

  it('layout use style', () => {
    const rr = createRenderer(useStyleInLayout(), {
      framework: MockRectFramework
    })
    const rr2 = rr.construct({ name: 'test2' })
    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: { name: 'test2', style: { color: 'red' } },
      children: { type: 'span', props: {}, children: 1 }
    })
  })


  it('auto add input handler', () => {
    const rr = createRSRenderer(hasInputInLayout(), {
      framework: MockRectFramework
    })
    const rr2 = rr.construct()

    expect(isVirtualNode(rr2.children[0])).toBe(true)
    expect((rr2.children[0] as VirtualLayoutJSON).props.onInput.name).toBe('reactSignalTransformOnEventType')
  })

  it('using VNode Component', () => {
    const rr = createRenderer(insideVNodeComponent(), {
      framework: MockRectFramework
    })
    const rr2 = rr.construct()

    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: {},
      children: {
        type: 'span',
        props: {},
        children: ['value is ',  '123'],
      }
    })
  })
})