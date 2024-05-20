import {
  Driver,
  getNamespace,
  IHookContext,
  IModelIndexesBase,
  ModelRunner,
  Plugin,
} from "@polymita/signal-model";

export * from "./signalHooks";
export * from "./connect";

export function createGetContext(p: {
  modelIndexes: IModelIndexesBase;
  createPlugin: () => Plugin;
}) {
  const { modelIndexes, createPlugin } = p;

  async function getContext<T extends Driver>(
    signal: Driver,
    ...args: Parameters<T>
  ) {
    const namespace = getNamespace(signal);
    const isComposedDriver = !!(signal as any).__polymita_compose__;

    console.log(
      "namespace && mi && isComposedDriver: ",
      namespace,
      isComposedDriver,
    );

    const runner = new ModelRunner(signal, {
      modelIndexes:
        namespace && modelIndexes && isComposedDriver
          ? (modelIndexes[namespace] as IModelIndexesBase)
          : modelIndexes,
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
