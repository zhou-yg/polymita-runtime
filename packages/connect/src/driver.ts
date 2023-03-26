import {
  RunnerModelScope,
  IHookContext,
  IModelIndexesBase,
} from "@polymita/signal-model";

let currentModelIndexes: IModelIndexesBase | null = null;
export function getCurrentModelIndexes() {
  return currentModelIndexes;
}
export function registerModelIndexes(indexes: IModelIndexesBase | null) {
  currentModelIndexes = indexes;
}

export class RenderDriver {
  mode?: "collect" | "consume";

  believeContext = false;
  updateCallbackSync = false;

  BMValuesMap: Map<string, RunnerModelScope<any>[]> = new Map();

  pushListener?: (scope: RunnerModelScope<any>) => void;

  consumeCache: Map<string, IHookContext[] | undefined> = new Map();

  fromContextMap(contextMap: Record<string, IHookContext[]>) {
    Object.keys(contextMap).forEach((bmName) => {
      this.consumeCache.set(bmName, contextMap[bmName]);
    });
  }

  switchToServerConsumeMode() {
    this.mode = "consume";
    this.believeContext = true;
    this.updateCallbackSync = false;
  }
  switchToClientConsumeMode() {
    this.mode = "consume";
    this.believeContext = false;
    this.updateCallbackSync = true;
  }

  pop(name: string) {
    return this.BMValuesMap.get(name)?.pop();
  }

  getContext(name: string) {
    if (this.mode !== "consume") {
      return;
    }
    let r = this.consumeCache.get(name);
    if (!r) {
      r = this.BMValuesMap.get(name)?.map((s) => s.createInputComputeContext());
      this.consumeCache.set(name, r);
    }

    return r;
  }

  onPush(f: (scope: RunnerModelScope<any>) => void) {
    this.pushListener = f;
  }

  push(scope: RunnerModelScope<any>, name: string) {
    if (this.mode !== "collect") {
      return;
    }

    let values = this.BMValuesMap.get(name);
    if (!values) {
      values = [];
      this.BMValuesMap.set(name, values);
    }
    this.pushListener?.(scope);
    return values.push(scope);
  }
}
