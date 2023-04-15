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
  const renderer = createRenderer2<
    P,
    L,
    PCArr,
    NewPC,
    NormalizeProps<P>,
    ModuleName
  >({
    module,
    renderHost,
    override,
    stateManagement: reactHookManagement.config,
    renderContainerCreator: reactRenderContainer.createReactContainer
  })

  return renderer
}

/**
 * R: React
 * S: Signal
 * 传入的props是信号
 */
export function createRSRender<
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
  const renderer = createRenderer2<P, L, PCArr, NewPC, P, ModuleName>({
    module,
    renderHost,
    override,
    stateManagement: reactSignalManagement.config,
    renderContainerCreator: reactRenderContainer.createReactContainer // @TODO1
  })

  return renderer
}

let idIndex = 0

export function clearIdIndex() {
  idIndex = 0
}

export function createComponent<T extends VNodeComponent2>(func: T) {
  function component(...args: Parameters<T>): ReturnType<VNodeComponent> {
    return func.apply(null, args)
  }
  Object.defineProperty(component, 'name', {
    get() {
      return func.name
    }
  })
  component[VNodeComponentSymbol] = true
  Object.keys(func).forEach(key => {
    component[key] = func[key]
  })
  return component
}
function createFunctionComponent<T extends VNodeComponent2>(
  func: T,
  name: string
) {
  function component(...args: Parameters<T>): ReturnType<VNodeComponent> {
    return func.apply(null, args)
  }
  Object.defineProperty(component, 'name', {
    get() {
      return name || 'Unknown function component'
    }
  })
  Object.keys(func).forEach(key => {
    component[key] = func[key]
  })
  component[VNodeFunctionComponentSymbol] = true
  return component
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

export function h(
  type: string | Function,
  props: Record<string, any> | null,
  ...children: (VirtualLayoutJSON | VirtualLayoutJSON[] | BaseDataType)[]
): VirtualLayoutJSON {
  if (isVNodeComponent(type)) {
    const json = (type as any)({
      ...(props || {}),
      children
    })
    return json
  }
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

/**
 * export hooks
 */

export function useLogic<T = any>(...args: any[]): T {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useLogic must be called in render function')
  }
  return renderer.renderHooksContainer.runLogic(...args) as T
}

export const useModule = useComponentModule
// export function useModule<
//   P extends Record<string, any>,
//   L extends LayoutStructTree,
//   PCArr extends PatchCommand[][],
//   NewPC,
//   ConstructProps,
//   ModuleName
// >(
//   module: SingleFileModule<P, L, PCArr, ModuleName>,
//   override?: OverrideModule<
//     P,
//     SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
//     NewPC
//   >
// ) {
//   const renderer = getCurrentRenderer()
//   if (!renderer) {
//     throw new Error('useModule must be called in render function')
//   }
//   const subModuleRenderer = createRenderer2<
//     P,
//     L,
//     PCArr,
//     NewPC,
//     ConstructProps,
//     ModuleName
//   >({
//     ...renderer.config,
//     module,
//     override
//   })

//   return createComponent(
//     <NewConstructPC>(
//       props: P & {
//         override?: OverrideModule<
//           P,
//           SingleFileModule<P, L, [...PCArr, NewPC], ModuleName>['layoutStruct'],
//           NewConstructPC
//         >
//         checkerTypes?: (arg: { l: L; pcArr: PCArr; newPC: NewPC }) => void
//       }
//     ) => {
//       const { override, ...rest } = props

//       return subModuleRenderer.construct<NewConstructPC>(
//         rest as ConstructProps,
//         override
//       )
//     }
//   )
// }
export function useComposeModule<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ConstructProps,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useModule must be called in render function')
  }
  const subModuleRenderer = createRenderer2<
    P,
    L,
    PCArr,
    NewPC,
    ConstructProps,
    ModuleName
  >({
    ...renderer.config,
    module,
    override
  })

  return createComponent(
    <NewConstructPC>(
      props: P & {
        override?: OverrideModule<
          P,
          SingleFileModule<P, L, [...PCArr, NewPC], ModuleName>['layoutStruct'],
          NewConstructPC
        >
        checkerTypes?: (arg: { l: L; pcArr: PCArr; newPC: NewPC }) => void
      }
    ) => {
      const { override, ...rest } = props

      return subModuleRenderer.construct<NewConstructPC>(
        rest as ConstructProps,
        override
      )
    }
  )
}
export function useComponentModule<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  NewPC,
  ConstructProps,
  ModuleName
>(
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  override?: OverrideModule<
    P,
    SingleFileModule<P, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useModule must be called in render function')
  }
  const subModuleRenderer = createRenderer2<
    P,
    L,
    PCArr,
    NewPC,
    ConstructProps,
    ModuleName
  >({
    ...renderer.config,
    module,
    override
  })

  return createFunctionComponent(
    <NewConstructPC>(
      props: P & {
        override?: OverrideModule<
          P,
          SingleFileModule<P, L, [...PCArr, NewPC], ModuleName>['layoutStruct'],
          NewConstructPC
        >
        checkerTypes?: (arg: { l: L; pcArr: PCArr; newPC: NewPC }) => void
        key?: any
      }
    ) => {
      const { override, ...rest } = props

      subModuleRenderer.construct<NewConstructPC>(
        rest as ConstructProps,
        override
      )
      return subModuleRenderer.render()
    },
    String(module.name)
  )
}

export function useLayout<T extends LayoutStructTree>() {
  const renderer = getCurrentRenderer()
  if (!renderer) {
    throw new Error('useLayout must be called in render function')
  }
  return renderer.renderHooksContainer.getLayout<T>()
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
export function overrideModule<
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  Props,
  NewProps extends Props,
  NewPC,
  ModuleName
>(
  module: SingleFileModule<Props, L, PCArr, ModuleName>,
  override: OverrideModule<
    NewProps,
    SingleFileModule<Props & NewProps, L, PCArr, ModuleName>['layoutStruct'],
    NewPC
  >
) {
  const newOverride = () => {
    const p1 = module.override?.() || []
    const p2 = override
    return [...p1, p2]
  }
  return {
    ...module,
    override: newOverride
  } as unknown as SingleFileModule<
    NewProps,
    L,
    [...PCArr, FormatPatchCommands<NewPC>],
    ModuleName
  >
}

/**
 *
 * common render constructor
 */
export function createRenderer2<
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
  renderContainerCreator: RenderContainer<
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
    renderHost,
    override,
    renderContainerCreator,
    stateManagement
  } = config

  if (module.name && /^[a-z]/.test(String(module.name))) {
    throw new Error(
      `First char of module name must be uppercase, but got ${module.name}.`
    )
  }

  const rendererContainer = renderContainerCreator(
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
    pushCurrentRenderer(currentRendererInstance)

    const mergedOverrides: any = [override, secondOverride].filter(Boolean)

    const r = rendererContainer.construct<NewConstructPC>(
      props,
      mergedOverrides
    )

    layoutJSON = r

    popCurrentRenderer()

    return r
  }
  function render() {
    if (!layoutJSON) {
      return
    }
    return rendererContainer.render(layoutJSON)
  }

  const currentRendererInstance = {
    renderHooksContainer: rendererContainer,
    construct,
    render,
    config
  }

  return currentRendererInstance
}
