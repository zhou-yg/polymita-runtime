import { OverrideModule, RenderContainerConstructorOption, SingleFileModule, StateManagementConfig, VirtualLayoutJSON } from "../../types";
import {
  Driver
} from '@polymita/signal-model'
import {
  isVirtualNode, assignPattern,
  SEMATIC_RELATION_HAS, SEMATIC_RELATION_IS, mergeFromProps, renderHTMLProp, shouldNotRender, assignDefaultValueByPropTypes, ShouldRenderAttr, lowerCaseType, isVNodeComponent, 
  getNodeType,
  getModuleFromFunctionComponent} from '../../utils'
import { runLayoutAndRulesOverrides, proxyLayoutJSON, ProxyLayoutHandler, assignRules, getActiveModuleByBase, mergeOverrideModules, runLogicOverrides } from "../../override";

import { LayoutStructTree, ConvertToLayoutTreeDraft, PatchCommand, BaseDataType } from "../../types-layout";
import { NormalizeProps } from '../../types';
import { assignDeclarationPatterns } from "../../pattern";
import { createFunctionComponent, migrateRenderContext } from "../../render.new";

type ArgResultMap = Map<string, any>
const driverWeakMap = new Map<Driver, ArgResultMap>()

typeof window !== 'undefined' && (window.driverWeakMap = driverWeakMap)

interface ModuleCache {
  props?: any;
  proxyHandler?: ProxyLayoutHandler
  logicResult?: any
}
/**
 * fix error:
 *    react-dom.development.js:86 Warning: Received `true` for a non-boolean attribute `is-container`.If you want to write it to the DOM, pass a string instead: is-container="true" or is-container={value.toString()}.
 */
function filterPatternSematicProps(props?: any) {
  if (!props) {
    return props
  }
  const obj: VirtualLayoutJSON['props'] = {}
  Object.keys(props).forEach(key => {
    if (key.startsWith(`${SEMATIC_RELATION_IS}-`) || key.startsWith(`${SEMATIC_RELATION_HAS}-`)) {
      obj[key] = 1
    } else if (key === renderHTMLProp) {
      obj.dangerouslySetInnerHTML =  { __html: props[key] }
    } else {
      obj[key] = props[key]
    }
  })

  return obj
}
/**
 * in web-component mode, we need to transform className to class
 * because React wont convert "className" to "class" by default
 */
function transformClsName (props: any, type: string | Function) {
  if (
    props?.className && 
    typeof type === 'string' &&
    /[a-z]+(?:[A-Z][a-z]*)+/.test(type)
  ) {
    props.class = props.className
    delete props.className;
  }
  return props;
}

export function createReactContainer<
  P extends Record<string, any>,
  L extends LayoutStructTree,
  PCArr extends PatchCommand[][],
  ModuleName
>(
  React: any,
  module: SingleFileModule<P, L, PCArr, ModuleName>,
  stateManagement: StateManagementConfig,
  options?: RenderContainerConstructorOption
) {
  // shallow copy so that can mark cache in module
  module = {...module}
  const cacheSymbol = Symbol('cacheSymbol')

  const modulePropTypes = module.propTypes
  const runReactLogic = stateManagement?.runLogic.bind(null, React, module.logic)

  const convertProps = stateManagement?.convertProps || (<T>(props: T) => props)

  function initLogic (props?: any) {
    let cache: ModuleCache = module[cacheSymbol]
    if (cache) {
      cache.props = props
    } else {
      module[cacheSymbol] = { props }
      cache = module[cacheSymbol]
    }

    if (!runReactLogic || !module.logic) {
      return
    }
    const r = runReactLogic([props])
    cache.logicResult = r
    cache.props = props

    return r
  }
  function updateLogic(r: any) {
    let cache: ModuleCache = module[cacheSymbol]
    if (cache) {
      cache.logicResult = r
    }
  }

  function runLogicFromCache () {
    const cache: ModuleCache = module[cacheSymbol]
    if (cache) {
      return cache.logicResult
    }
    throw new Error('[runLogic] must run with cached props')
  }

  function getLayoutFromModule (props: any): ModuleCache {
    const cache: ModuleCache = module[cacheSymbol]

    if (cache && cache.proxyHandler) {
      return cache
    }

    const json = module.layout?.(props)
    const handler = proxyLayoutJSON(json)
    
    if (json) {
      cache.proxyHandler = handler
    }

    return cache
  }
  function disposeFromModule () {
    delete module[cacheSymbol]
  }

  function createElementDepth (json: VirtualLayoutJSON, options: RenderContainerConstructorOption) {
    if (!json) {
      return
    }

    if (!isVirtualNode(json)) {
      return json
    }

    if (isVNodeComponent(json)) {
      json = (json.type as any)({
        ...(json.props || {}),
        children: json.children
      })
    }

    if (shouldNotRender(json)) {
      return null
    }
    /**
     * it's danger
     */
    if (ShouldRenderAttr in json?.props) {
      delete json.props[ShouldRenderAttr]
    }

    let children = json.children

    const nodeType = getNodeType(json.type, json.props)
    let elementArgs = [nodeType, transformClsName(filterPatternSematicProps(json.props), json.type)];

    const originModule = getModuleFromFunctionComponent(nodeType)
    if (originModule) {
      // console.log('[render] originModule: ', options.modulesLinkMap, originModule.namespace, originModule.name);
      const alreadyActiveOverrideModules = getActiveModuleByBase(originModule, options.modulesLinkMap, options.modulesActiveMap)
      // console.log('[render] readyActiveOverrideModules: ', alreadyActiveOverrideModules);
      if (alreadyActiveOverrideModules?.length) {
        const newModule = mergeOverrideModules(alreadyActiveOverrideModules)
        const newNodeType = createFunctionComponent(newModule)
        migrateRenderContext(nodeType, newNodeType)
        elementArgs[0] = newNodeType
      }
    }

    if (Array.isArray(json.children)) {
      children = json.children.map(child => {
        if (isVirtualNode(child)) {
          return createElementDepth(child, options)
        }
        return child
      })
      elementArgs.push(...children)
    } else {
      if (isVirtualNode(json.children)) {
        children = createElementDepth(json.children, options)
      }
      elementArgs.push(children)
    }
    return React.createElement(...elementArgs)
  }
  
  function construct<NewConstructPC, NewRenderPC>(props?: NormalizeProps<P>, overrides?: [
    OverrideModule<P, SingleFileModule<P, L, [...PCArr, NewRenderPC], ModuleName>['layoutStruct'], NewRenderPC>,
    OverrideModule<P, SingleFileModule<P, L, [...PCArr, NewRenderPC, NewConstructPC], ModuleName>['layoutStruct'], NewConstructPC>
  ]) {
    /**
     * 处理props
     * 1.填充propTypes default
     * 2.使用插件的convertProps拓展转换
     */
    if (!props) {
      props = {} as any
    }
    const defaultPropsRef = React.useRef(null)
    if (!defaultPropsRef.current) {
      defaultPropsRef.current = assignDefaultValueByPropTypes({}, modulePropTypes)
    }

    props = Object.assign({}, defaultPropsRef.current, props)
    const convertedProps: P = convertProps(props, modulePropTypes) as unknown as P

    const moduleOverrides = module.override?.() || []
    const allOverrideModules = [...moduleOverrides, ...overrides] as unknown as OverrideModule<any, any, any>[]
    // console.log('[construct] allOverrideModules: ', allOverrideModules[0]?.patchLayout.toString());

    const logicResult = initLogic(convertedProps)
    const overrideLogicResult = runLogicOverrides(allOverrideModules, convertedProps, logicResult)
    if (overrideLogicResult !== logicResult) {
      updateLogic(overrideLogicResult)
    }

    const { proxyHandler } = getLayoutFromModule(convertedProps)
    if (proxyHandler) {
      // inject & keep reference
      const rules = module.styleRules?.(convertedProps, proxyHandler.draft)
      if (rules) {
        assignRules(proxyHandler.draft, rules)
      }

      runLayoutAndRulesOverrides(allOverrideModules, convertedProps, proxyHandler.draft);
      
      allOverrideModules.forEach(override => {
        proxyHandler.append(override.patches)
      })

      let newJSON = proxyHandler.apply()
      
      // assign top attributes to root Node
      newJSON = mergeFromProps(newJSON, props, ['className', 'id', 'style'])

      const patternResult = module.designPattern?.(convertedProps)
      if (patternResult) {
        newJSON = assignPattern(newJSON, patternResult, options.useEmotion)
      }

      const declarationPatterns = module.designPatterns?.(convertedProps)
      if (declarationPatterns) {
        if (Array.isArray(declarationPatterns)) {
          newJSON = assignDeclarationPatterns(newJSON, declarationPatterns)
        } else {
          // TODO
        }
      }

      /** modify layout json */
      stateManagement?.transform?.(newJSON)

      disposeFromModule()

      return newJSON
    }
    return null
  }

  function render (json: VirtualLayoutJSON) {
    const root = createElementDepth(json, options)
    return root
  }

  function getLayout<T extends LayoutStructTree> (props?: any) {
    const convertedProps: P = convertProps(props, modulePropTypes) as unknown as P   
    const { proxyHandler } = getLayoutFromModule(convertedProps)
    return proxyHandler?.draft as ConvertToLayoutTreeDraft<T>
  }

  return {
    render,
    construct,
    runLogic: runLogicFromCache,
    getLayout,
  }
}