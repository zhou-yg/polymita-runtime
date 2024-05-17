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
  getName,
  RunnerContext,
} from "@polymita/signal-model";

export function createConnect(p: {
  modelIndexes: IModelIndexesBase;
  plugin: Plugin;
  React: typeof ReactTypes;
}) {
  const { plugin, modelIndexes: mi, React } = p;
  const { useEffect, useState, useRef } = React;

  return <Props>(f: ReactTypes.FC<Props>) => {
    const namespace = getNamespace(f);
    const name = getName(f);
    const isComposedDriver = !!(f as any).__polymita_compose__;

    return (props: Props) => {
      const { current } = useRef<{
        ctx: IHookContext;
        runner: ModelRunner<ReactTypes.FC<Props>>;
      }>({
        ctx: null,
        runner: null,
      });
      let ele = null;
      if (!current.runner) {
        const runner = new ModelRunner(f, {
          plugin,
          runtime: "edge",
          believeContext: true,
          modelIndexes:
            namespace && mi && isComposedDriver
              ? (mi[namespace] as IModelIndexesBase)
              : mi,
        });
        ele = runner.init([props]);
        current.runner = runner;
      } else {
        ele = current.runner.run([props]);
      }

      typeof window !== "undefined" &&
        ((window as any).POLYMITA_RUNNER = Object.assign(
          (window as any).POLYMITA_RUNNER || {},
          { [name]: current },
        ));

      const [refresh, setRefreshCount] = useState(0);
      useEffect(() => {
        function fn() {
          setRefreshCount((v) => v + 1);
        }
        current.runner.scope.onUpdate(fn);
        current.runner.scope.activate();
        return () => {
          current.runner.scope.deactivate();
        };
      }, []);

      return ele;
    };
  };
}
