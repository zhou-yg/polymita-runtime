import { VNodeFunctionComponentSymbol } from '../../src';
import { 
  createFunctionComponent, createRSRoot
} from '../../src/render.new'
import {
  MockRectFramework,
  moduleHasMultipleChild
} from '../mock'
import { SimpleModuleComponent, moduleHasNested } from '../mocks/render.new';

describe('render new', () => {
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

