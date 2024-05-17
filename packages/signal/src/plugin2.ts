import type { CurrentRunnerScope } from "./signal";

export type TCacheFrom = "cookie" | "regularKV"; // | 'redis' | 'localStorage' | 'sessionStorage'

export interface IRunningContext {
  cookies: {
    set: (name: string, value?: string | null, opts?: any) => void;
    get: (name: string, opts?: any) => string | undefined;
  };
}

/**
 * provide a default CachePlugin for distribution different cahce type
 */
const defaultCachePlugin: (plugin: Plugin) => IPlugins["Cache"] = (
  plugin: Plugin,
) => ({
  async getValue(scope, k, from) {
    return plugin.getPlugin(from).get(scope, k);
  },
  setValue(scope, k, v, from) {
    return plugin.getPlugin(from).set(scope, k, v);
  },
  clearValue(scope, k, from) {
    plugin.getPlugin(from).clear(scope, k);
  },
});

export class Plugin {
  plugins: IPlugins = {};

  constructor() {
    const cachePlugin = defaultCachePlugin(this);
    this.loadPlugin("Cache", cachePlugin);
  }

  clearPlugins() {
    const { plugins } = this;
    Object.keys(plugins).forEach((k) => {
      delete plugins[k];
    });
  }

  getPlugin<T extends TPluginKey>(k: T) {
    const { plugins } = this;
    const plugin = plugins[k];
    if (!plugin) {
      throw new Error(`[getPlugin] name=${k} is not found`);
    }
    return plugin as Exclude<IPlugins[T], undefined>;
  }

  loadPlugin<T extends TPluginKey>(k: T, p: IPlugins[T]) {
    const { plugins } = this;
    plugins[k] = p;
  }
}

export interface IPlugins {
  Cache?: {
    getValue<T>(
      scope: CurrentRunnerScope,
      k: string,
      from: TCacheFrom,
    ): Promise<T | undefined>;
    setValue<T>(
      scope: CurrentRunnerScope,
      k: string,
      value: T,
      from: TCacheFrom,
    ): Promise<void>;
    clearValue(scope: CurrentRunnerScope, k: string, from: TCacheFrom): void;
  };
  GlobalRunning?: {
    setCurrent(
      scope: CurrentRunnerScope,
      runningApi: IRunningContext | null,
    ): void;
    getCurrent(scope: CurrentRunnerScope): IRunningContext | null;
  };
  cookie?: {
    get<T>(scope: CurrentRunnerScope, k: string): Promise<T | undefined>;
    set<T>(scope: CurrentRunnerScope, k: string, value: T): Promise<void>;
    clear(scope: CurrentRunnerScope, k: string): void;
  };
  regularKV?: {
    get<T>(scope: CurrentRunnerScope, k: string): Promise<T | undefined>;
    set<T>(scope: CurrentRunnerScope, k: string, value: T): Promise<void>;
    clear(scope: CurrentRunnerScope, k: string): void;
  };
}

type TPluginKey = keyof IPlugins;
