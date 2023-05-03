import {
  ComposeComponent,
  FunctionComponent,
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
  isVNodeFunctionComponent,
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

export function h(
  type: string | Function,
  props: Record<string, any> | null,
  ...children: (VirtualLayoutJSON | VirtualLayoutJSON[] | BaseDataType)[]
): VirtualLayoutJSON {
  // if (isVNodeComponent(type)) {
  //   const json = (type as any)({
  //     ...(props || {}),
  //     children
  //   })
  //   return json
  // }
  /** compatible with different versions jsx: children in props, and key in children */
  if (props?.children) {
    if (children.length !== 0) {
      props.key = children
    }
    children = props.children
    delete props.children
  }

  const result: VirtualLayoutJSON = {
    // id: idIndex++,
    flags: VirtualNodeTypeSymbol,
    type,
    props: props || {},
    children: children.flat() /** @TODO it's danger! */
  }

  let key = props?.key
  if (key) {
    result.key = key
  }

  return result
}

type GlobalCurrentRenderer = ModuleRenderContainer<any, any, any, any, any, any>

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
  createRenderContainer: RenderContainerConstructor<
    any,
    any,
    any,
    any,
    any,
    any
  >
  stateManagement: StateManagementConfig
}

const renderContextSymbol = Symbol('renderContextSymbol')
function attachRendererContext(target: any, context: CurrentRenderContext) {
  target[renderContextSymbol] = context
}

function traverseAndAttachRendererContext(
  json: VirtualLayoutJSON,
  context: CurrentRenderContext
) {
  function dfs(node: VirtualLayoutJSON) {
    if (
      node &&
      isVNodeFunctionComponent(node) &&
      !getRendererContext(node.type)
    ) {
      attachRendererContext(node.type, context)
    }
    node?.children?.forEach(dfs)
  }
  dfs(json)
}

function getRendererContext(target: any): CurrentRenderContext {
  return target[renderContextSymbol]
}

/**
 *
 * R: React，
 * 传入的状态是正常变量，不是信号
 */
export function createRHRenderer<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  renderHost: RenderHost,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const renderer = createRenderer3<
    P,
    L,
    PCArr,
    NewPC,
    NormalizeProps<P>,
    ModuleName
  >({
    module,
    override,
    renderHost,
    stateManagement: reactHookManagement.config,
    createRenderContainer: reactRenderContainer.createReactContainer
  })

  return renderer
}
/**
 * R: React
 * S: Signal
 * 传入的props是信号
 */
export function createRSRenderer<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  renderHost: RenderHost,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const renderer = createRenderer3<P, L, PCArr, NewPC, P, ModuleName>({
    module,
    override,
    renderHost,
    stateManagement: reactSignalManagement.config,
    createRenderContainer: reactRenderContainer.createReactContainer // @TODO1
  })

  return renderer
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
export function createRHRoot(config: { renderHost: RenderHost }) {
  const currentRendererContext = {
    renderHost: config.renderHost,
    createRenderContainer: reactRenderContainer.createReactContainer,
    stateManagement: reactHookManagement.config
  }

  return {
    wrap<Props>(component: FunctionComponent<Props>) {
      return (props: Props) => {
        attachRendererContext(component, currentRendererContext)
        const ele = config.renderHost.framework.lib.createElement(
          component,
          props
        )
        return ele
      }
    }
  }
}
export function createRSRoot(config: { renderHost: RenderHost }) {
  const currentRendererContext = {
    renderHost: config.renderHost,
    createRenderContainer: reactRenderContainer.createReactContainer,
    stateManagement: reactSignalManagement.config
  }

  return {
    wrap<Props>(component: FunctionComponent<Props>) {
      return (props: Props) => {
        attachRendererContext(component, currentRendererContext)
        const ele = config.renderHost.framework.lib.createElement(
          component,
          props
        )
        return ele
      }
    }
  }
}

export function createFunctionComponent<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  SecondNewPC,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
): FunctionComponent<
  P & {
    override?: OverrideModule<
      P,
      SingleFileModule<
        P,
        SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
        NewPC,
        ModuleName
      >['layoutStruct'],
      SecondNewPC
    >
  }
> {
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
  function frameworkComposeComponent(props: P): VirtualLayoutJSON {
    const { override: secondOverride, ...restProps } = props
    const rendererContext = getRendererContext(frameworkComposeComponent)
    const { createRenderContainer, renderHost, stateManagement } =
      rendererContext

    const renderer = createRenderer3({
      module,
      override,
      stateManagement,
      renderHost,
      createRenderContainer
    })

    renderer.construct(restProps, secondOverride)

    return renderer.render()
  }
  Object.defineProperty(frameworkComposeComponent, 'name', {
    get() {
      return name || 'Unknown function component'
    }
  })
  const componentWithSymbol = Object.assign(frameworkComposeComponent, {
    [VNodeFunctionComponentSymbol]: true
  })

  return componentWithSymbol
}

export function createComposeComponent<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  SecondNewPC,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
): ComposeComponent<
  P & {
    override?: OverrideModule<
      P,
      SingleFileModule<
        P,
        SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
        NewPC,
        ModuleName
      >['layoutStruct'],
      SecondNewPC
    >
  }
> {
  const { name } = module

  if (name && /^[a-z]/.test(String(name))) {
    throw new Error(
      `First char of module name must be uppercase, but got ${name}.`
    )
  }
  function frameworkComposeComponent(props: P) {
    const json = module.layout(props)
    return json
  }

  Object.defineProperty(frameworkComposeComponent, 'name', {
    get() {
      return name || 'Unknown compose function component'
    }
  })
  const componentWithSymbol = Object.assign(frameworkComposeComponent, {
    [VNodeComponentSymbol]: true
  })

  return componentWithSymbol
}

/**
 *
 * common render constructor
 */
export function createRenderer3<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr2 extends PatchCommand[][],
  NewRendererPC, // pc at renderer layer
  ConstructProps,
  ModuleName
>(config: {
  module: SingleFileModule<P, L, PCArr2, ModuleName>
  renderHost: RenderHost
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr2, ModuleName>['layoutStruct'],
    NewRendererPC
  >
  createRenderContainer: RenderContainerConstructor<
    P,
    L,
    PCArr2,
    NewRendererPC,
    ConstructProps,
    ModuleName
  >
  stateManagement: StateManagementConfig
}) {
  const {
    module,
    override,
    renderHost,
    createRenderContainer,
    stateManagement
  } = config

  const rendererContext: CurrentRenderContext = {
    renderHost,
    createRenderContainer,
    stateManagement
  }

  const rendererContainer = createRenderContainer(
    renderHost.framework.lib,
    module,
    stateManagement,
    {
      useEmotion: renderHost.useEmotion
    }
  )

  let layoutJSON: VirtualLayoutJSON = null

  function construct<NewConstructPC>(
    props?: ConstructProps,
    secondOverride?: OverrideModule<
      P,
      SingleFileModule<
        P,
        L,
        [...PCArr2, NewRendererPC],
        ModuleName
      >['layoutStruct'],
      NewConstructPC
    >
  ) {
    const mergedOverrides: any = [override, secondOverride].filter(Boolean)

    pushCurrentRenderer(rendererContainer)
    const r = rendererContainer.construct<NewConstructPC>(
      props,
      mergedOverrides
    )
    popCurrentRenderer()

    traverseAndAttachRendererContext(r, rendererContext)

    layoutJSON = r

    return r
  }
  function render() {
    if (!layoutJSON) {
      return
    }
    return rendererContainer.render(layoutJSON)
  }

  const currentRendererInstance = {
    construct,
    render,
    rendererContext
  }

  return currentRendererInstance
}

export function extendModule<
  Props,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewProps extends Props,
  NewPC,
  ModuleName
>(
  module: SingleFileModule<Props, L, PCArr, ModuleName>,
  override: () => OverrideModule<
    NewProps,
    SingleFileModule<NewProps, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  return {
    ...module,
    override() {
      const p1 = module.override?.() || []
      const p2 = override()
      return [...p1, p2]
    }
  } as unknown as SingleFileModule<
    NewProps,
    L,
    [...PCArr, FormatPatchCommands<NewPC>],
    ModuleName
  >
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

// export function h2<
//   T extends string | Function,
//   CT1 extends string | Function = undefined,
//   CT2 extends string | Function = undefined,
//   CT3 extends string | Function = undefined,
//   C11 extends string | Function = undefined,
//   C12 extends string | Function = undefined,
//   C13 extends string | Function = undefined,
//   C21 extends string | Function = undefined,
//   C22 extends string | Function = undefined,
//   C23 extends string | Function = undefined,
//   C31 extends string | Function = undefined,
//   C32 extends string | Function = undefined,
//   C33 extends string | Function = undefined,
//   CB1 = undefined,
//   CB2 = undefined,
//   CB3 = undefined
// >(
//   type: T,
//   props?: Record<string, any> | null,
//   c1?: VLayoutNode<CT1, C11, C12, C13> | CB1,
//   c2?: VLayoutNode<CT2, C21, C22, C23> | CB2,
//   c3?: VLayoutNode<CT3, C31, C32, C33> | CB3
// ) {
//   if (isVNodeComponent(type)) {
//     const json = (type as any)({
//       ...(props || {})
//     })
//     return json as VLayoutNode<
//       T,
//       CT1,
//       CT2,
//       CT3,
//       C11,
//       C12,
//       C13,
//       C21,
//       C22,
//       C23,
//       C31,
//       C32,
//       C33,
//       CB1,
//       CB2,
//       CB3
//     >
//   }
//   let key: VLayoutNode<string>['key'] = props?.key
//   let children = []
//   if (props?.children) {
//     if (c1) {
//       key = c1
//     }
//     children = props.children
//     delete props.children
//   } else {
//     children = [c1, c2, c3].filter(Boolean)
//   }
//   if (key !== undefined) {
//     props.key = key
//   }

//   const vLayoutNode = {
//     type,
//     flags: VirtualNodeTypeSymbol,
//     props: props || {},
//     children: [c1, c2, c3].filter(Boolean)
//   } as unknown as VLayoutNode<
//     T,
//     CT1,
//     CT2,
//     CT3,
//     C11,
//     C12,
//     C13,
//     C21,
//     C22,
//     C23,
//     C31,
//     C32,
//     C33,
//     CB1,
//     CB2,
//     CB3
//   >

//   return vLayoutNode
// }
