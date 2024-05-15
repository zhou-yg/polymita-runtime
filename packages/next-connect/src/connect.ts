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
    return (props: Props) => {
      const { current } = useRef<{
        ctx: IHookContext,
        runner: ModelRunner<any>
      }>({
        ctx: null,
        runner: null,
      })
      if (current.ctx) {
        
      }

      const ele = f(props)
      return ele
    }
  }
}