import type ReactTypes from "react";
import {
  Plugin,
  IHookContext,
  Driver,
  EScopeState,
  IModelIndexesBase,
  RunnerModelScope,
  ModelRunner,
  getNamespace,
} from "@polymita/signal-model";

type HasParamFunc = (...arg: any[]) => any;
type NoParamFunc = () => any;

export function createUseSignal(p: {
  modelIndexes: IModelIndexesBase;
  plugin: Plugin;
  React: typeof ReactTypes;
}) {
  const { plugin, modelIndexes: mi, React } = p;
  const { useEffect, useState, useRef } = React;

  function useSignal<T extends NoParamFunc, U extends Parameters<T>>(
    ssrContext: IHookContext | null | undefined,
    driver: T,
  ): ReturnType<T>;
  function useSignal<T extends HasParamFunc, U extends Parameters<T>>(
    ssrContext: IHookContext | null | undefined,
    driver: T,
    ...args: U extends [] ? [] : U
  ): ReturnType<T>;
  function useSignal<T extends HasParamFunc, U extends Parameters<T>>(
    driver: T,
    ...args: U extends [] ? [] : U
  ): ReturnType<T>;
  function useSignal(ssrContext: any, driver: any, ...args: any[]): any {
    if (typeof ssrContext === "function") {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useReactHook(undefined, ssrContext, [driver, ...args]);
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useReactHook(ssrContext, driver, args);
  }

  interface ICacheDriver<T extends Driver> {
    scope: RunnerModelScope<T>;
    result: ReturnType<T>;
  }

  type ArgResultMap = Map<string, any>;

  const driverWeakMap = new Map<Driver, ArgResultMap>();

  function useReactHook<T extends Driver>(
    ssrContext: IHookContext | null | undefined,
    hook: T,
    args: Parameters<T>,
  ) {
    const init = useRef(null) as { current: ICacheDriver<T> | null };

    const runtime = typeof window === "undefined" ? "nodejs" : "edge";

    if (!init.current) {
      const serializedArgs = JSON.stringify(args);
      const cachedDriverResult: {
        scope: RunnerModelScope<T>;
        result: ReturnType<T>;
      } = driverWeakMap.get(hook)?.get(serializedArgs);

      // match the cache
      if (cachedDriverResult) {
        init.current = {
          scope: cachedDriverResult.scope,
          result: Object.assign(
            {
              [scopeSymbol]: cachedDriverResult.scope,
            },
            cachedDriverResult.result,
            ``,
          ),
        };
      } else {
        const namespace = getNamespace(hook);
        const isComposedDriver = !!(hook as any).__polymita_compose__;

        const runner = new ModelRunner(hook, {
          plugin,
          runtime,
          believeContext: true,
          modelIndexes:
            namespace && mi && isComposedDriver
              ? (mi[namespace] as IModelIndexesBase)
              : mi,
        });

        const scope = runner.prepareScope(args, ssrContext);

        const r = runner.executeDriver(scope);

        init.current = {
          scope,
          result: Object.assign(
            {
              [scopeSymbol]: scope,
            },
            r,
          ),
        };
        typeof window !== "undefined" &&
          ((window as any).POLYMITA_RUNNER = init.current);

        let m = driverWeakMap.get(hook);
        if (!m) {
          m = new Map();
          driverWeakMap.set(hook, m);
        }
        // @TODO no cache ?
        // m.set(serializedArgs, {
        //   scope,
        //   result: r,
        // });
      }
    }
    // release event
    useEffect(() => {
      function fn() {
        setTimeout(() => {
          setHookResult({ ...init.current.result });
        });
      }
      init.current.scope.onUpdate(fn);
      init.current.scope.activate();
      return () => {
        init.current.scope.deactivate();
      };
    }, []);

    const [hookResult, setHookResult] = useState(init.current.result);
    return hookResult as ReturnType<T>;
  }

  return useSignal;
}

const scopeSymbol = Symbol.for("@taratReactScope");
export interface IProgress {
  state: EScopeState;
}
export function useProgress<T extends Driver>(
  result: ReturnType<T>,
): IProgress | null {
  const state = result[scopeSymbol].getState();
  return {
    state,
  };
}
