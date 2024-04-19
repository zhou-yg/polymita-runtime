import { createRHRenderer as createRenderer, createRenderer3, createRSRenderer } from '../../src'
import * as mock from '../mock'

import * as reactSignalManagement from '../../src/extensions/stateManagements/react-signal'
import * as reactRenderContainer from '../../src/extensions/frameworks/react'

describe('pattern', () => {

  it('has multi matcher 2', () => {
    const rr = createRenderer3({
      module: mock.patternHasMultiMatchers(),
      renderHost: {
        framework: mock.MockRectFramework,
      },
      stateManagement: reactSignalManagement.config,
      createRenderContainer: reactRenderContainer.createReactContainer
    })
    
    rr.construct({ v1: true, v2: false })
    const rr2 = rr.render()

    expect(rr2).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'red'
        }
      },
      children: 'i am container'
    })

    rr.construct({ v1: true, v2: true })
    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'green'
        }
      },
      children: 'i am container'
    })
  })

  it('has multi matcher', () => {
    const rr = createRSRenderer(mock.patternHasMultiMatchers(), {
      framework: mock.MockRectFramework,
    })

    rr.construct({ v1: true, v2: false } as any)
    const rr2 = rr.render()

    expect(rr2).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'red'
        }
      },
      children: 'i am container'
    })

    rr.construct({ v1: true, v2: true } as any)
    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'green'
        }
      },
      children: 'i am container'
    })
  })
  it('has multi matcher with star', () => {
    const rr = createRSRenderer(mock.patternHasMultiMatchers2(), {
      framework: mock.MockRectFramework,
    })

    // 强行传入普通值，测试 PropTypes.signal.isRequired 是否生效
    rr.construct({ v1: false } as any)
    const rr2 = rr.render()

    expect(rr2).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'red'
        }
      },
      children: 'i am container'
    })

    rr.construct({ v1: true } as any)
    const rr3 = rr.render()

    expect(rr3).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          backgroundColor: 'green'
        }
      },
      children: 'i am container'
    })
  })
})