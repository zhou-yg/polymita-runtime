import {
  ModuleRenderContainer,
  NormalizeProps,
  OverrideModule,
  RenderContainerConstructor,
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
  traverse,
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
import { h } from './render'

type GlobalCurrentRenderer = ModuleRenderContainer<any, any, any, any, any, any>;

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

interface CurrentRenderContext {
  renderHost: RenderHost
  createRenderContainer: RenderContainerConstructor<any, any, any, any, any, any>
  stateManagement: StateManagementConfig
}

const renderContextSymbol = Symbol('renderContextSymbol');
function attachRendererContext (target: any, context: CurrentRenderContext) {
  target[renderContextSymbol] = context;
}

function traverseAndAttachRendererContext(json: VirtualLayoutJSON, context: CurrentRenderContext) {
  function dfs (node: VirtualLayoutJSON) {
    if (isFunctionComponent(node.type) && !getRendererContext(node.type)) {
      attachRendererContext(node.type, context)
    }
    node.children?.forEach(dfs)
  }
  dfs(json)
}

function getRendererContext (target: any): CurrentRenderContext {
  return target[renderContextSymbol];
}

/**
 * 组件嵌套
 * 
 * 入参
 * 1.配置 module, override
 * 2.动态环境 RenderContainerConstructor, statement, 外部framework
 * 
 * 先固化配置
 * 在渲染的时候，获取 RenderContainerConstructor (statement, framework host)
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
export function createRHRoot(config: {
  renderHost: RenderHost,
}) {
  const currentRendererContext = {
    renderHost: config.renderHost,
    createRenderContainer: reactRenderContainer.createReactContainer,
    stateManagement: reactHookManagement.config,
  }

  return {
    wrap<Props>(component: FunctionComponent<Props>) {
      return (props: Props) => {
        attachRendererContext(component, currentRendererContext)
        const ele = config.renderHost.framework.lib.createElement(component, props)
        return ele;
      }
    }
  }
}
export function createRSRoot(config: {
  renderHost: RenderHost,
}) {
  const currentRendererContext = {
    renderHost: config.renderHost,
    createRenderContainer: reactRenderContainer.createReactContainer,
    stateManagement: reactSignalManagement.config,
  }

  return {
    wrap<Props>(component: FunctionComponent<Props>) {
      return (props: Props) => {
        attachRendererContext(component, currentRendererContext)
        const ele = config.renderHost.framework.lib.createElement(component, props)
        return ele;
      }
    }
  }
}

interface FunctionComponent<Props> {
  (p: Props): VirtualLayoutJSON
  [VNodeFunctionComponentSymbol]: boolean
}

export function createFunctionComponent<
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
): FunctionComponent<P> {
  const { name } = module

  if (name && /^[a-z]/.test(String(name))) {
    throw new Error(
      `First char of module name must be uppercase, but got ${name}.`
    )
  }

  /**
   * real component code in framework
   * 
   * 问题：当然渲染器怎么往下传递，用React.Context吗？
   * 应该不行，应该自己的Context机制
   */
  function frameworkFunctionComponent(props: P): VirtualLayoutJSON {
    const { override: secondOverride, ...restProps } = props;
    const rendererContext = getRendererContext(frameworkFunctionComponent);
    const { renderHost, createRenderContainer, stateManagement } = rendererContext;

    const renderContainer = createRenderContainer(
      renderHost.framework.lib,
      module,
      stateManagement,
    );

    const mergedOverrides: any = [override, secondOverride].filter(Boolean)

    pushCurrentRenderer(renderContainer)

    const layoutJSON = renderContainer.construct(restProps, mergedOverrides)

    popCurrentRenderer()

    traverseAndAttachRendererContext(layoutJSON, rendererContext)

    const ins = renderContainer.render(layoutJSON);

    return ins;
  }
  Object.defineProperty(frameworkFunctionComponent, 'name', {
    get() {
      return name || 'Unknown function component'
    }
  })
  const componentWithSymbol = Object.assign(frameworkFunctionComponent, {
    [VNodeFunctionComponentSymbol]: true,
  })

  return componentWithSymbol;
}
function isFunctionComponent(target: any) {
  return target?.[VNodeFunctionComponentSymbol]
}


/**
 * export hooks
 */

export function useLogic<T = any>(...args: any[]): T {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useLogic must be called in render function')
  }
  return renderer.runLogic(...args) as T
}

export function useLayout<T extends LayoutStructTree>() {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useLayout must be called in render function')
  }
  return renderer.getLayout<T>()
}