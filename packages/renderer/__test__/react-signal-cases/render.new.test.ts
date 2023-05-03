import { signal } from '@polymita/signal-model';
import { CommandOP, VNodeFunctionComponentSymbol, VirtualLayoutJSON, h, isVirtualNode } from '../../src';
import { 
  createFunctionComponent, createRHRenderer, createRSRenderer, createRSRoot
} from '../../src/render.new'
import {
  MockRectFramework,
  hasInputInLayout,
  layoutUseLogic,
  moduleHasMultipleChild,
} from '../mock'
import { useStyleInLayout, moduleHasNested, otherOtherComponentModule, patchDeepComposeComponent, composeOtherComponent } from '../mocks/render.new';

describe('render new', () => {
  describe('render container', () => {
    it('layout use logic', () => {

      const rr = createRHRenderer(layoutUseLogic(), {
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
    it('auto add input handler', () => {
      const rr = createRSRenderer(hasInputInLayout(), {
        framework: MockRectFramework
      })
      const rr2 = rr.construct()
  
      expect(isVirtualNode(rr2.children[0])).toBe(true)
      expect((rr2.children[0] as VirtualLayoutJSON).props.onInput.name).toBe('reactSignalTransformOnEventType')
    })
  });

  describe('use module as Component', () => {
    
    it('modify other component module', () => {
      const rr = createRHRenderer(otherOtherComponentModule(), {
        framework: MockRectFramework
      })
      const rr2 = rr.construct()
      const rr3 = rr.render()

      expect(rr3).toEqual({
        type: 'div',
        props: {},
        children: {
          type: 'div',
          props: {
            name: 'm2',
            ['is-container']: 1,
            style: {
              fontSize: '12px'
            }
          },
          children: 1,
        }
      })
    })
    it('patchLayout into inside', () => {
      const rr = createRHRenderer(patchDeepComposeComponent(), {
        framework: MockRectFramework
      })
      const rr2 = rr.construct()
      const rr3 = rr.render()
      
      expect(rr3).toEqual({
        type: 'div',
        props: {},
        children: {
          type: 'div',
          props: {
            name: 'm2',
            ['is-container']: 1,
            style: {
              fontSize: '12px'
            }
          },
          children: [
            1,
            {
              type: 'span',
              props: {},
              children: 'deep'
            }
          ],
        }
      })
    })
  })

  describe('compose component', () => {
    it('compose other module', () => {
      const rsRoot = createRSRoot({
        renderHost: {
          framework: MockRectFramework
        }
      });
      const Component = createFunctionComponent(composeOtherComponent());
      const FrameworkComponent = rsRoot.wrap(Component);
      const mockTestName = 'test'
      const ele = FrameworkComponent({ name: mockTestName });
      expect(ele).toEqual({
        type: 'row',
        props: {},
        children: {
          type: 'div',
          props: {},
          children: {
            type: 'span',
            props: {},
            children: mockTestName
          }
        }
      })
    })
  })

  describe('function component', () => {

    it('create function component', () => {
      const Component = createFunctionComponent(moduleHasMultipleChild());
      expect(Component).not.toBeUndefined();
      expect(Component[VNodeFunctionComponentSymbol]).toBe(true);
    })
    it('createRSRoot', () => {
      const rsRoot = createRSRoot({
        renderHost: {
          framework: MockRectFramework
        }
      });
      expect(rsRoot).not.toBeUndefined();
  
      const Component = createFunctionComponent(moduleHasMultipleChild());
      const FrameworkComponent = rsRoot.wrap(Component);
  
      const ele = FrameworkComponent({});
      
      expect(ele).toEqual({
        type: 'div',
        props: { id: '1' },
        children: [
          {
            type: 'div',
            props: {},
            children: "1"
          },
          {
            type: 'div',
            props: {},
            children: "2"
          }
        ]
      })
    })
    it('createRSRoot with component override', () => {
      const rsRoot = createRSRoot({
        renderHost: {
          framework: MockRectFramework
        }
      });
      expect(rsRoot).not.toBeUndefined();
  
      const Component = createFunctionComponent(moduleHasMultipleChild(), {
        patchRules(props, root) {
          return [
            {
              target: root.div,
              style: {
                color: 'red'
              }
            }
          ]
        },
        patchLayout(props, root) {
          return [
            {
              parent: root.div,
              op: CommandOP.addChild,
              child: h('p', {}, 'add p')
            }
          ]
        },
      });
      const FrameworkComponent = rsRoot.wrap(Component);
  
      const ele = FrameworkComponent({});
      
      expect(ele).toEqual({
        type: 'div',
        props: { id: '1', style: { color: 'red' } },
        children: [
          {
            type: 'div',
            props: {},
            children: "1"
          },
          {
            type: 'div',
            props: {},
            children: "2"
          },
          {
            type: 'p',
            props: {},
            children: 'add p'
          }
        ]
      })
    })
  
    it ('createRSRoot with useStyle and useLogic', () => {
      const rsRoot = createRSRoot({
        renderHost: {
          framework: MockRectFramework
        }
      });
      expect(rsRoot).not.toBeUndefined();
  
      const Component = createFunctionComponent(useStyleInLayout());
      const FrameworkComponent = rsRoot.wrap(Component);
  
      const testName = 'test-name';
      const ele = FrameworkComponent({ name: signal(testName) });
      
      expect(ele).toEqual({
        type: 'div',
        props: { style: { color: 'red' }, name: testName },
        children: {
          type: 'span',
          props: {},
          children: 1
        }
      })
    })
  
    it('createRSRoot with nested sub module component', () => {
      const rsRoot = createRSRoot({
        renderHost: {
          framework: MockRectFramework
        }
      });
      const Component  = createFunctionComponent(moduleHasNested())
      const FrameworkComponent = rsRoot.wrap(Component);
  
      const testName = 'tested';
      const ele = FrameworkComponent({ name: testName });
  
      expect(ele).toEqual({
        type: 'div',
        props: { },
        children: [
          testName,
          {
            type: 'div', // SimpleModuleComponent,
            props: {},
            children: {
              type: 'p',
              props: {},
              children: undefined
            }
          }
        ]
      })
    })
  })
})

