import co from "./lib/co";
export const isArray = Array.isArray;
/* copy from immer's common.ts  */
export type AnyObject = { [key: string]: any };
export const ownKeys: (target: AnyObject) => PropertyKey[] = Reflect.ownKeys;
export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;

export function shallowCopy(base: any): any {
  if (isArray(base)) return Array.prototype.slice.call(base);
  const descriptors = getOwnPropertyDescriptors(base);
  let keys = ownKeys(descriptors);
  for (let i = 0; i < keys.length; i++) {
    const key: any = keys[i];
    const desc = descriptors[key];
    if (desc.writable === false) {
      desc.writable = true;
      desc.configurable = true;
    }
    // like object.assign, we will read any _own_, get/set accessors. This helps in dealing
    // with libraries that trap values, like mobx or vue
    // unlike object.assign, non-enumerables will be copied as well
    if (desc.get || desc.set)
      descriptors[key] = {
        configurable: true,
        writable: true, // could live with !!desc.set as well here...
        enumerable: desc.enumerable,
        value: base[key],
      };
  }
  return Object.create(Object.getPrototypeOf(base), descriptors);
}
/* HELPERS */
const getKeys = Object.keys;

export const isEqual = (x: any, y: any): boolean => {
  if (x === y) return true;

  if (
    typeof x === "object" &&
    typeof y === "object" &&
    x !== null &&
    y !== null
  ) {
    if (isArray(x)) {
      if (isArray(y)) {
        let xLength = x.length;
        let yLength = y.length;

        if (xLength !== yLength) return false;

        while (xLength--) {
          if (!isEqual(x[xLength], y[xLength])) return false;
        }

        return true;
      }

      return false;
    } else if (isArray(y)) {
      return false;
    } else {
      let xKeys = getKeys(x);
      let xLength = xKeys.length;
      let yKeys = getKeys(y);
      let yLength = yKeys.length;

      if (xLength !== yLength) return false;

      while (xLength--) {
        const key = xKeys[xLength];
        const xValue = x[key];
        const yValue = y[key];

        if (!isEqual(xValue, yValue)) return false;

        if (yValue === undefined && !Reflect.has(y, key)) return false;
      }
    }

    return true;
  }

  return x !== x && y !== y;
};

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}
export function cloneDeep(obj?: any) {
  return obj && JSON.parse(JSON.stringify(obj));
}

export function applyPatchesToObject(target: any, patches: IDataPatch[]) {
  patches.forEach((p: IDataPatch) => {
    switch (p.op) {
      case "add":
        set(target, p.path, p.value);
        break;
      case "remove":
        deleteKey(target, p);
        break;
      case "replace":
        set(target, p.path, p.value);
        break;
    }
  });
}

export function isPrimtive(v: any) {
  if (v === null) {
    return true;
  }
  const type = typeof v;
  return [
    "undefined",
    "number",
    "symbol",
    "string",
    "bigint",
    "boolean",
  ].includes(type);
}

export function deleteKey(obj: any, p: IDataPatch) {
  const { path, value } = p;
  let tail = path.length > 0 ? get(obj, path.slice(0, -1)) : obj;
  const key = last(path);
  if (tail instanceof Set) {
    tail.delete(value);
  }
  if (tail instanceof Map) {
    tail.delete(key);
  } else {
    delete tail[key];
  }
}

export function set(obj: any, path: string | (number | string)[], value: any) {
  let base = obj;
  const currentFieldPath = isArray(path)
    ? path.slice(0)
    : path.split
    ? path.split(".")
    : [path];
  if (currentFieldPath.length > 0) {
    const fieldName = currentFieldPath[currentFieldPath.length - 1];
    currentFieldPath.forEach((p, i) => {
      if (i >= currentFieldPath.length - 1) return;
      if (base[p] === undefined) {
        const nextP = currentFieldPath[i + 1];
        base[p] = nextP !== undefined && typeof nextP === "number" ? [] : {};
      }
      base = base[p];
    });
    if (base instanceof Map) {
      base.set(fieldName, value);
    } else if (base instanceof Set) {
      base.add(value);
    } else {
      base[fieldName!] = value;
    }
  }
}

export function get(obj: any, path?: string | (number | string)[]) {
  if (!path) {
    return obj;
  }
  let base = obj;
  const pathArr = isArray(path)
    ? path.slice(0)
    : path.split
    ? path.split(".")
    : [path];
  if (pathArr.length === 0) {
    return obj;
  }
  const currentPathArr = pathArr.slice(0, -1);
  const key = last(pathArr);
  for (const p of currentPathArr) {
    if (base[p] === undefined) return undefined;
    base = base[p];
  }
  if (base instanceof Map) {
    return base.get(key);
  }
  return base[key];
}

export function map(
  target: object | any[],
  callback: (v: any, i: number, self: any[]) => any,
) {
  if (!target || typeof target !== "object") {
    throw new Error("can not map");
  }
  if (isArray(target)) {
    return target.map(callback);
  }
  return Object.values(target).map(callback);
}

export function likeObject(target: any): target is Object {
  return target && typeof target === "object";
}

export function isDef(v?: any): v is any {
  return typeof v !== "undefined";
}
export function isUndef(v?: any): v is undefined {
  return typeof v === "undefined";
}

export function isFunc(f?: Function | any): f is (...args: any[]) => any {
  return typeof f === "function";
}

export function isAsyncFunc<T>(f?: any): f is () => Promise<T> {
  return f && f[Symbol.toStringTag] === "AsyncFunction";
}
export function isPromise<T>(p?: any): p is Promise<T> {
  return p && (p instanceof Promise || !!p.then);
}

export function isGenerator(g: any): g is Generator {
  return g && "function" == typeof g.next && "function" == typeof g.throw;
}

export function nextTick(fn: () => void) {
  // const p = Promise.resolve()
  // let run = true
  // p.then(() => {
  //   if (run) {
  //     fn()
  //   }
  // })
  let st = setTimeout(fn, 0);
  return () => clearTimeout(st);
}

export type TContextData = string;

export interface IStatePatchRecord {
  timing: number;
  patch: IDataPatch[];
}

export interface IHookContext {
  // snapshot
  initialArgList: any;
  data: Array<
    | [string, TContextData, Promise<any>, number]
    | [string, TContextData, null]
    | [string, TContextData]
    | [string, TContextData, any, number]
  >;
  name: string;
  // action
  index?: number;
  indexName?: string;
  args?: any[];
}

export type THookDepUnit = [
  "h" | "ic",
  number,
  (number | ["c", number, string])[], // get
  (number | ["c", number, string])[]?, // set
];

export type THookDeps = Array<THookDepUnit>;

export function findWithDefault<T>(
  arr: T[],
  fn: (a: T) => boolean,
  defaults?: T,
): T | void {
  let e = arr.find(fn);
  if (!e && defaults) {
    e = defaults;
    arr.push(e);
  }
  return e;
}

export const isDataPatch = (p: IDataPatch) => Reflect.has(p, "path");

// for data
export interface IDataPatch {
  op: "replace" | "add" | "remove";
  path: (string | number)[];
  value?: any;
}

export type TPath = (string | number)[];
/**
 * 修改了对象或数组的patch，计算
 * 如果修改了数组的子元素，就上升到整个数组，因为数组的变化通过patch来反推太不准确了
 * patch本身已经是按计算并合并过的，这里不需要考虑合并问题
 * a.0.b.0.c --> a 变化
 * a.b.c --> a.b.c 变化，需要通知到a.b吗？因为如果不是进一步的依赖，那说明b就是primitive的
 */
export function calculateChangedPath(source: any, ps: IDataPatch[]): TPath[] {
  if (isArray(source)) {
    return [[""]]; // root
  }
  const result: TPath[] = [];
  ps.forEach((p) => {
    const i = p.path.findIndex((v, i) => {
      return (
        typeof v === "number" && isArray(get(source, p.path.slice(0, i + 1)))
      );
    });
    if (i > -1) {
      result.push(p.path.slice(0, i));
    } else {
      result.push(p.path.slice());
    }
  });
  return result;
}

// execute in server side
// export function getDiffExecution() {
//   return getModelConfig().executeDiff
// }
// // execute in client side
// export function getPostDiffToServer() {
//   return getModelConfig().postDiffToServer
// }

let currentEnv: null | string = null;
export function setEnv(env: "server" | "client") {
  currentEnv = env;
}

export function getEnv() {
  return {
    client: currentEnv === "client",
    server: currentEnv === "server",
  };
}

export let enableLog: boolean = false;
export function log(pre: string, ...rest: any[]) {
  if (enableLog) {
    console.log(`[${process.env.TARGET || ""}] [${pre}]`, ...rest);
  }
}
export function debuggerLog(open: boolean) {
  enableLog = open;
}

export function getDeps(f: Driver) {
  return f.__deps__;
}
export function getName(f: Driver) {
  return f.__name__ || f.name;
}
export function getNamespace(f: Driver) {
  return f.__namespace__;
}
export function getNames(f: Driver) {
  return f.__names__;
}

export type THookNames = [number, string][];

export interface Driver extends Function {
  (...prop: any): any;
  __deps__?: THookDeps;
  __names__?: THookNames; // hook name by index
  __name__?: string;
  __namespace__?: string;
}
export type BM = Driver;

export function runGenerator(
  gen: Generator,
  onResume: () => void,
  onSuspend: () => void,
) {
  return co(gen, {
    onResume: onResume,
    onSuspend: onSuspend,
  });
}

export function makeBatchCallback<T extends (...prop: any[]) => any>(fn: T) {
  let cancelNotify = () => {};
  return (...args: Parameters<T>) => {
    cancelNotify();
    cancelNotify = nextTick(() => {
      fn(...args);
    });
  };
}
export function shortValue(v: undefined | Symbol | any) {
  if (v === undefined) {
    return "@undef";
  }
  if (typeof v === "symbol") {
    return "@init";
  }
}
/**
 * because of Function in the Record is not serializable, so we need to merge it to initialArgs
 */
export function mergeInitialArgs(
  contextInitialArgs: any | undefined,
  args: any,
): any {
  if (!Array.isArray(contextInitialArgs)) {
    return args;
  }
  if (!Array.isArray(args)) {
    return contextInitialArgs;
  }
  const len = Math.max(contextInitialArgs.length, args.length);
  const result = [];

  for (let i = 0; i < len; i++) {
    let contextInitialArg = contextInitialArgs[i];
    const arg = args[i];

    if (typeof contextInitialArg === "object" && typeof arg === "object") {
      Object.entries(arg).forEach(([k, v]) => {
        if (typeof v === "function" && contextInitialArg[k] === undefined) {
          contextInitialArg = {
            ...contextInitialArg,
            [k]: v,
          };
        }
      });
    }
    result.push(contextInitialArg);
  }

  return result;
}
