import { IHookContext, Driver, EScopeState, IModelIndexesBase, RunnerModelScope, ModelRunner, getNamespace } from '@polymita/signal-model'
import type ReactTypes from 'react'
import { RenderDriver, getCurrentModelIndexes } from '../driver'
import { unstable_serialize } from 'swr'

export { RenderDriver } from '../driver'

let hookAdaptorRuntime: typeof ReactTypes = null
let hookAdaptorContext: ReactTypes.Context<RenderDriver> = null
export function setHookAdaptor(runtime: typeof ReactTypes) {
  if (!hookAdaptorRuntime) {
    hookAdaptorRuntime = runtime
  }
  if (!hookAdaptorContext) {
    const DriverContext = runtime.createContext<RenderDriver | null>(null)
    hookAdaptorContext = DriverContext
  }

  return hookAdaptorContext
}

type HasParamFunc = (...arg: any[]) => any
type NoParamFunc = () => any

export function useSignal<T extends NoParamFunc, U extends Parameters<T>>(
  driver: T
): ReturnType<T>
export function useSignal<T extends HasParamFunc, U extends Parameters<T>>(
  driver: T,
  ...args: U extends [] ? [] : U
): ReturnType<T>
export function useSignal(driver: Driver, ...args: any[]): any {
  return useReactHook(hookAdaptorRuntime, driver, args, getCurrentModelIndexes())
}

interface ICacheDriver<T extends Driver> {
  scope: RunnerModelScope<T>
  result: ReturnType<T>
}

declare global {
  var hookContextMap: {
    [k: string]: IHookContext[]
  }
  var runner: ModelRunner<any>
  var dc: any
  var driverWeakMap: Map<Driver, ArgResultMap>
}

type ArgResultMap = Map<string, any>

const driverWeakMap = new Map<Driver, ArgResultMap>()

typeof window !== 'undefined' && (window.driverWeakMap = driverWeakMap)

export function useReactHook<T extends Driver>(
  react: typeof ReactTypes,
  hook: T, args: Parameters<T>,
  currentModelIndexes: IModelIndexesBase
) {
  const { useRef, useContext, useEffect, useState } = react

  const init = useRef(null) as { current: ICacheDriver<T> | null }
  const driver: RenderDriver = useContext(hookAdaptorContext)

  if (!init.current) {

    const serializedArgs = unstable_serialize(args)
    const cachedDriverResult: {
      scope: RunnerModelScope<T>
      result: ReturnType<T>
    } = driverWeakMap.get(hook)?.get(serializedArgs)

    // match the cache
    if (cachedDriverResult) {
      init.current = {
        scope: cachedDriverResult.scope,
        result: Object.assign({
          [scopeSymbol]: cachedDriverResult.scope,
        }, cachedDriverResult.result),
      }
    } else {
      const bmName: string = hook.__name__ || hook.name
      let ssrContext: IHookContext[] = []
      if (driver) {
        ssrContext = driver.getContext(bmName) || []
      } else {
        throw new Error('[useTarat] must provide a DriverContext at Root ')
      }
  
      const namespace = getNamespace(hook)
      const isComposedDriver  = !!(hook as any).__tarat_compose__

      const runner = new ModelRunner(
        hook,
        {
          beleiveContext: driver.believeContext,
          updateCallbackSync: driver.updateCallbackSync,
          modelIndexes: namespace && currentModelIndexes && isComposedDriver ? currentModelIndexes[namespace] as IModelIndexesBase : currentModelIndexes
        }
      )

      const initialContext = ssrContext.pop()

      const scope = runner.prepareScope(args, initialContext)
      driver?.push(scope, bmName)

      const r = runner.executeDriver(scope)

      init.current = {
        scope,
        result: Object.assign({
          [scopeSymbol]: scope,
        }, r)
      };
      typeof window !== 'undefined' && ((window as any).POLYMITA_RUNNER = init.current);
  
      let m = driverWeakMap.get(hook)
      if (!m) {
        m = new Map
        driverWeakMap.set(hook, m)
      }
      m.set(serializedArgs, {
        scope,
        result: r,
      })
    }
  }
  // release event
  useEffect(() => {
    function fn() {
      setHookResult({ ...init.current.result })
    }
    init.current.scope.onUpdate(fn)
    init.current.scope.activate()
    return () => {
      init.current.scope.deactivate()
    }
  }, [])

  const [hookResult, setHookResult] = useState(init.current.result)
  return hookResult as ReturnType<T>
}


const scopeSymbol = Symbol.for('@taratReactScope')
export interface IProgress {
  state: EScopeState
}
export function useProgress<T extends Driver> (result: ReturnType<T>): IProgress | null {
  const state = result[scopeSymbol].getState()
  return {
    state,
  }
}

export function getReactAdaptor () {
  let rd: RenderDriver;
  
  if (!hookAdaptorContext) {
    throw new Error('[polymita/connect] must call "setHookAdaptor" before rendering')
  }

  const TopContext = hookAdaptorContext
  const React = hookAdaptorRuntime;

  return {
    getRoot (e: ReactTypes.ReactElement): ReactTypes.ReactElement {
      if (!rd) {
        rd = new RenderDriver()
      }
      rd.mode = 'collect'
      return React.createElement(TopContext.Provider, { value: rd }, e)
    },
    getUpdateRoot (e: ReactTypes.ReactElement): ReactTypes.ReactElement {
      rd.switchToServerConsumeMode()
      return React.createElement(TopContext.Provider, { value: rd }, e)
    },    
    get driver () {
      return rd
    }
  }
}