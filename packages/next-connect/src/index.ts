import {
  Driver,
  IHookContext,
  IModelIndexesBase,
  ModelRunner,
  Plugin,
} from "@polymita/signal-model";

export * from "./hooks";

export function createGetContext(p: {
  modelIndexes: IModelIndexesBase;
  createPlugin: () => Plugin;
}) {
  const { modelIndexes, createPlugin } = p;

  async function getContext<T extends Driver>(
    signal: Driver,
    ...args: Parameters<T>
  ) {
    const runner = new ModelRunner(signal, {
      modelIndexes,
      plugin: createPlugin(),
      believeContext: false,
      runtime: typeof window === "undefined" ? "nodejs" : "edge",
    });

    const result: ReturnType<T> = runner.init(args);

    await runner.ready();

    return [result, runner.scope.createBaseContext()] as [
      ReturnType<T>,
      IHookContext,
    ];
  }

  return getContext;
}
