import {
  ModuleRenderContainer,
  NormalizeProps,
  OverrideModule,
  RenderContainer,
  RenderHost,
  SignalProps,
  SingleFileModule,
  StateManagementConfig,
  VirtualLayoutJSON,
  VNodeComponent,
  VNodeComponent2
} from './types'

import {
  assignDefaultValueByPropTypes,
  isVNodeComponent,
  last,
  VirtualNodeTypeSymbol,
  VNodeComponentSymbol,
  VNodeFunctionComponentSymbol
} from './utils'

import * as reactSignalManagement from './extensions/stateManagements/react-signal'
import * as reactHookManagement from './extensions/stateManagements/react-hook'
import * as reactRenderContainer from './extensions/frameworks/react'

import {
  BaseDataType,
  FormatPatchCommands,
  LayoutStructTree,
  MergedPatchCommandsToModule,
  PatchCommand
} from './types-layout'

interface GlobalCurrentRenderer {
  renderHooksContainer: ModuleRenderContainer<any, any, any, any, any, string>
  config: any // TODO
}

let globalCurrentRenderer: GlobalCurrentRenderer[] = []

function getCurrentRenderer() {
  return last(globalCurrentRenderer)
}
function pushCurrentRenderer(renderer: GlobalCurrentRenderer) {
  globalCurrentRenderer.push(renderer)
}
function popCurrentRenderer() {
  globalCurrentRenderer.pop()
}

const renderContextSymbol = Symbol('renderContextSymbol');
function attachRendererContext (target: any, context: GlobalCurrentRenderer) {
  target[renderContextSymbol] = context;
}
function getRendererContext (target: any) {
  return target[renderContextSymbol];
}

/**
 * 组件嵌套
 * 
 * 入参
 * 1.配置 module, override
 * 2.动态环境 renderContainer, statement, 外部framework
 * 
 * 先固化配置
 * 在渲染的时候，获取 renderContainer (statement, framework host)
 * 
 * usage 引用组件（like react style)：
 * 1.specific component
 *   eg: Cpt = createComponent(module, override)，声明Parent外部
 * 2.render in parent module:
 *   eg: function ParentModule() { return <Cpt />  }
 * 
 * usage 组合组件（相当于源码引用，类似于代码写在一起的效果）
 * 1.specific internal module
 *  eg: ChildModule = createComposeComponent(module, override)
 * 2.compose in parent module
 *  eg: function ParentModule() { return <ChildModule />  }
 */




/**
 * 创建渲染器 createRoot
 * 1.内部保留了这个所需的：renderContainer, statement, 外部framework
 *  1.1 生成 renderContainerContext
 * 2.在渲染的时候
 *  2.1 使用FunctionComponent，内部执行framework 组件
 * 3.返回 framework.Element
 */
function createRSRoot(config: {
  renderHost: RenderHost,
}) {
  const currentRendererContext = {
    renderHooksContainer: null,
    config: {
      renderHost: config.renderHost,
      createRenderContainer: reactRenderContainer.createReactContainer,
      stateManagement: reactSignalManagement.config,
    },
  }

  return {
    wrap(component: Function) {
      return (props: Record<string, any>) => {
        attachRendererContext(component, currentRendererContext)
        const ele = config.renderHost.framework.lib.createElement(component, props)
        return ele;
      }
    }
  }
}

function createFunctionComponent<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ModuleName
> (
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const { name } = module

  /**
   * real component code in framework
   * 
   * 问题：当然渲染器怎么往下传递，用React.Context吗？
   * 应该不行，应该自己的Context机制
   */
  function frameworkFunctionComponent(props: P) {
    const renderer = getRendererContext(frameworkFunctionComponent);
    
  }
  Object.defineProperty(frameworkFunctionComponent, 'name', {
    get() {
      return name || 'Unknown function component'
    }
  })
  frameworkFunctionComponent[VNodeFunctionComponentSymbol] = true

  return frameworkFunctionComponent;
}