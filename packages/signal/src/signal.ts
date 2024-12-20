import {
  isFunc,
  map,
  IHookContext,
  isDef,
  likeObject,
  isPromise,
  nextTick,
  calculateChangedPath,
  isEqual,
  TPath,
  shallowCopy,
  log,
  Driver,
  isPrimtive,
  last,
  getDeps,
  cloneDeep,
  THookDeps,
  isGenerator,
  runGenerator,
  makeBatchCallback,
  isUndef,
  getName,
  getNames,
  THookNames,
  IStatePatchRecord,
  IDataPatch,
  isDataPatch,
  shortValue,
  get,
  getNamespace,
  THookDepUnit,
  mergeInitialArgs,
} from "./util";
import EventEmitter from "./lib/eventemitter3";
import type { Draft } from "immer";
import { produceWithPatches, enablePatches } from "immer";
import { Plugin, TCacheFrom } from "./plugin2";

export { produceWithPatches, applyPatches } from "immer";
export { default as EventEmitter } from "./lib/eventemitter3";

enablePatches();

export function freeze(target: { _hook?: { freezed?: boolean } }) {
  if (target._hook) {
    target._hook.freezed = true;
  }
}
function unFreeze(target: { _hook?: { freezed?: boolean } }) {
  if (target._hook) {
    target._hook.freezed = false;
  }
}
export function checkFreeze(target: { _hook?: { freezed?: boolean } }) {
  return target._hook?.freezed === true;
}

interface ITarget<T> {
  watcher: Watcher<T>;
  notify: (
    hook?: ISource<T>,
    patches?: IDataPatch[],
    rc?: ReactiveChain,
  ) => void;
  addDep: (source: ISource<T>, path?: (number | string)[]) => void;
}

export interface ISource<U> {
  watchers: Set<Watcher<U>>;
  addWatcher: (w: Watcher<U>) => void;
}

export class Watcher<T = Hook> {
  deps: Map<ISource<T>, (string | number)[][]> = new Map();
  constructor(public target: ITarget<ISource<T>>) {}
  notify(
    dep: ISource<T>,
    path: TPath,
    patches?: IDataPatch[],
    reactiveChain?: ReactiveChain,
  ) {
    const paths = this.deps.get(dep);
    const matched = paths?.some((p) => isEqual(p, path));
    if (matched) {
      this.target.notify(dep, patches, reactiveChain);
      return true;
    }
  }
  addDep(dep: ISource<T>, path: (number | string)[] = []) {
    dep.addWatcher(this);
    if (path.length === 0) {
      path = [""];
    }
    let paths = this.deps.get(dep);
    if (paths) {
      const exist = paths.find((p) => p === path || isEqual(p, path));
      if (!exist) {
        paths.push(path);
      }
    } else {
      paths = [path];
      this.deps.set(dep, [path]);
    }
    return () => {
      const paths = this.deps.get(dep);
      const existIndex = paths?.findIndex((p) => isEqual(p, path));
      if (paths && existIndex && existIndex > -1) {
        paths?.splice(existIndex, 1);
      }
    };
  }
}

export class Hook extends EventEmitter {
  /** hook's name for debugging */
  name?: string;
  /** hook's dep index for debugging */
  index?: number;
  freezed?: boolean;
  watchers = new Set<Watcher<typeof this>>();
  addWatcher(w: Watcher<Hook>) {
    this.watchers.add(w);
  }
}
export function isState(h: { _hook?: State }) {
  return h && (h._hook ? h._hook instanceof State : h instanceof State);
}

export function isSignal(h: {
  _hook?: State | Computed<any>;
}): h is Signal<any> {
  return h?._hook && (h._hook instanceof Computed || h._hook instanceof State);
}

export enum EHookEvents {
  change = "change",
  beforeCalling = "beforeCalling",
  afterCalling = "afterCalling",
}

function getValueSilently(s: State) {
  return s._internalValue;
}

export function internalProxy<T>(
  source: State<T>,
  _internalValue: T,
  path: (string | number)[] = [],
): T {
  if (underComputed()) {
    last(currentComputedStack).watcher.addDep(source, path);
    if (_internalValue && likeObject(_internalValue)) {
      const copyValue = shallowCopy(_internalValue);
      return new Proxy(copyValue as any, {
        get(target, p: string) {
          let value = Reflect.get(target, p);
          if (typeof value === "function") {
            value = value.bind(target);
          }
          return internalProxy(source, value, path.concat(p));
        },
      });
    }
  }
  return _internalValue;
}

export class State<T = any> extends Hook {
  _internalValue: T;
  freezed?: boolean;
  modifiedTimestamp = Date.now();
  inputComputePatchesMap: Map<InputCompute, [T, IDataPatch[]]> = new Map();

  contextName = "state";
  needContextValue = true;

  needCheckAndRefresh = false;

  applyComputeAsync = false;

  constructor(data: T) {
    super();
    this._internalValue = data;
  }
  trigger(
    path: (number | string)[] = [""],
    patches?: IDataPatch[],
    reactiveChain?: ReactiveChain<T>,
    triggeredSet?: Set<Watcher>,
  ) {
    if (!path || path.length === 0) {
      path = [""];
    }
    if (!triggeredSet) {
      triggeredSet = new Set();
    }
    this.watchers.forEach((w) => {
      if (triggeredSet?.has(w)) {
        return;
      }
      if (w.notify(this, path, patches, reactiveChain)) {
        triggeredSet?.add(w);
      }
    });
    return triggeredSet;
  }

  hasPatches(ic: InputCompute) {
    const arr = this.inputComputePatchesMap.get(ic);
    return arr && arr.length > 0;
  }

  get value(): T {
    if (currentInputCompute) {
      return this.getInputComputeDraftValue();
    }
    return internalProxy(this, this._internalValue);
  }
  update(
    v: T,
    patches?: IDataPatch[],
    silent?: boolean,
    reactiveChain?: ReactiveChain<T>,
  ) {
    const oldValue = this._internalValue;
    this._internalValue = v;
    const shouldTrigger = oldValue !== v && !isEqual(oldValue, v);
    if (shouldTrigger) {
      this.modifiedTimestamp = Date.now();
      this.emit(EHookEvents.change, this);
    }
    reactiveChain?.update();

    if (silent) {
      return;
    }

    log(
      `[${this.name}][state.update] shouldTrigger=`,
      shouldTrigger,
      oldValue,
      v,
    );
    // trigger only changed
    if (shouldTrigger) {
      const triggeredSet = this.trigger(undefined, undefined, reactiveChain);

      if (patches && patches.length > 0) {
        const changedPathArr = calculateChangedPath(oldValue, patches);
        changedPathArr
          .filter((p) => p.length !== 0)
          .forEach((path) =>
            this.trigger(path, patches, reactiveChain, triggeredSet),
          );
      }
    }
  }
  applyComputePatches(ic: InputCompute, reactiveChain?: ReactiveChain<T>) {
    let exist = this.inputComputePatchesMap.get(ic);
    if (exist) {
      this.inputComputePatchesMap.delete(ic);
      this.update(
        exist[0],
        exist[1]?.filter(isDataPatch) as IDataPatch[],
        false,
        reactiveChain,
      );
    }
  }
  getInputComputeDraftValue(): T {
    let exist = this.inputComputePatchesMap.get(currentInputCompute!);
    if (exist) {
      return exist[0];
    } else {
      if (isPrimtive(this._internalValue)) {
        return this._internalValue;
      }
      return shallowCopy(this._internalValue);
    }
  }
  addComputePatches(value: T, patches: IDataPatch[]) {
    if (currentInputCompute) {
      let exist = this.inputComputePatchesMap.get(currentInputCompute);
      if (!exist) {
        exist = [value, []];
      }
      exist[0] = value;
      /**
       * @TODO：need merging patches
       */
      exist[1] = exist[1].concat(patches);
      this.inputComputePatchesMap.set(currentInputCompute, exist);
    } else {
      throw new Error(
        "[Model.addComputePatches] must invoked under a InputCompute",
      );
    }
  }

  checkAndRefresh() {}
}

type TStateKey = string;

interface AsyncHook<T> {
  init: boolean;
  getterPromise: Promise<T> | null;
  startAsyncGetter: () => { end: () => void; valid: () => boolean };
  pending: boolean;
}

export class AsyncState<T> extends State<T> implements AsyncHook<T> {
  init = true;
  getterPromise: Promise<T> | null = null;
  asyncCount = 0;
  startAsyncGetter() {
    this.asyncCount++;
    const currentCount = this.asyncCount;
    this.init = false;
    let resolve: Function;
    this.getterPromise = new Promise((r) => (resolve = r));

    return {
      end: () => {
        resolve();
        this.getterPromise = null;
      },
      valid: () => {
        return this.asyncCount <= currentCount;
      },
    };
  }
  get pending() {
    return !!this.getterPromise;
  }
}

/**
 * check if running inside a computed
 */
let currentComputedStack: Computed<any>[] = [];

export function underComputed() {
  return currentComputedStack.length > 0;
}

function pushComputed(c: Computed<any>) {
  currentComputedStack.push(c);
}
function popComputed() {
  currentComputedStack.pop();
}
// just for unit test
export function setCurrentComputed(c: Computed<any>[]) {
  currentComputedStack = c;
}

export type FComputedFuncGenerator<T> = (prev?: T) => Generator<any, any, any>;
export type FComputedFuncAsync<T> = (prev?: T) => T;
export type FComputedFunc<T> = (prev?: T) => T;
/**
 * Not real symbol because of the symbol can't be serialized by JSON.stringify
 */
export const ComputedInitialSymbol = "@@ComputedInitialSymbol";

export class Computed<T> extends AsyncState<T | string> implements ITarget<T> {
  batchRunCancel: () => void = () => {};
  watcher: Watcher<State<any>> = new Watcher<State<any>>(this);

  static underComputed = underComputed;

  // @TODO: maybe here need trigger async optional setting
  constructor(
    public getter:
      | FComputedFunc<T | string>
      | FComputedFuncAsync<T | string>
      | FComputedFuncGenerator<T | string>,
  ) {
    super(ComputedInitialSymbol);
  }

  override get value(): T | string {
    const callChain = currentReactiveChain?.addCall(this);
    // console.log(`[Computed.get] name=${this.name}, isInit=`, this._internalValue === ComputedInitialSymbol);
    if (this._internalValue === ComputedInitialSymbol) {
      this.tryModify(callChain);
    }
    const v = super.value;
    return v === ComputedInitialSymbol ? undefined : v;
  }

  run(innerReactiveChain?: ReactiveChain) {
    pushComputed(this);

    type ComputedReturnType = T | string;
    // making sure the hook called by computed can register thier chain
    const r:
      | ComputedReturnType
      | Promise<ComputedReturnType>
      | Generator<unknown, ComputedReturnType> = ReactiveChain.withChain(
      innerReactiveChain,
      () => {
        return this.getter(this._internalValue);
      },
    );

    popComputed();
    if (isPromise(r)) {
      const { end, valid } = this.startAsyncGetter();
      (r as unknown as Promise<ComputedReturnType>).then(
        (asyncResult: ComputedReturnType) => {
          if (valid()) {
            this.update(asyncResult, [], false, innerReactiveChain);
            end();
          }
        },
      );
    } else if (isGenerator(r)) {
      const { end, valid } = this.startAsyncGetter();
      (
        runGenerator(
          r as Generator,
          () => pushComputed(this),
          () => popComputed(),
        ) as unknown as Promise<ComputedReturnType>
      ).then((asyncResult: ComputedReturnType) => {
        if (valid()) {
          this.update(asyncResult, [], false, innerReactiveChain);
          end();
        }
      });
    } else {
      this.update(
        r as unknown as ComputedReturnType,
        [],
        false,
        innerReactiveChain,
      );
      /** @TODO this code need consider again.maybe need re-design */
      this.init = false;
    }
  }
  tryModify(reactiveChain?: ReactiveChain) {
    this.run(reactiveChain?.add(this));
  }
  notify(h?: ISource<T>, p?: IDataPatch[], reactiveChain?: ReactiveChain) {
    /**
     * trigger synchronism
     */
    this.run(reactiveChain?.addNotify(this));
  }

  addDep(source: ISource<T>, path: (string | number)[]) {
    this.watcher.addDep(source, path);
  }
}

/**
 * control global InputCompute while running
 */
let currentInputCompute: InputCompute | null = null;
const inputComputeStack: InputCompute[] = [];

export function getCurrentInputCompute() {
  return currentInputCompute;
}

function pushInputComputeStack(ic: InputCompute) {
  inputComputeStack.push(ic);
  currentInputCompute = ic;
}
function popInputComputeStack() {
  currentInputCompute = inputComputeStack[inputComputeStack.length - 2];
  return inputComputeStack.pop();
}

export type InputComputeFn<T extends any[]> = (...arg: T) => void;
export type AsyncInputComputeFn<T extends any[]> = (...arg: T) => Promise<void>;
export type GeneratorInputComputeFn<T extends any[]> = (
  ...arg: T
) => Generator<any, any, any>;

export class InputCompute<P extends any[] = any> extends Hook {
  commitPromise: Promise<void> | null = null;
  constructor(
    public getter:
      | InputComputeFn<P>
      | AsyncInputComputeFn<P>
      | GeneratorInputComputeFn<P>,
    /** @TODO should not couple the "scope" */
    public scope: CurrentRunnerScope,
  ) {
    super();
  }
  inputFuncStart() {}
  commitComputePatches(
    reactiveChain?: ReactiveChain,
  ): (void | Promise<void>)[] | undefined {
    if (this.commitPromise) {
      this.commitPromise = this.commitPromise.then(() => {
        const r = this.scope.applyAllComputePatches(this, reactiveChain);
        if (r?.some((p) => isPromise(p))) {
          return Promise.all(r).then();
        }
      });
      return [this.commitPromise];
    }
    const r = this.scope.applyAllComputePatches(this, reactiveChain);
    if (r?.some((p) => isPromise(p))) {
      this.commitPromise = Promise.all(r).then();
    }
    return r;
  }
  inputFuncEnd(reactiveChain?: ReactiveChain): Promise<void> {
    const r = this.commitComputePatches(reactiveChain);
    unFreeze({ _hook: this });
    this.emit(EHookEvents.afterCalling, this);

    if (r?.some((p) => isPromise(p))) {
      return Promise.all(r).then((r) => {
        this.commitPromise = null;
      });
    }
    return Promise.resolve();
  }

  async run(...args: any): Promise<void> {
    this.emit(EHookEvents.beforeCalling, this);
    const isFreeze = checkFreeze({ _hook: this });
    if (isFreeze) {
      return;
    }

    // confirm：the composed inputCompute still running under the parent inputCompute
    // if (!currentInputCompute) {
    //   currentInputCompute = this
    // }

    // means that current IC is nested in other IC.
    if (currentInputCompute) {
      const r = currentInputCompute.commitComputePatches(currentReactiveChain);
      if (r?.some((p) => isPromise(p))) {
        await Promise.all(r);
      }
    }

    pushInputComputeStack(this);

    const newReactiveChain = currentReactiveChain?.addCall(this);
    const funcResult = ReactiveChain.withChain(newReactiveChain, () => {
      return this.getter(...args);
    });

    popInputComputeStack();

    // if (currentInputCompute === this) {
    //   currentInputCompute = null
    // }

    log(
      "[InputCompute.run]",
      `isGen=${isGenerator(funcResult)}`,
      `isP=${isPromise(funcResult)}`,
    );
    // use generator
    if (isGenerator(funcResult)) {
      let generatorPreservedCurrentReactiveChain: ReactiveChain | undefined;
      await runGenerator(
        funcResult as Generator<void>,
        // enter: start/resume
        () => {
          // if (!currentInputCompute) {
          //   currentInputCompute = this
          // }
          pushInputComputeStack(this);

          generatorPreservedCurrentReactiveChain = currentReactiveChain;
          currentReactiveChain = newReactiveChain;
        },
        // leave: stop/suspend
        () => {
          // tip: inputCompute supporting nestly compose other inputCompute
          // if (currentInputCompute === this) {
          //   currentInputCompute = null
          // }
          popInputComputeStack();

          currentReactiveChain = generatorPreservedCurrentReactiveChain;
        },
      );
      return this.inputFuncEnd(newReactiveChain);
    } else if (isPromise(funcResult)) {
      // end compute context in advance

      await funcResult;

      return this.inputFuncEnd(newReactiveChain);
    }
    if (currentInputCompute === this) {
      currentInputCompute = null;
    }
    return this.inputFuncEnd(newReactiveChain);
  }
}

class AsyncInputCompute<T extends any[]>
  extends InputCompute<T>
  implements AsyncHook<T>
{
  init = true;
  getterPromise: Promise<T> | null = null;
  asyncCount: number = 0;
  startAsyncGetter() {
    this.asyncCount++;
    let currentCount = this.asyncCount;
    this.init = false;
    let resolve: Function;
    this.getterPromise = new Promise((r) => (resolve = r));

    return {
      end: () => {
        resolve();
        this.getterPromise = null;
      },
      valid: () => {
        return this.asyncCount <= currentCount;
      },
    };
  }
  get pending(): boolean {
    return !!this.getterPromise;
  }
}

/**
 * ScopeContext designed for serialization
 */
export class RunnerContext<T extends Driver> {
  // snapshot
  initialArgList: Parameters<T>;
  initialData: IHookContext["data"] | null = null;

  // action
  triggerHookIndex?: number;
  triggerHookName?: string;

  withInitialContext: boolean;

  scope: CurrentRunnerScope;

  constructor(
    public driverName: string,
    public args?: Parameters<T>,
    initialContext?: IHookContext,
  ) {
    this.initialArgList = mergeInitialArgs(
      initialContext?.initialArgList,
      args,
    );
    this.withInitialContext = !!initialContext;
    if (initialContext) {
      this.initialData = initialContext["data"];

      this.triggerHookIndex = initialContext.index;
      this.triggerHookName = initialContext.indexName;

      // args in context has higher priority
      if (initialContext.args) {
        this.args = initialContext.args as any;
      }
    }
  }
  /**
   * update args means the context had enter into update life cycle
   */
  updateInitialArgList(args: Parameters<T>, data: IHookContext["data"]) {
    this.initialArgList = args;
    this.withInitialContext = true;
    this.initialData = data;
  }

  bindScope(scope: CurrentRunnerScope) {
    this.scope = scope;
  }

  serialize(type: "current" | "next") {}

  formatContextData(hooks: Hook[], enable?: (i: number) => boolean) {
    const hooksData: IHookContext["data"] = hooks.map((hook, i) => {
      if (hook && (!enable || enable(i))) {
        if (hook instanceof Computed) {
          return [
            hook.name,
            "computed",
            getValueSilently(hook),
            hook.modifiedTimestamp,
          ];
        }
        if (hook instanceof InputCompute) {
          return [hook.name, "inputCompute"];
        }
        if (hook instanceof State) {
          if (hook.needContextValue) {
            return [
              hook.name,
              hook.contextName,
              getValueSilently(hook),
              hook.modifiedTimestamp,
            ];
          }
          return [hook.name, hook.contextName];
        }
      }
      return [hook?.name, "unserialized"];
    });
    return hooksData;
  }

  /**
   * need deliver context principles, sort by priority:
   * 1.model/cache(server) needn't
   * 2.state
   * 3.related set/get
   */
  serializeAction(
    hooks: Hook[],
    hookIndex: number,
    args: any[],
    deps: Set<number>,
  ): IHookContext {
    const h = hooks[hookIndex];
    const hookName = h?.name || "";
    const noDeps = deps.size === 0;

    const hooksData = this.formatContextData(
      hooks,
      (i) => noDeps || deps.has(i),
    );

    return {
      initialArgList: this.initialArgList,
      name: this.driverName,
      data: hooksData,
      index: hookIndex === -1 ? undefined : hookIndex,
      indexName: hookName,
      args: args || [],
    };
  }
  serializePatch(hooks: Hook[]): IHookContext {
    const hooksData = this.formatContextData(hooks);
    // const p = statePatchEvents.toArray()
    return {
      initialArgList: this.initialArgList,
      name: this.driverName,
      data: hooksData,
      // patch: p
    };
  }

  serializeBase(hooks: Hook[]): IHookContext {
    const hooksData = this.formatContextData(hooks);
    return {
      initialArgList: this.initialArgList,
      name: this.driverName,
      data: hooksData,
    };
  }

  apply(
    hooks: Hook[],
    c: IHookContext,
    needUpdateCallback: (h: State, value: any, timestamp: number) => void,
  ) {
    const contextData = c.data;
    /** @TODO runContext shouldnt care the update logic */
    contextData.forEach(([name, type, value, timestamp], index) => {
      if (isDef(value)) {
        const state = hooks[index] as State;
        switch (type) {
          case "unserialized":
            break;
          default:
            /**
             * default to keep silent because of deliver total context now
             */
            needUpdateCallback(state, value, timestamp);
            break;
        }
      }
    });
  }
}

export interface IRunnerOptions {
  // scope
  believeContext: boolean;
  updateCallbackSync?: boolean;
  applyComputeParallel?: boolean;
  // modelIndexes?: IModelIndexesBase
  //
  runnerContext?: Symbol;

  plugin: Plugin;
}

export class Runner<T extends Driver> {
  ScopeConstructor: typeof CurrentRunnerScope = CurrentRunnerScope;
  scope: CurrentRunnerScope<T>;
  options: IRunnerOptions = {
    believeContext: false,
    updateCallbackSync: false,
    applyComputeParallel: false,
    plugin: null,
  };
  constructor(
    public driver: T,
    options?: Partial<IRunnerOptions>,
  ) {
    Object.assign(this.options, options);
  }

  prepareScope(
    args?: Parameters<T>,
    initialContext?: IHookContext,
    plugin?: Plugin,
  ) {
    const context = new RunnerContext(
      getName(this.driver),
      args,
      initialContext,
    );

    const deps = getDeps(this.driver);
    const names = getNames(this.driver);
    const scope = new this.ScopeConstructor<T>(
      context,
      deps,
      names,
      plugin || this.options.plugin,
      this.options,
    );

    return scope;
  }

  executeDriver(scope: CurrentRunnerScope<T>) {
    const { withInitialContext } = scope.runnerContext;
    if (withInitialContext) {
      currentHookFactory = updateHookFactory;
    } else {
      currentHookFactory = mountHookFactory;
    }

    currentRunnerScope = scope;
    const result: ReturnType<T> = executeDriver(
      this.driver,
      scope.runnerContext.initialArgList,
    );
    currentRunnerScope = null;

    scope.applyDepsMap();
    // do execute effect.maybe from model/cache
    scope.flushEffects();

    return result;
  }
  /**
   * @TODO need to refact because of this function should both return result and scope
   */
  init(args?: Parameters<T>, initialContext?: IHookContext): ReturnType<T> {
    const scope = this.prepareScope(args, initialContext);

    this.scope = scope;

    const result = this.executeDriver(scope);

    return result;
  }

  run(args?: Parameters<T>): ReturnType<T> {
    this.scope.updateContext(args);

    const result = this.executeDriver(this.scope);

    return result;
  }

  mount(args?: Parameters<T>, initialContext?: IHookContext) {
    return this.init(args, initialContext);
  }
  update(initialContext: IHookContext) {
    return this.init(undefined, initialContext);
  }
  /**
   * @TODO after init method refactor. shouldnt callHook through runner but scope
   */
  callHook(hookIndex: number, args?: any[]) {
    return this.scope?.callHook(hookIndex, args);
  }
  state() {
    return this.scope.getState();
  }
  ready() {
    return this.scope?.ready();
  }
  dispose() {
    return this.scope?.dispose();
  }
}

function executeDriver(f: Driver, args: any = []) {
  const driverResult = f(...args);

  if (driverResult) {
  }

  return driverResult;
}

export interface ICacheOptions<T> {
  source?: { _hook: State<T> };
  defaultValue?: T;
  from: TCacheFrom;
}

export const CacheInitialSymbol = "@@CacheInitialSymbol";
export class Cache<T> extends AsyncState<T | string> {
  getterKey: string;
  watcher: Watcher = new Watcher(this);
  source: State<T> | undefined;
  getterPromise: Promise<any> | null = null;

  contextName = "cache";

  constructor(
    key: string,
    public options: ICacheOptions<T>,
    public scope: CurrentRunnerScope,
  ) {
    super(CacheInitialSymbol);
    this.getterKey = key; // `tarat_cache_${scope.hookRunnerName}__${key}`

    if (this.options.source) {
      this.source = this.options.source._hook;
      this.watcher.addDep(this.source);

      const { _internalValue } = this.source;
      const initVal = isPrimtive(_internalValue)
        ? _internalValue
        : shallowCopy(_internalValue);
      super.update(initVal);
    }
  }
  notify(hook?: Hook, p?: IDataPatch[], reactiveChain?: ReactiveChain) {
    const { from } = this.options;
    const { source } = this;

    if (hook && source && hook === source) {
      log("[Cache.notify] source changed");
      // not calling update prevent notify the watcher for current cache
      this._internalValue = CacheInitialSymbol;
      /**
       * just clear value in cache not update directly
       * reason 1: for lazy
       * reason 2: prevent writing conflict while coccurent writing at same time
       */
      this.scope.plugin
        .getPlugin("Cache")
        .clearValue(this.scope, this.getterKey, from);

      const newReactiveChain = reactiveChain?.addNotify(this);
      this.executeQuery(newReactiveChain);
    }
  }
  override get value(): T | string {
    /** @TODO should use symbol for initial value */
    if (this._internalValue === CacheInitialSymbol) {
      this.executeQuery(currentReactiveChain);
    }
    const v = super.value;
    return v === CacheInitialSymbol ? undefined : v;
  }
  async executeQuery(reactiveChain?: ReactiveChain) {
    const { from } = this.options;
    const { source } = this;

    const { end, valid } = this.startAsyncGetter();

    try {
      const valueInCache = await this.scope.plugin
        .getPlugin("Cache")
        .getValue<T>(this.scope, this.getterKey, from);
      if (!valid()) {
        return;
      }
      log(
        `[${this.name || ""} Cache.executeQuery] valueInCache=`,
        valueInCache,
      );
      if (valueInCache !== undefined) {
        super.update(valueInCache, [], false, reactiveChain);
      } else if (source) {
        const valueInSource = source.value;

        super.update(valueInSource, [], false, reactiveChain);
        // unconcern the result of remote updating
        this.scope.plugin
          .getPlugin("Cache")
          .setValue(this.scope, this.getterKey, valueInSource, from);
      }
    } catch (e) {
      log(`[Cache.executeQuery] error`);
      console.error(e);
    } finally {
      log(`[${this.name || ""} Cache.executeQuery]`);
      if (valid()) {
        end();
      }
    }
  }
  /**
   * call by outer
   * @param v new value
   * @param patches new value with patches
   * @param silent update value wont notify watcher
   * @param reactiveChain
   */
  override async update(
    v?: T | string,
    patches?: IDataPatch[],

    silent?: boolean,
    reactiveChain?: ReactiveChain,
  ) {
    const { from } = this.options;
    const { source } = this;
    if (source) {
      throw new Error(
        '[Cache] can not update value directly while the cache has "source" in options ',
      );
    } else {
      super.update(
        v,
        patches?.filter(isDataPatch) as IDataPatch[],
        silent,
        reactiveChain,
      );
      await this.scope.plugin
        .getPlugin("Cache")
        .setValue(this.scope, this.getterKey, v, from);

      log(`[${this.name} cache.update] end k=${this.getterKey} v=${v}`);
    }
  }

  addDep(source: ISource<T>, path: (string | number)[]) {
    this.watcher.addDep(source, path);
  }
}

export enum EScopeState {
  init = "init",
  idle = "idle",
  pending = "pending",
}

export class CurrentRunnerScope<T extends Driver = any> extends EventEmitter {
  name?: string;
  hooks: (Hook | undefined)[] = [];
  composes: Record<string, any>[] = []; // store the compose execute resutl

  // outerListeners: Function[] = []

  stateChangeCallbackRunning = false;
  stateChangeCallbackCancel = () => {};
  stateChangeWaitHooks: Set<Hook> = new Set<Hook>();
  watcher: Watcher<Hook> = new Watcher(this);
  // static parsed result
  initialHooksSet?: Set<number>;

  reactiveChainStack: ReactiveChain[] = [];

  /**
   * receive by runner options
   */
  believeContext = false;
  updateCallbackSync = false;
  applyComputeParallel = false;

  // modelIndexes: IModelIndexesBase | undefined = undefined
  // modelIndexesPath: string[] = []

  effectFuncArr: Function[] = [];
  disposeFuncArr: Function[] = [];

  static events = {
    enterComposeDriver: "enterComposeDriver",
    leaveComposeDriver: "leaveComposeDriver",
    update: "update",
    effect: "effect",
  };

  static getCurrent = () => currentRunnerScope;

  constructor(
    public runnerContext: RunnerContext<T>,
    public initialContextDeps: THookDeps,
    public initialContextNames: THookNames,
    public plugin: Plugin,
    op: Partial<IRunnerOptions>,
  ) {
    super();
    runnerContext.bindScope(this);

    this.initializeHookSet();

    Object.assign(this, op);
  }

  /**
   * copy context value into scope for updateXXX hook
   */
  initializeHookSet() {
    const { runnerContext } = this;
    if (
      runnerContext.triggerHookIndex !== undefined &&
      typeof runnerContext.triggerHookIndex === "number" &&
      runnerContext.initialData.length > 0
    ) {
      /** @TODO believe deps calculation from client.it's maybe dangerous' */
      const s = new Set<number>([runnerContext.triggerHookIndex]);
      runnerContext.initialData.forEach((d, i) => {
        if (d[1] !== "unserialized") {
          s.add(i);
        }
      });
      this.initialHooksSet = s;
    }
  }

  updateContext(args: Parameters<T>) {
    const data = this.runnerContext.formatContextData(this.hooks);
    this.runnerContext.updateInitialArgList(args, data);
  }

  triggerEnterComposeDriver(driverNamespace: string, driverName: string) {
    this.emit(CurrentRunnerScope.events.enterComposeDriver, {
      driverNamespace,
      driverName,
    });
    return () => {
      this.emit(CurrentRunnerScope.events.leaveComposeDriver, {
        driverNamespace,
        driverName,
      });
    };
  }

  effect(f: Function) {
    this.once(CurrentRunnerScope.events.effect, (rc: ReactiveChain) => {
      f(rc);
    });
  }
  clearEffects() {
    this.off(CurrentRunnerScope.events.effect);
  }
  flushEffects() {
    if (!this.runnerContext.withInitialContext) {
      const reactiveChain = currentReactiveChain?.add(this);
      this.emit(CurrentRunnerScope.events.effect, reactiveChain);
    } else {
      this.off(CurrentRunnerScope.events.effect);
    }
  }

  appendDispose(f: Function) {
    this.disposeFuncArr.push(f);
  }
  dispose() {
    this.disposeFuncArr.forEach((f) => f());
  }

  /**
   * call the executable hook: Model, InputCompute
   * @TODO the executable hook maybe need a abstract base class
   */
  async callHook(hookIndex: number, args?: any[]) {
    log("[Scope.callHook] start");
    const hook = this.hooks[hookIndex];
    if (hook) {
      // if (hook instanceof Model) {
      // } else
      if (hook instanceof Computed) {
        currentReactiveChain = currentReactiveChain?.add(this);
        hook.run(currentReactiveChain);
      } else if (hook instanceof InputCompute) {
        currentReactiveChain = currentReactiveChain?.add(this);
        await hook.run(...args);
      }
    }
    log("[Scope.callHook] end");
  }

  /**
   * while enter UI will activate this function
   */
  activate() {
    this.notifyAllState();
  }
  deactivate() {}

  private notifyAllState() {
    this.hooks.forEach((h) => {
      if (h instanceof State && h.needCheckAndRefresh) {
        h.checkAndRefresh();
      }
    });
  }

  onUpdate(fn: (...args: any[]) => void) {
    this.on(CurrentRunnerScope.events.update, fn);

    return () => {
      this.off(CurrentRunnerScope.events.update, fn);
    };
  }
  notifyOuter() {
    this.emit(CurrentRunnerScope.events.update);
  }
  notify(s?: Hook) {
    if (this.updateCallbackSync) {
      this.notifyOuter();
    } else {
      this.stateChangeCallbackCancel();
      this.stateChangeCallbackCancel = nextTick(() => {
        this.notifyOuter();
      });
    }
  }
  addDep(source: ISource<T>, path: (string | number)[]) {
    this.watcher.addDep(source, path);
  }

  findHookIndex(hook?: Hook) {
    return this.hooks.indexOf(hook);
  }

  addHook(v: Hook | undefined) {
    if (v && this.findHookIndex(v) > -1) {
      throw new Error("[scope.addHook] cant add repeat hook");
    }
    this.hooks.push(v);

    // assign name by inject deps
    let hookNames: THookNames["0"];
    if (this.initialContextNames) {
      hookNames = this.initialContextNames.find(
        (arr) => arr[0] === this.hooks.length - 1,
      );
    }

    if (v) {
      this.watcher.addDep(v);

      if (hookNames?.[1]) {
        v.name = hookNames[1];
        v.index = hookNames[0];
      }
    }

    return hookNames || [];
  }

  applyDepsMap() {
    const deps = this.initialContextDeps;
    deps?.forEach(([name, hookIndex, getDeps]) => {
      getDeps.forEach((triggerHookIndex) => {
        let triggerHook: Hook | undefined | null;

        if (Array.isArray(triggerHookIndex)) {
          const [type, composeIndex, variableName] = triggerHookIndex;
          if (type === "c") {
            const setterGetterFunc: { _hook: Hook } | undefined =
              this.composes[composeIndex]?.[variableName];
            triggerHook = this.hooks.find((h) => h === setterGetterFunc?._hook);
          }
          // @TODO: maybe unknow case
        } else {
          triggerHook = this.hooks[triggerHookIndex];
        }
        if (triggerHook) {
          // make sure the hook had implement ITarget interface
          (this.hooks[hookIndex] as unknown as ITarget<any>)?.addDep?.(
            triggerHook,
          );
        }
      });
    });
  }

  /**
   * offset compose names and current initial names
   */
  appendComposeNames(si: number, names?: THookNames) {
    if (!names) {
      return;
    }
    const len = names.length;

    const modifiedNames = (this.initialContextNames || []).map((a) => {
      const arr: THookNames[0] = cloneDeep(a);
      if (arr[0] >= si) {
        arr[0] += len;
      }
      return arr;
    });
    const newOffsetNames: THookNames = names.map((a) => {
      return [a[0] + si, a[1]];
    });
    this.initialContextNames = modifiedNames.concat(newOffsetNames);
  }

  offsetComposeIndex(
    originalIndex: number,
    newLength: number,
    icrement: number,
  ) {
    const offset = newLength - originalIndex;
    const endIndex = (this.initialContextDeps || []).length - icrement;
    if (offset > 0) {
      const originalDepsBeforeCompose = (this.initialContextDeps || []).slice(
        0,
        endIndex,
      );
      const icrementDepsAfterCompose = (this.initialContextDeps || []).slice(
        endIndex,
      );

      const modifiedOriginalDeps = originalDepsBeforeCompose.map((a) => {
        const arr: THookDepUnit = cloneDeep(a);
        if (arr[2]) {
          arr[2] = arr[2].map((b) => {
            if (Array.isArray(b)) {
              if (b[0] === "c" && b[1] === originalIndex) {
                b[1] += offset;
              }
            }
            return b;
          });
        }
        if (arr[3]) {
          arr[3] = arr[3].map((b) => {
            if (b[0] === "c" && b[1] === originalIndex) {
              b[1] += offset;
            }
            return b;
          });
        }
        return arr;
      });
      this.initialContextDeps = modifiedOriginalDeps.concat(
        icrementDepsAfterCompose,
      );
    }
  }
  /**
   * add compose deps to current driver.
   * plus current hook dep index
   */
  appendComposeDeps(
    si: number,
    ei: number,
    currentComposeLengh: number,
    deps?: THookDeps,
  ) {
    if (!deps) {
      return;
    }
    const hooksInComposeSize = ei - si;

    const modifiedDeps = (this.initialContextDeps || []).map((a) => {
      const arr: THookDepUnit = cloneDeep(a);

      if (arr[1] >= si) {
        arr[1] += hooksInComposeSize;
      }
      if (arr[2]) {
        arr[2] = arr[2].map((v) => {
          return typeof v === "number" && v >= si ? v + hooksInComposeSize : v;
        });
      }
      if (arr[3]) {
        arr[3] = arr[3].map((v) => {
          return typeof v === "number" && v >= si ? v + hooksInComposeSize : v;
        });
      }
      return arr;
    });
    const newModifiedDeps: THookDeps = deps.map((a) => {
      const arr: THookDepUnit = cloneDeep(a);

      arr[1] += si;
      if (arr[2]) {
        arr[2] = arr[2].map((v) =>
          typeof v === "number"
            ? v + si
            : [v[0], v[1] + currentComposeLengh, v[2]],
        );
      }
      if (arr[3]) {
        arr[3] = arr[3].map((v) =>
          typeof v === "number"
            ? v + si
            : [v[0], v[1] + currentComposeLengh, v[2]],
        );
      }
      return arr;
    });

    this.initialContextDeps = modifiedDeps.concat(newModifiedDeps);
  }

  applyAllComputePatches(
    currentInputCompute: InputCompute,
    reactiveChain?: ReactiveChain,
  ): (void | Promise<void>)[] {
    const { applyComputeParallel, hooks } = this;
    const hookModified = hooks.filter((h) => {
      if (h && (h as State).hasPatches) {
        return (h as State).hasPatches(currentInputCompute);
      }
    });

    if (hookModified.length) {
      let prevPromise: Promise<void> | null = null;

      return hookModified.map((h) => {
        const newChildChain = reactiveChain?.addUpdate(h as State);

        if (applyComputeParallel || !(h as State).applyComputeAsync) {
          return (h as State).applyComputePatches(
            currentInputCompute,
            newChildChain,
          );
        }

        prevPromise = prevPromise
          ? prevPromise.then(() =>
              (h as State).applyComputePatches(
                currentInputCompute,
                newChildChain,
              ),
            )
          : Promise.resolve(
              (h as State).applyComputePatches(
                currentInputCompute,
                newChildChain,
              ),
            );
        return prevPromise;
      });
    }
    return [];
  }

  applyContextFromServer(c: IHookContext) {
    const { hooks } = this;

    this.runnerContext.apply(
      hooks,
      c,
      // invoke while the target state is valid for updating
      (state, value, timestamp) => {
        state.update?.(value, [], true);
        if (value && timestamp) {
          state.modifiedTimestamp = timestamp;
        }
      },
    );

    this.notify();
  }

  getState() {
    const asyncHooks = this.hooks.filter(
      (h) => h && Reflect.has(h, "getterPromise"),
    ) as unknown as { getterPromise: Promise<any> | null }[];

    let notReadyHooks = asyncHooks.filter((h) => {
      return !!h.getterPromise;
    });

    return notReadyHooks.length === 0 ? EScopeState.idle : EScopeState.pending;
  }

  ready(specifies?: Set<number>): Promise<void> {
    const asyncHooks = this.hooks.filter(
      (h, i) =>
        (specifies ? specifies.has(i) : true) &&
        ((h && Reflect.has(h, "getterPromise")) ||
          h instanceof AsyncInputCompute ||
          h instanceof AsyncState),
    ) as unknown as (AsyncInputCompute<any> | AsyncState<any>)[];

    let readyResolve: () => void;
    let readyPromise = new Promise<void>((resolve) => (readyResolve = resolve));

    let max = asyncHooks.length * 2;
    let i = 0;
    async function wait() {
      if (i++ > max) {
        throw new Error("[Scope.ready] unexpect loop for ready");
      }
      let notReadyHooks = asyncHooks
        .filter((h) => {
          // if (h.getterPromise) {
          //   console.log(h)
          // }
          return !!h.getterPromise;
        })
        .map((h) => h.getterPromise);
      if (notReadyHooks.length === 0) {
        readyResolve();
      } else {
        await Promise.all(notReadyHooks);
        wait();
      }
    }
    wait();

    return readyPromise;
  }
}

let currentRunnerScope: CurrentRunnerScope<Driver> | null = null;

export function getCurrentRunnerScope() {
  return currentRunnerScope;
}
/**
 *
 */
let currentReactiveChain: ReactiveChain | undefined = undefined;

export function getCurrentReactiveChain() {
  return currentReactiveChain;
}

export function startReactiveChain(name: string = "root") {
  currentReactiveChain = new ReactiveChain();
  currentReactiveChain.isRoot = true;
  currentReactiveChain.name = name;
  return currentReactiveChain;
}
export function stopReactiveChain() {
  currentReactiveChain = undefined;
}

/**
 * collect reactive chain for debug
 */
type ChainTrigger<T> = CurrentRunnerScope<any> | State<T> | InputCompute<any>;
export class ReactiveChain<T = any> {
  isRoot = false;
  allLeafCount = 0;
  order: number = 0;
  name?: string;
  hookIndex?: number;
  hookKey?: string;
  oldValue: T | undefined;
  newValue: T | undefined;
  hasNewValue: boolean = false;
  children: ReactiveChain<T>[] = [];
  type?: "update" | "notify" | "call";

  static getCurrent = () => currentReactiveChain;

  constructor(
    public parent?: ReactiveChain,
    public hook?: ChainTrigger<T>,
  ) {
    this.order = parent?.plusLeaf() || 0;

    if (hook instanceof State) {
      this.oldValue = hook._internalValue;
    }
  }
  static withChain<T extends (...args: any[]) => any>(
    chain: ReactiveChain,
    fn: T,
  ): ReturnType<T> {
    const oldCurrentReactiveChain = currentReactiveChain;
    currentReactiveChain = chain;

    const r = fn();

    currentReactiveChain = oldCurrentReactiveChain;
    return r;
  }
  plusLeaf() {
    if (this.isRoot) {
      this.allLeafCount += 1;
      return this.allLeafCount;
    }
    return this.parent.plusLeaf();
  }
  stop() {
    stopReactiveChain();
  }
  update() {
    if (this.hook instanceof State) {
      this.hasNewValue = true;
      this.newValue = this.hook._internalValue;
    }
  }
  add(trigger: ChainTrigger<T>, key?: string): ReactiveChain<T> {
    const childChain = new ReactiveChain(this, trigger);
    childChain.hookKey = key;
    this.children.push(childChain);

    if (currentRunnerScope) {
      if (trigger instanceof Hook) {
        const index = currentRunnerScope.findHookIndex(trigger);
        if (index > -1) {
          childChain.hookIndex = index;
        }
      }
    }
    return childChain;
  }
  addCall(trigger: ChainTrigger<T>, key?: string): ReactiveChain<T> {
    const childChain = this.add(trigger, key);
    childChain.type = "call";
    return childChain;
  }
  addNotify(trigger: ChainTrigger<T>): ReactiveChain<T> {
    const childChain = this.add(trigger);
    childChain.type = "notify";
    return childChain;
  }
  addUpdate(child: ChainTrigger<T>): ReactiveChain<T> {
    const childChain = this.add(child);
    childChain.type = "update";
    return childChain;
  }
  print() {
    const preLink = "|--> ";
    const preDec = "|-- ";
    const preHasNextSpace = "|  ";
    const preSpace = "   ";

    function dfi(current: ReactiveChain) {
      const isRunnerScope = current.hook instanceof CurrentRunnerScope;
      let currentName = current.hook?.constructor.name || current.name || "";
      if (isRunnerScope) {
        currentName = `\x1b[32m${currentName}\x1b[0m`;
      }
      if (current.hook?.name) {
        currentName = `${currentName}(${current.hook?.name}${
          current.hookKey ? "." + current.hookKey : ""
        })`;
      } else if (isDef(current.hookIndex)) {
        currentName = `${currentName}(${current.hookIndex})`;
      }
      if (current.type) {
        currentName = `${current.type}: ${currentName}`;
      }
      currentName = `\x1b[32m${current.order}\x1b[0m.${currentName}`;

      const currentRows = [currentName];
      if (shortValue(current.oldValue)) {
        currentRows.push(`${preDec}cur=${shortValue(current.oldValue)}`);
      } else {
        currentRows.push(`${preDec}cur=${JSON.stringify(current.oldValue)}`);
      }
      if (current.hasNewValue) {
        if (shortValue(current.newValue)) {
          currentRows.push(`${preDec}new=${shortValue(current.newValue)}`);
        } else {
          currentRows.push(`${preDec}new=${JSON.stringify(current.newValue)}`);
        }
      }

      if (current.children.length > 0) {
        const names = current.children.map(dfi);
        const rows: string[] = [];
        names.forEach((arr, i) => {
          arr.forEach((childName, j) => {
            if (j === 0) {
              rows.push(`${preLink}${childName}`);
            } else {
              if (names[i + 1]) {
                rows.push(`${preHasNextSpace}${childName}`);
              } else {
                rows.push(`${preSpace}${childName}`);
              }
            }
          });
        });
        return [...currentRows, ...rows];
      }
      return [...currentRows];
    }
    const logRows = dfi(this);

    const shortLogRows = logRows.map((text) => {
      return text.length > 100 ? text.substring(0, 100) + "..." : text;
    });
    // console the chain log
    console.log(shortLogRows.join("\n"));
  }
}

/**
 *
 *
 *
 *
 *
 * hook factory
 *
 *
 *
 *
 *
 *
 */

export const mountHookFactory = {
  state: mountState,

  cache: mountCache,
  computed: mountComputed,
  inputCompute: mountInputCompute,

  // alias
  signal,
  action: mountInputCompute,
};
export const updateHookFactory = {
  state: updateState,

  cache: updateCache,
  computed: updateComputed,
  inputCompute: updateInputCompute,
  // alias
  signal,
  action: updateInputCompute,
};

export let currentHookFactory: {
  state: typeof mountState;

  cache: typeof mountCache;
  computed: typeof mountComputed;
  inputCompute: typeof mountInputCompute;
  // alias
  signal: typeof signal;
  action: typeof mountInputCompute;
} = mountHookFactory;

export function getCurrentHookFactory() {
  return currentHookFactory;
}

export const hookFactoryFeatures = {
  /**
   * all hooks name list
   */
  all: Object.keys(mountHookFactory),
  /**
   * need other hook as data source
   */
  withSource: ["cache"],
  /**
   * manual calling by User or System
   */
  initiativeCompute: ["inputCompute", "action"],
};

export function updateValidation() {
  if (!currentRunnerScope) {
    throw new Error("[updateValidation] update hook must under a <Runner>");
  }

  const { hooks, initialHooksSet } = currentRunnerScope!;
  const currentIndex = hooks.length;
  const valid = !initialHooksSet || initialHooksSet.has(currentIndex);

  return {
    valid,
    currentIndex,
  };
}

function createUnAccessGetter<T>(index: number, name?: string) {
  const f = () => {
    throw new Error(
      `[update getter] cant access un initialized hook(${index}, ${name})`,
    );
  };
  const newF: (() => any) & { _hook: any } = Object.assign(f, {
    _hook: null,
  });
  return newF;
}

export type IModifyFunction<T> = ((draft: Draft<T>) => void) | T;

function createStateSetterGetterFunc<SV>(s: State<SV>): {
  (): SV;
  (parameter: IModifyFunction<SV>): [SV, IDataPatch[]];
} {
  return (parameter?: any): any => {
    if (isDef(parameter)) {
      let result: SV;
      let patches = [];
      if (isFunc(parameter)) {
        const r = produceWithPatches(s.value, parameter);
        result = r[0];
        patches = r[1];
      } else {
        result = parameter;
      }
      if (currentInputCompute) {
        s.addComputePatches(result, patches);
      } else {
        const reactiveChain: ReactiveChain<SV> | undefined =
          currentReactiveChain?.addUpdate(s);

        const isUnderComputed = underComputed();
        s.update(result, patches, isUnderComputed, reactiveChain);
      }
      return [result, patches];
    }
    if (currentReactiveChain) {
      return ReactiveChain.withChain(currentReactiveChain.addCall(s), () => {
        return s.value;
      });
    }
    return s.value;
  };
}

function createCacheSetterGetterFunc<SV>(c: Cache<SV>): {
  (): SV;
  (parameter: IModifyFunction<SV>): [SV, IDataPatch[]];
} {
  return (parameter?: any): any => {
    if (isDef(parameter)) {
      let result: SV | string;
      let patches = [];
      if (isFunc(parameter)) {
        const r = produceWithPatches(c.value, parameter);
        result = r[0];
        patches = r[1];
      } else {
        result = parameter;
      }

      if (currentInputCompute) {
        c.addComputePatches(result, patches);
      } else {
        const reactiveChain = currentReactiveChain?.addUpdate(c);

        const isUnderComputed = underComputed();
        c.update(result, patches, isUnderComputed, reactiveChain);
      }
      return [result, patches];
    }
    if (currentReactiveChain) {
      return ReactiveChain.withChain(currentReactiveChain.addCall(c), () => {
        return c.value;
      });
    }
    return c.value;
  };
}

function updateState<T>(initialValue?: T) {
  const { valid, currentIndex } = updateValidation();

  initialValue =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[2];
  // undefined means this hook wont needed in this progress
  if (!valid) {
    const [_, name] = currentRunnerScope!.addHook(undefined);
    return createUnAccessGetter<T>(currentIndex, name);
  }
  const timestamp =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[3];
  const hook = new State(initialValue);
  if (timestamp) {
    hook.modifiedTimestamp = timestamp;
  }

  const setterGetter = createStateSetterGetterFunc(hook);
  currentRunnerScope!.addHook(hook);
  currentReactiveChain?.add(hook);

  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
  });

  return newSetterGetter;
}

function mountState<T>(initialValue?: T) {
  const hook = new State(initialValue);

  const setterGetter = createStateSetterGetterFunc(hook);
  currentRunnerScope?.addHook(hook);
  currentReactiveChain?.add(hook);

  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
  });

  return newSetterGetter;
}

function updateCache<T>(key: string, options: ICacheOptions<T>) {
  const { valid, currentIndex } = updateValidation();

  if (!valid) {
    const [_, name] = currentRunnerScope!.addHook(undefined);
    return createUnAccessGetter<T>(currentIndex, name);
  }

  /** @TODO cache maybe should has initial value */
  const hook = new Cache(key, options, currentRunnerScope!);
  currentRunnerScope!.addHook(hook);

  const initialValue: T =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[2];
  const timestamp =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[3];

  if (initialValue !== undefined) {
    hook._internalValue = initialValue;
    if (timestamp) {
      hook.modifiedTimestamp = timestamp;
    }
  }

  const setterGetter = createCacheSetterGetterFunc(hook);
  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
  });
  return newSetterGetter;
}
function mountCache<T>(key: string, options: ICacheOptions<T>) {
  const hook = new Cache(key, options, currentRunnerScope!);
  currentRunnerScope?.addHook(hook);
  currentReactiveChain?.add(hook);

  const setterGetter = createCacheSetterGetterFunc(hook);
  const newSetterGetter = Object.assign(setterGetter, {
    _hook: hook,
  });
  return newSetterGetter;
}

function updateComputed<T>(
  fn: FComputedFuncGenerator<T>,
): (() => T) & { _hook: Computed<T> };
function updateComputed<T>(
  fn: FComputedFuncAsync<T>,
): (() => T) & { _hook: Computed<T> };
function updateComputed<T>(
  fn: FComputedFunc<T>,
): (() => T) & { _hook: Computed<T> };
function updateComputed<T>(fn: any): any {
  const { valid, currentIndex } = updateValidation();

  if (!valid) {
    const [_, name] = currentRunnerScope!.addHook(undefined);
    return createUnAccessGetter<T>(currentIndex, name);
  }
  const initialValue: T =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[2];
  const timestamp =
    currentRunnerScope!.runnerContext.initialData![currentIndex]?.[3];

  const hook = new Computed<T>(fn);
  currentRunnerScope!.addHook(hook);
  // @TODO: update computed won't trigger
  hook._internalValue = initialValue;
  hook.init = false;
  if (timestamp) {
    hook.modifiedTimestamp = timestamp;
  }

  currentReactiveChain?.add(hook);

  const getter = () => {
    return hook.value;
  };
  const newGetter = Object.assign(getter, {
    _hook: hook,
  });
  return newGetter;
}
function mountComputed<T>(
  fn: FComputedFuncGenerator<T>,
): (() => T) & { _hook: Computed<T> };
function mountComputed<T>(
  fn: FComputedFuncAsync<T>,
): (() => T) & { _hook: Computed<T> };
function mountComputed<T>(
  fn: FComputedFunc<T>,
): (() => T) & { _hook: Computed<T> };
function mountComputed<T>(fn: any): any {
  const hook = new Computed<T>(fn);
  currentRunnerScope?.addHook(hook);

  currentReactiveChain?.add(hook);

  const getter = () => {
    // console.log(`[mountComputed] name=${hook.name} getter.value=${hook.value}`);
    return hook.value;
  };
  const newGetter = Object.assign(getter, {
    _hook: hook,
  });
  return newGetter;
}

function updateInputCompute(func: any) {
  const { hooks, initialHooksSet } = currentRunnerScope!;
  const currentIndex = hooks.length;
  const valid = !initialHooksSet || initialHooksSet.has(currentIndex);

  if (!valid) {
    const [_, name] = currentRunnerScope!.addHook(undefined);
    return createUnAccessGetter(currentIndex, name);
  }

  return mountInputCompute(func);
}
function mountInputCompute(func: any) {
  const hook = new InputCompute(func, currentRunnerScope);
  currentRunnerScope?.addHook(hook);
  currentReactiveChain?.add(hook);
  const wrapFunc = (...args: any) => {
    return hook.run(...args);
  };
  wrapFunc._hook = hook;

  return wrapFunc;
}

/**
 *
 * export factory method
 *
 */
type StateGetterAndSetter<T> = {
  (): T;
  (parameter: IModifyFunction<T>): [T, IDataPatch[]];
} & { _hook: State<T> };

export function state<T>(initialValue: T): StateGetterAndSetter<T>;
export function state<T = undefined>(): StateGetterAndSetter<T | undefined>;
export function state(initialValue?: any) {
  return currentHookFactory.state(initialValue);
}

type ComputedGetter<T> = (() => T) & { _hook: Computed<T> };
export function computed<T>(fn: FComputedFuncGenerator<T>): ComputedGetter<T>;
export function computed<T>(fn: FComputedFuncAsync<T>): ComputedGetter<T>;
export function computed<T>(fn: FComputedFunc<T>): ComputedGetter<T>;
export function computed<T>(fn: any): any {
  return currentHookFactory.computed<T>(fn);
}

export function inputCompute<T extends any[]>(
  func: AsyncInputComputeFn<T>,
): AsyncInputComputeFn<T> & { _hook: Hook };
export function inputCompute<T extends any[]>(
  func: GeneratorInputComputeFn<T>,
): AsyncInputComputeFn<T> & { _hook: Hook };
export function inputCompute<T extends any[]>(
  func: InputComputeFn<T>,
): InputComputeFn<T> & { _hook: Hook };
export function inputCompute(func: any) {
  if (!currentRunnerScope) {
    throw new Error("[inputCompute] must under a <Runner>");
  }
  const wrapFunc = currentHookFactory.inputCompute(func);
  return wrapFunc;
}

export function cache<T>(key: string, options: ICacheOptions<T>) {
  return currentHookFactory.cache<T>(key, options);
}

// alias
export type ComputedSignal<T> = ComputedGetter<T>;
export type StateSignal<T> = StateGetterAndSetter<T>;
export type Signal<T> = StateGetterAndSetter<T>;

export function signal<T>(fn: FComputedFuncGenerator<T>): ComputedSignal<T>;
export function signal<T>(fn: FComputedFuncAsync<T>): ComputedSignal<T>;
export function signal<T>(fn: FComputedFunc<T>): ComputedSignal<T>;
export function signal<T>(initialValue: T): StateSignal<T>;
export function signal<T>(v: null): StateSignal<T>;
// export function signal<T = undefined>(): {
//   (): T
//   (parameter: IModifyFunction<T | undefined>): [any, IDataPatch[]]
// } & { _hook: State<T | undefined> }
export function signal(v?: any) {
  if (isFunc(v)) {
    return computed(v);
  } else {
    return state(v);
  }
}

export const action = inputCompute;

export function onMount(fn: () => void) {
  if (!currentRunnerScope) {
    throw new Error("[onMount] must under a <Runner>");
  }
  if (!currentRunnerScope.runnerContext.withInitialContext) {
    fn();
  }
}

export function onUpdate(fn: () => void) {
  if (!currentRunnerScope) {
    throw new Error("[onUpdate] must under a <Runner>");
  }
  if (currentRunnerScope.runnerContext.withInitialContext) {
    fn();
  }
}

/**
 *
 *
 *
 *
 *  connect util methods
 *
 *
 *
 *
 */

export interface AfterOptions {
  immediate?: boolean;
}

export function after(
  callback: () => void,
  targets: { _hook?: Hook }[],
  options?: AfterOptions,
) {
  callback = makeBatchCallback(callback);

  targets.forEach((target) => {
    if (target._hook) {
      if (target._hook instanceof InputCompute) {
        target._hook.on(EHookEvents.afterCalling, callback);
      } else {
        target._hook.on(EHookEvents.change, callback);
      }
    }
  });
  if (options?.immediate) {
    callback();
  }
  return () => {
    targets.forEach((target) => {
      if (target._hook) {
        if (target._hook instanceof InputCompute) {
          target._hook.off(EHookEvents.afterCalling, callback);
        } else {
          target._hook.off(EHookEvents.change, callback);
        }
      }
    });
  };
}

export function before(callback: () => void, targets: { _hook?: Hook }[]) {
  callback = makeBatchCallback(callback);

  targets.forEach((target) => {
    if (target._hook) {
      if (target._hook instanceof InputCompute) {
        target._hook.on(EHookEvents.beforeCalling, callback);
      }
    }
  });
  return () => {
    targets.forEach((target) => {
      if (target._hook) {
        if (target._hook instanceof InputCompute) {
          target._hook.off(EHookEvents.beforeCalling, callback);
        }
      }
    });
  };
}

export function combineLatest<T>(
  arr: Array<Function & { _hook: State<T> }>,
): () => T {
  return () => {
    const latestState = arr.slice(1).reduce((latest, hook) => {
      const { _hook } = hook;
      if (!_hook) {
        return latest;
      }
      if (!latest._hook) {
        return hook;
      }
      if (_hook.modifiedTimestamp > latest._hook.modifiedTimestamp) {
        return hook;
      }
      return latest;
    }, arr[0]);

    return latestState?.();
  };
}

/**
 * using another Driver inside of Driver
 * the important thing is that should consider how to compose their depsMap
 */
export function compose<T extends Driver>(f: T, args?: Parameters<T>) {
  if (!currentRunnerScope) {
    throw new Error("[compose] must run side of Driver");
  }

  const startIndex = currentRunnerScope.hooks.length;

  let names = getNames(f);
  const driverName = getName(f);
  const composeIndex = currentRunnerScope.composes.length;
  if (driverName && names) {
    names = names.map((arr) => [
      arr[0],
      `compose.${composeIndex}.${driverName}.${arr[1]}`,
    ]);
    currentRunnerScope.appendComposeNames(startIndex, names);
  }

  const endIndex = startIndex + names.length;
  const deps = getDeps(f);
  const originalDepsSize = (currentRunnerScope.initialContextDeps || []).length;
  currentRunnerScope.appendComposeDeps(
    startIndex,
    endIndex,
    composeIndex,
    deps,
  );

  const driverNamespace = getNamespace(f);
  log(
    "[compose] current = ",
    currentRunnerScope.runnerContext.driverName,
    // !!currentRunnerScope.modelIndexes
  );
  const leaveCompose = currentRunnerScope.triggerEnterComposeDriver(
    driverNamespace,
    driverName,
  );
  const insideResult: ReturnType<T> = executeDriver(f, args);

  const afterEnterComposedLength = currentRunnerScope.composes.length;
  if (afterEnterComposedLength > composeIndex) {
    const latestDepsSize = (currentRunnerScope.initialContextDeps || []).length;

    // tip: there exist deeply composing in child compose driver
    currentRunnerScope.offsetComposeIndex(
      composeIndex,
      afterEnterComposedLength,
      latestDepsSize - originalDepsSize,
    );
  }

  leaveCompose();
  currentRunnerScope.composes.push(insideResult);

  return insideResult;
}

export function progress<T = any>(getter: {
  _hook: AsyncState<T> | AsyncInputCompute<T[]>;
}) {
  const hook = getter._hook;
  return () => ({
    state: hook.init
      ? EScopeState.init
      : hook.pending
      ? EScopeState.pending
      : EScopeState.idle,
  });
}

export function dispose(f: Function) {
  if (!currentRunnerScope) {
    throw new Error("[dispose] must run inside of Driver");
  }
  currentRunnerScope.appendDispose(f);
}
