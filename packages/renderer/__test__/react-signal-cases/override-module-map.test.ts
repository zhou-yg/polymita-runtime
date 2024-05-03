import { signal } from '@polymita/signal-model'
import { CommandOP, createRHRenderer, createRSRenderer, createVirtualNode, extendModule } from '../../src'
import * as mock from '../mock'

describe.only('override modules map', () => {

  it('extend at', () => {
    const mp = mock.getTestModules()

    const rr = createRHRenderer(mock.rootPageModule(), { 
      framework: mock.MockRectFramework,
      moduleOverride: { 
        enable: true, 
        modulesLinkMap: mp,
        modulesActiveMap: (['mock-override-new-contributor']),
      }
    })

    mock.overridePageModuleContributor1()

    const r1 = rr.construct()
    console.log('r1: ', r1);
    console.log('mp: ', mp);
    const r2 = rr.render();
    
  })
})
