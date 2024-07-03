import { createRHRenderer } from '../../src'
import * as mock from '../mock'

describe.only('override modules map', () => {

  it('extend at', () => {
    const mp = mock.getTestModules()

    const rr = createRHRenderer(mock.rootPageModule(), { 
      framework: mock.MockRectFramework,
      moduleOverride: { 
        enable: true, 
        modulesLinkMap: mp,
        modulesActiveMap: (['mock-override-NewContributor']),
      }
    })

    mock.overridePageModuleContributor1()

    const r1 = rr.construct()
    const r2 = rr.render();

    expect(r2).toEqual({
      type: 'div',
      props: {},
      children: {
        type: 'page-contributor',
        props: {},
        children: [
          { type: 'contributor-title', props: {}, children: 'title' },
          { type: 'contributor-content', props: {}, children: 'content' },
          { type: 'new-child', props: {}, children: 'new' },
        ]
      }      
    })
  })
})
