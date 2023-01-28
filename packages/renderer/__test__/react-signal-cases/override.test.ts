import { CommandOP, createRenderer, extendModule, h, isVirtualNode, LayoutStructTree, VirtualLayoutJSON } from '../../src'
import * as mock from '../mock'
import { overridePatchRules } from '../mock'
import { signal } from 'atomic-signal'

describe('override', () => {

  it('extend once', () => {
    
    const baseModule = mock.layoutHasTypes()

    const newModule2 = extendModule(baseModule, () => ({
      patchLayout (props, jsonDraft) {
        return [
          {
            op: CommandOP.addChild,
            parent: jsonDraft.div,
            child: { type: 'p', props: { className: 'p-cls' }, children: ['123'] } // h('p', {}, '123')
          }
        ] as const
      }
    }))

    const r = createRenderer(newModule2, {
      framework: mock.MockRectFramework
    })
    const r1 = r.construct({ name: 'newModule2' })
    const r2 = r.render()

    expect(r2).toEqual({
      type: 'div',
      props: {
        style: {
          color: 'red'
        }
      },
      children: [
        {
          type: 'div',
          props: {},
          children: 'newModule2'
        },        
        {
          type: 'p',
          props: { className: 'p-cls' },
          children: '123'
        },
      ]
    })
  })
  it('extend twice', () => {
    
    const baseModule = mock.layoutHasTypes()

    const newModule2 = extendModule(baseModule, () => ({
      patchLayout (props, jsonDraft) {
        return [
          {
            op: CommandOP.addChild,
            parent: jsonDraft.div,
            child: { type: 'p', props: { className: 'p-cls' }, children: ['123'] } // h('p', {}, '123')
            // child: h('p', {}, '123')
          }
        ] as const
      }
    }))

    const r = createRenderer(newModule2, {
      framework: mock.MockRectFramework
    })
    const r1 = r.construct({ name: 'newModule2' })
    const r2 = r.render()

    expect(r2).toEqual({
      type: 'div',
      props: {
        style: {
          color: 'red'
        }
      },
      children: [
        {
          type: 'div',
          props: {},
          children: 'newModule2'
        },        
        {
          type: 'p',
          props: { className: 'p-cls' },
          children: '123'
        },
      ]
    })

    const newModule3 = extendModule(newModule2, () => ({
      patchLayout (props, root) {
        return [
          {
            op: CommandOP.addChild,
            parent: root.div.p,
            child: { type: 'text', children: ['456'] } // h('text', {}, '456')
          }
        ] as const 
      }
    }))

    const r3 = createRenderer(newModule3, { framework: mock.MockRectFramework })
    const r4 = r3.construct({ name: 'newModule3' })
    const r5 = r3.render()
    
    expect(r5).toEqual({
      type: 'div',
      props: {
        style: {
          color: 'red'
        }
      },
      children: [
        {
          type: 'div',
          props: {},
          children: 'newModule3'
        },        
        {
          type: 'p',
          props: { className: 'p-cls' },
          children: [
            '123',
            {
              type: 'text',
              props: {},
              children: '456'
            }
          ]
        },
      ]
    })
  })

  it('single override', () => {
    const module = mock.useSingleOverride()
    const r = createRenderer(module, { framework: mock.MockRectFramework })
    const r1 = r.construct({ text: 'override2', show: false })
    const r2 = r.render()

    expect(r2).toEqual({
      type: 'div',
      props: {
        'is-container': 1,
        style: {
          color: 'red'
        }
      },
      children: [
        'i am ',
        'override2'
      ]    
    })
  })

  describe('use other module', () => {
    it ('override at module layer', () => {
      const module = mock.overrideAtModuleLayer()
      const r = createRenderer(module, { framework: mock.MockRectFramework })
      const r1 = r.construct({ text: 'overrideAtModuleLayer' })
      const r2 = r.render()

      expect(r2).toEqual({
        type: 'div',
        props: {
          'is-container': 1,
          style: {
            color: 'red'
          }
        },
        children: [
          'i am ',
          'overrideAtModuleLayer',
          {
            type: 'p',
            props: {},
            children: undefined,
          }
        ]
      })
    })
    

    it('override at renderer layer', () => {
      const m = mock.overrideAtUseModule()
      const r = createRenderer(m, { framework: mock.MockRectFramework })
      const r1 = r.construct({ m2Text: 'at renderer layer' })
      const r2 = r.render()

      expect(r2).toEqual({
        type: 'usingModule',
        props: {
          className: 'at-module'
        },
        children: {
          type: 'div',
          props: {
            'is-container': 1,
            style: {
              color: 'red'
            }
          },
          children: [
            'i am ',
            'at renderer layer',
            {
              type: 'p',
              props: {},
              children: {
                type: 'text',
                props: {},
                children: 123
              },
            }
          ]    
        }
      })
    })

    it('override at construct layer', () => {
      const m = mock.overrideAtUseModuleAndRender()
      const r = createRenderer(m, { framework: mock.MockRectFramework })
      const r1 = r.construct({ m2Text: 'at construct layer' })
      const r2 = r.render()
      expect(r2).toEqual({
        type: 'usingModule',
        props: {
          className: 'at-module'
        },
        children: {
          type: 'div',
          props: {
            'is-container': 1,
            style: {
              color: 'red'
            }
          },
          children: [
            'i am ',
            'at construct layer',
            {
              type: 'p',
              props: {},
              children: {
                type: 'text',
                props: {},
                children: [
                  '123',
                  {
                    type: 'label',
                    props: {},
                    children: 456
                  }
                ]
              },
            }
          ]    
        }
      })
    })
  })

  it('patch style rules', () => {
    const rr = createRenderer(overridePatchRules(), { framework: mock.MockRectFramework })
    const r1 = rr.construct({ name: 'patch style rules', show: true })
    const r2 = rr.render()
    expect(r2).toEqual({
      type: 'div',
      props: {
        style: {
          color: 'red'
        }
      },
      children: {
        type: 'div',
        props: {
          style: { color: 'green' }
        },
        children: 'patch style rules'
      }
    })
  })
})
